from typing import Literal
from datetime import datetime

import pytz

import sqlalchemy as sa
from flask import abort, jsonify, request
from flask_restx import Resource, fields, marshal_with, reqparse
from flask_restx.inputs import int_range
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import joinedload
from werkzeug.exceptions import NotFound

from controllers.console import console_ns
from controllers.console.app.wraps import get_app_model
from controllers.console.wraps import account_initialization_required, edit_permission_required, setup_required
from core.app.entities.app_invoke_entities import InvokeFrom
from extensions.ext_database import db
from fields.raws import FilesContainedField
from fields.conversation_fields import MessageTextField
from libs.datetime_utils import naive_utc_now, parse_time_range
from libs.helper import DatetimeString, TimestampField
from libs.login import current_account_with_tenant, login_required
from models import Conversation, EndUser, Message, MessageAnnotation, MessageFeedback

from models.model import AppMode
from services.conversation_service import ConversationService
from services.errors.conversation import ConversationNotExistsError
from services.message_service import MessageService

DEFAULT_REF_TEMPLATE_SWAGGER_2_0 = "#/definitions/{model}"


class BaseConversationQuery(BaseModel):
    keyword: str | None = Field(default=None, description="Search keyword")
    start: str | None = Field(default=None, description="Start date (YYYY-MM-DD HH:MM)")
    end: str | None = Field(default=None, description="End date (YYYY-MM-DD HH:MM)")
    annotation_status: Literal["annotated", "not_annotated", "all"] = Field(
        default="all", description="Annotation status filter"
    )
    user_feedback_status: Literal["liked", "disliked", "no_feedback", "all"] = Field(
        default="all", description="User feedback status filter"
    )
    page: int = Field(default=1, ge=1, le=99999, description="Page number")
    limit: int = Field(default=20, ge=1, le=100, description="Page size (1-100)")

    @field_validator("start", "end", mode="before")
    @classmethod
    def blank_to_none(cls, value: str | None) -> str | None:
        if value == "":
            return None
        return value


class CompletionConversationQuery(BaseConversationQuery):
    pass


class ChatConversationQuery(BaseConversationQuery):
    sort_by: Literal["created_at", "-created_at", "updated_at", "-updated_at"] = Field(
        default="-updated_at", description="Sort field and direction"
    )
    message_count_gte: int | None = Field(default=None, ge=1, le=99999, description="Min message count")
    user_id: str | None = Field(default=None, description="Filter by end user id")


console_ns.schema_model(
    CompletionConversationQuery.__name__,
    CompletionConversationQuery.model_json_schema(ref_template=DEFAULT_REF_TEMPLATE_SWAGGER_2_0),
)
console_ns.schema_model(
    ChatConversationQuery.__name__,
    ChatConversationQuery.model_json_schema(ref_template=DEFAULT_REF_TEMPLATE_SWAGGER_2_0),
)
# Register models for flask_restx to avoid dict type issues in Swagger
# Register in dependency order: base models first, then dependent models

# Base models
simple_account_model = console_ns.model(
    "SimpleAccount",
    {
        "id": fields.String,
        "name": fields.String,
        "email": fields.String,
    },
)

feedback_stat_model = console_ns.model(
    "FeedbackStat",
    {
        "like": fields.Integer,
        "dislike": fields.Integer,
    },
)

status_count_model = console_ns.model(
    "StatusCount",
    {
        "success": fields.Integer,
        "failed": fields.Integer,
        "partial_success": fields.Integer,
    },
)

message_file_model = console_ns.model(
    "MessageFile",
    {
        "id": fields.String,
        "filename": fields.String,
        "type": fields.String,
        "url": fields.String,
        "mime_type": fields.String,
        "size": fields.Integer,
        "transfer_method": fields.String,
        "belongs_to": fields.String(default="user"),
        "upload_file_id": fields.String(default=None),
    },
)

agent_thought_model = console_ns.model(
    "AgentThought",
    {
        "id": fields.String,
        "chain_id": fields.String,
        "message_id": fields.String,
        "position": fields.Integer,
        "thought": fields.String,
        "tool": fields.String,
        "tool_labels": fields.Raw,
        "tool_input": fields.String,
        "created_at": TimestampField,
        "observation": fields.String,
        "files": fields.List(fields.String),
    },
)

simple_model_config_model = console_ns.model(
    "SimpleModelConfig",
    {
        "model": fields.Raw(attribute="model_dict"),
        "pre_prompt": fields.String,
    },
)

model_config_model = console_ns.model(
    "ModelConfig",
    {
        "opening_statement": fields.String,
        "suggested_questions": fields.Raw,
        "model": fields.Raw,
        "user_input_form": fields.Raw,
        "pre_prompt": fields.String,
        "agent_mode": fields.Raw,
    },
)

# Models that depend on simple_account_model
feedback_model = console_ns.model(
    "Feedback",
    {
        "rating": fields.String,
        "content": fields.String,
        "from_source": fields.String,
        "from_end_user_id": fields.String,
        "from_account": fields.Nested(simple_account_model, allow_null=True),
    },
)

annotation_model = console_ns.model(
    "Annotation",
    {
        "id": fields.String,
        "question": fields.String,
        "content": fields.String,
        "account": fields.Nested(simple_account_model, allow_null=True),
        "created_at": TimestampField,
    },
)

annotation_hit_history_model = console_ns.model(
    "AnnotationHitHistory",
    {
        "annotation_id": fields.String(attribute="id"),
        "annotation_create_account": fields.Nested(simple_account_model, allow_null=True),
        "created_at": TimestampField,
    },
)

# Simple message detail model
simple_message_detail_model = console_ns.model(
    "SimpleMessageDetail",
    {
        "inputs": FilesContainedField,
        "query": fields.String,
        "message": MessageTextField,
        "answer": fields.String,
    },
)

# Message detail model that depends on multiple models
message_detail_model = console_ns.model(
    "MessageDetail",
    {
        "id": fields.String,
        "conversation_id": fields.String,
        "inputs": FilesContainedField,
        "query": fields.String,
        "message": fields.Raw,
        "message_tokens": fields.Integer,
        "answer": fields.String(attribute="re_sign_file_url_answer"),
        "answer_tokens": fields.Integer,
        "provider_response_latency": fields.Float,
        "from_source": fields.String,
        "from_end_user_id": fields.String,
        "from_account_id": fields.String,
        "feedbacks": fields.List(fields.Nested(feedback_model)),
        "workflow_run_id": fields.String,
        "annotation": fields.Nested(annotation_model, allow_null=True),
        "annotation_hit_history": fields.Nested(annotation_hit_history_model, allow_null=True),
        "created_at": TimestampField,
        "agent_thoughts": fields.List(fields.Nested(agent_thought_model)),
        "message_files": fields.List(fields.Nested(message_file_model)),
        "metadata": fields.Raw(attribute="message_metadata_dict"),
        "status": fields.String,
        "error": fields.String,
        "parent_message_id": fields.String,
    },
)

# Conversation models
conversation_fields_model = console_ns.model(
    "Conversation",
    {
        "id": fields.String,
        "status": fields.String,
        "from_source": fields.String,
        "from_end_user_id": fields.String,
        "from_end_user_session_id": fields.String(),
        "from_account_id": fields.String,
        "from_account_name": fields.String,
        "read_at": TimestampField,
        "created_at": TimestampField,
        "updated_at": TimestampField,
        "annotation": fields.Nested(annotation_model, allow_null=True),
        "model_config": fields.Nested(simple_model_config_model),
        "user_feedback_stats": fields.Nested(feedback_stat_model),
        "admin_feedback_stats": fields.Nested(feedback_stat_model),
        "message": fields.Nested(simple_message_detail_model, attribute="first_message"),
    },
)

conversation_pagination_model = console_ns.model(
    "ConversationPagination",
    {
        "page": fields.Integer,
        "limit": fields.Integer(attribute="per_page"),
        "total": fields.Integer,
        "has_more": fields.Boolean(attribute="has_next"),
        "data": fields.List(fields.Nested(conversation_fields_model), attribute="items"),
    },
)

conversation_message_detail_model = console_ns.model(
    "ConversationMessageDetail",
    {
        "id": fields.String,
        "status": fields.String,
        "from_source": fields.String,
        "from_end_user_id": fields.String,
        "from_account_id": fields.String,
        "created_at": TimestampField,
        "model_config": fields.Nested(model_config_model),
        "message": fields.Nested(message_detail_model, attribute="first_message"),
    },
)

conversation_with_summary_model = console_ns.model(
    "ConversationWithSummary",
    {
        "id": fields.String,
        "status": fields.String,
        "from_source": fields.String,
        "from_end_user_id": fields.String,
        "from_end_user_session_id": fields.String,
        "from_account_id": fields.String,
        "from_account_name": fields.String,
        "name": fields.String,
        "summary": fields.String(attribute="summary_or_query"),
        "read_at": TimestampField,
        "created_at": TimestampField,
        "updated_at": TimestampField,
        "annotated": fields.Boolean,
        "model_config": fields.Nested(simple_model_config_model),
        "message_count": fields.Integer,
        "user_feedback_stats": fields.Nested(feedback_stat_model),
        "admin_feedback_stats": fields.Nested(feedback_stat_model),
        "status_count": fields.Nested(status_count_model),
    },
)

conversation_with_summary_pagination_model = console_ns.model(
    "ConversationWithSummaryPagination",
    {
        "page": fields.Integer,
        "limit": fields.Integer(attribute="per_page"),
        "total": fields.Integer,
        "has_more": fields.Boolean(attribute="has_next"),
        "data": fields.List(fields.Nested(conversation_with_summary_model), attribute="items"),
    },
)

conversation_detail_model = console_ns.model(
    "ConversationDetail",
    {
        "id": fields.String,
        "status": fields.String,
        "from_source": fields.String,
        "from_end_user_id": fields.String,
        "from_account_id": fields.String,
        "created_at": TimestampField,
        "updated_at": TimestampField,
        "annotated": fields.Boolean,
        "introduction": fields.String,
        "model_config": fields.Nested(model_config_model),
        "message_count": fields.Integer,
        "user_feedback_stats": fields.Nested(feedback_stat_model),
        "admin_feedback_stats": fields.Nested(feedback_stat_model),
    },
)

@console_ns.route("/apps/<uuid:app_id>/completion-conversations")
class CompletionConversationApi(Resource):
    @console_ns.doc("list_completion_conversations")
    @console_ns.doc(description="Get completion conversations with pagination and filtering")
    @console_ns.doc(params={"app_id": "Application ID"})
    @console_ns.expect(console_ns.models[CompletionConversationQuery.__name__])
    @console_ns.response(200, "Success", conversation_pagination_model)
    @console_ns.response(403, "Insufficient permissions")
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model(mode=AppMode.COMPLETION)
    @marshal_with(conversation_pagination_model)
    @edit_permission_required
    def get(self, app_model):
        current_user, _ = current_account_with_tenant()
        args = CompletionConversationQuery.model_validate(request.args.to_dict(flat=True))  # type: ignore[arg-type]

        query = sa.select(Conversation).where(
            Conversation.app_id == app_model.id, Conversation.mode == "completion", Conversation.is_deleted.is_(False)
        )

        if args.keyword:
            query = query.join(Message, Message.conversation_id == Conversation.id).where(
                or_(
                    Message.query.ilike(f"%{args.keyword}%"),
                    Message.answer.ilike(f"%{args.keyword}%"),
                )
            )

        account = current_user
        assert account.timezone is not None

        try:
            start_datetime_utc, end_datetime_utc = parse_time_range(args.start, args.end, account.timezone)
        except ValueError as e:
            abort(400, description=str(e))

        if start_datetime_utc:
            query = query.where(Conversation.created_at >= start_datetime_utc)

        if end_datetime_utc:
            end_datetime_utc = end_datetime_utc.replace(second=59)
            query = query.where(Conversation.created_at < end_datetime_utc)

        # FIXME, the type ignore in this file
        if args.annotation_status == "annotated":
            query = query.options(joinedload(Conversation.message_annotations)).join(  # type: ignore
                MessageAnnotation, MessageAnnotation.conversation_id == Conversation.id
            )
        elif args.annotation_status == "not_annotated":
            query = (
                query.outerjoin(MessageAnnotation, MessageAnnotation.conversation_id == Conversation.id)
                .group_by(Conversation.id)
                .having(func.count(MessageAnnotation.id) == 0)
            )

        # Filter by user feedback status
        if args.user_feedback_status == "liked":
            query = query.join(
                MessageFeedback,
                and_(
                    MessageFeedback.conversation_id == Conversation.id,
                    MessageFeedback.from_source == "user",
                    MessageFeedback.rating == "like"
                )
            )
        elif args.user_feedback_status == "disliked":
            query = query.join(
                MessageFeedback,
                and_(
                    MessageFeedback.conversation_id == Conversation.id,
                    MessageFeedback.from_source == "user",
                    MessageFeedback.rating == "dislike"
                )
            )
        elif args.user_feedback_status == "no_feedback":
            query = (
                query.outerjoin(
                    MessageFeedback,
                    and_(
                        MessageFeedback.conversation_id == Conversation.id,
                        MessageFeedback.from_source == "user"
                    )
                )
                .group_by(Conversation.id)
                .having(func.count(MessageFeedback.id) == 0)
            )

        query = query.order_by(Conversation.created_at.desc())

        conversations = db.paginate(query, page=args.page, per_page=args.limit, error_out=False)

        return conversations


@console_ns.route("/apps/<uuid:app_id>/completion-conversations/<uuid:conversation_id>")
class CompletionConversationDetailApi(Resource):
    @console_ns.doc("get_completion_conversation")
    @console_ns.doc(description="Get completion conversation details with messages")
    @console_ns.doc(params={"app_id": "Application ID", "conversation_id": "Conversation ID"})
    @console_ns.response(200, "Success", conversation_message_detail_model)
    @console_ns.response(403, "Insufficient permissions")
    @console_ns.response(404, "Conversation not found")
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model(mode=AppMode.COMPLETION)
    @marshal_with(conversation_message_detail_model)
    @edit_permission_required
    def get(self, app_model, conversation_id):
        conversation_id = str(conversation_id)

        return _get_conversation(app_model, conversation_id)

    @console_ns.doc("delete_completion_conversation")
    @console_ns.doc(description="Delete a completion conversation")
    @console_ns.doc(params={"app_id": "Application ID", "conversation_id": "Conversation ID"})
    @console_ns.response(204, "Conversation deleted successfully")
    @console_ns.response(403, "Insufficient permissions")
    @console_ns.response(404, "Conversation not found")
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model(mode=AppMode.COMPLETION)
    @edit_permission_required
    def delete(self, app_model, conversation_id):
        current_user, _ = current_account_with_tenant()
        conversation_id = str(conversation_id)

        try:
            ConversationService.delete(app_model, conversation_id, current_user)
        except ConversationNotExistsError:
            raise NotFound("Conversation Not Exists.")

        return {"result": "success"}, 204


@console_ns.route("/apps/<uuid:app_id>/chat-conversations")
class ChatConversationApi(Resource):
    @console_ns.doc("list_chat_conversations")
    @console_ns.doc(description="Get chat conversations with pagination, filtering and summary")
    @console_ns.doc(params={"app_id": "Application ID"})
    @console_ns.expect(console_ns.models[ChatConversationQuery.__name__])
    @console_ns.response(200, "Success", conversation_with_summary_pagination_model)
    @console_ns.response(403, "Insufficient permissions")
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model(mode=[AppMode.CHAT, AppMode.AGENT_CHAT, AppMode.ADVANCED_CHAT])
    @marshal_with(conversation_with_summary_pagination_model)
    @edit_permission_required
    def get(self, app_model):
        current_user, _ = current_account_with_tenant()
        args = ChatConversationQuery.model_validate(request.args.to_dict(flat=True))  # type: ignore[arg-type]

        subquery = (
            db.session.query(
                Conversation.id.label("conversation_id"),
                EndUser.session_id.label("from_end_user_session_id"),
                EndUser.id.label("from_end_user_id"),
                EndUser.name.label("from_end_user_name"),
                EndUser.external_user_id.label("from_end_user_external_id"),
                EndUser._is_anonymous.label("from_end_user_is_anonymous")
            )
            .outerjoin(EndUser, Conversation.from_end_user_id == EndUser.id)
            .subquery() 
        )

        query = (
            db.select(
                Conversation,
                subquery.c.from_end_user_session_id,
                subquery.c.from_end_user_name,
                subquery.c.from_end_user_external_id,
                subquery.c.from_end_user_is_anonymous
            )
            .outerjoin(subquery, subquery.c.conversation_id == Conversation.id)
            .where(Conversation.app_id == app_model.id, Conversation.is_deleted.is_(False))
        )

        if args.keyword:
            keyword_filter = f"%{args.keyword}%"
            query = (
                query.join(
                    Message,
                    Message.conversation_id == Conversation.id,
                )
                .where(
                    or_(
                        Message.query.ilike(keyword_filter),
                        Message.answer.ilike(keyword_filter),
                        Conversation.name.ilike(keyword_filter),
                        Conversation.introduction.ilike(keyword_filter),
                        subquery.c.from_end_user_session_id.ilike(keyword_filter),
                        subquery.c.from_end_user_external_id.ilike(keyword_filter),
                    ),
                )
                .group_by(Conversation.id, subquery.c.from_end_user_session_id, subquery.c.from_end_user_name, subquery.c.from_end_user_external_id, subquery.c.from_end_user_is_anonymous)
            )

        account = current_user
        assert account.timezone is not None

        try:
            start_datetime_utc, end_datetime_utc = parse_time_range(args.start, args.end, account.timezone)
        except ValueError as e:
            abort(400, description=str(e))

        if start_datetime_utc:
            match args.sort_by:
                case "updated_at" | "-updated_at":
                    query = query.where(Conversation.updated_at >= start_datetime_utc)
                case "created_at" | "-created_at" | _:
                    query = query.where(Conversation.created_at >= start_datetime_utc)

        if end_datetime_utc:
            end_datetime_utc = end_datetime_utc.replace(second=59)
            match args.sort_by:
                case "updated_at" | "-updated_at":
                    query = query.where(Conversation.updated_at <= end_datetime_utc)
                case "created_at" | "-created_at" | _:
                    query = query.where(Conversation.created_at <= end_datetime_utc)

        if args.annotation_status == "annotated":
            query = query.options(joinedload(Conversation.message_annotations)).join(  # type: ignore
                MessageAnnotation, MessageAnnotation.conversation_id == Conversation.id
            )
        elif args.annotation_status == "not_annotated":
            query = (
                query.outerjoin(MessageAnnotation, MessageAnnotation.conversation_id == Conversation.id)
                .group_by(
                    Conversation.id,
                    subquery.c.from_end_user_session_id,
                    subquery.c.from_end_user_name,
                    subquery.c.from_end_user_external_id,
                    subquery.c.from_end_user_is_anonymous
                )
                .having(func.count(MessageAnnotation.id) == 0)
            )

        # Filter by user feedback status
        if args.user_feedback_status == "liked":
            query = query.join(
                MessageFeedback,
                and_(
                    MessageFeedback.conversation_id == Conversation.id,
                    MessageFeedback.from_source == "user",
                    MessageFeedback.rating == "like"
                )
            )
        elif args.user_feedback_status == "disliked":
            query = query.join(
                MessageFeedback,
                and_(
                    MessageFeedback.conversation_id == Conversation.id,
                    MessageFeedback.from_source == "user",
                    MessageFeedback.rating == "dislike"
                )
            )
        elif args.user_feedback_status == "no_feedback":
            query = (
                query.outerjoin(
                    MessageFeedback,
                    and_(
                        MessageFeedback.conversation_id == Conversation.id,
                        MessageFeedback.from_source == "user"
                    )
                )
                .group_by(
                    Conversation.id,
                    subquery.c.from_end_user_session_id,
                    subquery.c.from_end_user_name,
                    subquery.c.from_end_user_external_id,
                    subquery.c.from_end_user_is_anonymous
                )
                .having(func.count(MessageFeedback.id) == 0)
            )

        if args.message_count_gte and args.message_count_gte >= 1:
            query = (
                query.options(joinedload(Conversation.messages))  # type: ignore
                .join(Message, Message.conversation_id == Conversation.id)
                .group_by(
                    Conversation.id,
                    subquery.c.from_end_user_session_id,
                    subquery.c.from_end_user_name,
                    subquery.c.from_end_user_external_id,
                    subquery.c.from_end_user_is_anonymous
                )
                .having(func.count(Message.id) >= args.message_count_gte)
            )

        # 添加用户筛选
        if args.user_id:
            query = query.where(Conversation.from_end_user_id == args.user_id)
        if app_model.mode == AppMode.ADVANCED_CHAT:
            query = query.where(Conversation.invoke_from != InvokeFrom.DEBUGGER)

        match args.sort_by:
            case "created_at":
                query = query.order_by(Conversation.created_at.asc())
            case "-created_at":
                query = query.order_by(Conversation.created_at.desc())
            case "updated_at":
                query = query.order_by(Conversation.updated_at.asc())
            case "-updated_at":
                query = query.order_by(Conversation.updated_at.desc())
            case _:
                query = query.order_by(Conversation.created_at.desc())

        conversations = db.paginate(query, page=args.page, per_page=args.limit, error_out=False)

        # 处理查询结果，将额外的用户字段添加到Conversation对象上

        return conversations


@console_ns.route("/apps/<uuid:app_id>/chat-conversations/<uuid:conversation_id>")
class ChatConversationDetailApi(Resource):
    @console_ns.doc("get_chat_conversation")
    @console_ns.doc(description="Get chat conversation details")
    @console_ns.doc(params={"app_id": "Application ID", "conversation_id": "Conversation ID"})
    @console_ns.response(200, "Success", conversation_detail_model)
    @console_ns.response(403, "Insufficient permissions")
    @console_ns.response(404, "Conversation not found")
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model(mode=[AppMode.CHAT, AppMode.AGENT_CHAT, AppMode.ADVANCED_CHAT])
    @marshal_with(conversation_detail_model)
    @edit_permission_required
    def get(self, app_model, conversation_id):
        conversation_id = str(conversation_id)

        return _get_conversation(app_model, conversation_id)

    @console_ns.doc("delete_chat_conversation")
    @console_ns.doc(description="Delete a chat conversation")
    @console_ns.doc(params={"app_id": "Application ID", "conversation_id": "Conversation ID"})
    @console_ns.response(204, "Conversation deleted successfully")
    @console_ns.response(403, "Insufficient permissions")
    @console_ns.response(404, "Conversation not found")
    @setup_required
    @login_required
    @get_app_model(mode=[AppMode.CHAT, AppMode.AGENT_CHAT, AppMode.ADVANCED_CHAT])
    @account_initialization_required
    @edit_permission_required
    def delete(self, app_model, conversation_id):
        current_user, _ = current_account_with_tenant()
        conversation_id = str(conversation_id)

        try:
            ConversationService.delete(app_model, conversation_id, current_user)
        except ConversationNotExistsError:
            raise NotFound("Conversation Not Exists.")

        return {"result": "success"}, 204


def _get_conversation(app_model, conversation_id):
    current_user, _ = current_account_with_tenant()
    conversation = (
        db.session.query(Conversation)
        .where(Conversation.id == conversation_id, Conversation.app_id == app_model.id)
        .first()
    )

    if not conversation:
        raise NotFound("Conversation Not Exists.")

    if not conversation.read_at:
        conversation.read_at = naive_utc_now()
        conversation.read_account_id = current_user.id
        db.session.commit()

    return conversation

@console_ns.route("/apps/<uuid:app_id>/conversations/<uuid:conversation_id>/feedback-summary")
class ConversationFeedbackSummaryApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model(mode=[AppMode.CHAT, AppMode.AGENT_CHAT, AppMode.ADVANCED_CHAT, AppMode.COMPLETION])
    def get(self, app_model, conversation_id):
        current_user, _ = current_account_with_tenant()

        conversation_id = str(conversation_id)

        # Verify conversation exists and belongs to the app
        conversation = (
            db.session.query(Conversation)
            .filter(Conversation.id == conversation_id, Conversation.app_id == app_model.id)
            .first()
        )

        if not conversation:
            raise NotFound("Conversation Not Exists.")

        feedback_summary = MessageService.get_conversation_feedbacks_summary(conversation_id)
        return {"result": "success", "data": feedback_summary}


@console_ns.route("/apps/<uuid:app_id>/statistics/response-time-trend")
class ResponseTimeTrendStatistic(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model
    def get(self, app_model):
        account, _ = current_account_with_tenant()

        parser = (
            reqparse.RequestParser()
            .add_argument("start", type=DatetimeString("%Y-%m-%d %H:%M"), location="args")
            .add_argument("end", type=DatetimeString("%Y-%m-%d %H:%M"), location="args")
        )
        args = parser.parse_args()

        sql_query = """SELECT
    DATE(DATE_TRUNC('day', created_at AT TIME ZONE 'UTC' AT TIME ZONE :tz )) AS date,
    CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE (SUM(provider_response_latency) / COUNT(*))
    END as avg_response_time
FROM
    messages
WHERE
    app_id = :app_id
    AND provider_response_latency IS NOT NULL
    AND provider_response_latency > 0"""
        arg_dict = {"tz": account.timezone, "app_id": app_model.id}

        timezone = pytz.timezone(account.timezone)
        utc_timezone = pytz.utc

        if args["start"]:
            start_datetime = datetime.strptime(args["start"], "%Y-%m-%d %H:%M")
            start_datetime = start_datetime.replace(second=0)

            start_datetime_timezone = timezone.localize(start_datetime)
            start_datetime_utc = start_datetime_timezone.astimezone(utc_timezone)

            sql_query += " AND created_at >= :start"
            arg_dict["start"] = start_datetime_utc

        if args["end"]:
            end_datetime = datetime.strptime(args["end"], "%Y-%m-%d %H:%M")
            end_datetime = end_datetime.replace(second=0)

            end_datetime_timezone = timezone.localize(end_datetime)
            end_datetime_utc = end_datetime_timezone.astimezone(utc_timezone)

            sql_query += " AND created_at < :end"
            arg_dict["end"] = end_datetime_utc

        sql_query += " GROUP BY date ORDER BY date"

        response_data = []

        with db.engine.begin() as conn:
            rs = conn.execute(sa.text(sql_query), arg_dict)
            for i in rs:
                response_data.append({"date": str(i.date), "response_time": round(i.avg_response_time, 2)})

        return jsonify({"data": response_data})


@console_ns.route("/apps/<uuid:app_id>/statistics/daily-feedback")
class DailyFeedbackStatistic(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model
    def get(self, app_model):
        account, _ = current_account_with_tenant()

        parser = (
            reqparse.RequestParser()
            .add_argument("start", type=DatetimeString("%Y-%m-%d %H:%M"), location="args")
            .add_argument("end", type=DatetimeString("%Y-%m-%d %H:%M"), location="args")
        )
        args = parser.parse_args()

        sql_query = """SELECT
    DATE(DATE_TRUNC('day', mf.created_at AT TIME ZONE 'UTC' AT TIME ZONE :tz )) AS date,
    COUNT(CASE WHEN mf.rating = 'like' THEN 1 END) AS like_count,
    COUNT(CASE WHEN mf.rating = 'dislike' THEN 1 END) AS dislike_count
FROM
    message_feedbacks mf
INNER JOIN
    messages m ON mf.message_id = m.id
WHERE
    m.app_id = :app_id
    AND mf.from_source = 'user'"""
        arg_dict = {"tz": account.timezone, "app_id": app_model.id}

        timezone = pytz.timezone(account.timezone)
        utc_timezone = pytz.utc

        if args["start"]:
            start_datetime = datetime.strptime(args["start"], "%Y-%m-%d %H:%M")
            start_datetime = start_datetime.replace(second=0)

            start_datetime_timezone = timezone.localize(start_datetime)
            start_datetime_utc = start_datetime_timezone.astimezone(utc_timezone)

            sql_query += " AND mf.created_at >= :start"
            arg_dict["start"] = start_datetime_utc

        if args["end"]:
            end_datetime = datetime.strptime(args["end"], "%Y-%m-%d %H:%M")
            end_datetime = end_datetime.replace(second=0)

            end_datetime_timezone = timezone.localize(end_datetime)
            end_datetime_utc = end_datetime_timezone.astimezone(utc_timezone)

            sql_query += " AND mf.created_at < :end"
            arg_dict["end"] = end_datetime_utc

        sql_query += " GROUP BY date ORDER BY date"

        response_data = []

        with db.engine.begin() as conn:
            rs = conn.execute(sa.text(sql_query), arg_dict)
            for i in rs:
                response_data.append({
                    "date": str(i.date),
                    "like_count": int(i.like_count or 0),
                    "dislike_count": int(i.dislike_count or 0)
                })

        return jsonify({"data": response_data})
