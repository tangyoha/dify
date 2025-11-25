import uuid

from flask import request
from flask_restful import Resource
from werkzeug.exceptions import NotFound, Unauthorized

from controllers.web import api
from controllers.web.error import WebAppAuthRequiredError
from extensions.ext_database import db
from libs.passport import PassportService
from models.model import App, EndUser, Site
from services.enterprise.enterprise_service import EnterpriseService
from services.feature_service import FeatureService


class PassportResource(Resource):
    """Base resource for passport."""

    def get(self):
        system_features = FeatureService.get_system_features()
        app_code = request.headers.get("X-App-Code")
        user_id = request.args.get("user_id")
        # 支持前端传递的sys.user_id参数（Base64编码）
        sys_user_id = request.args.get("sys.user_id")

        # 如果有sys.user_id，尝试解码并使用
        if sys_user_id and not user_id:
            try:
                import base64
                import urllib.parse
                # 首先尝试Base64解码
                user_id = base64.b64decode(sys_user_id).decode('utf-8')
            except Exception:
                try:
                    # 如果Base64解码失败，尝试URL解码
                    user_id = urllib.parse.unquote(sys_user_id)
                except Exception:
                    # 如果都失败，直接使用原始值
                    user_id = sys_user_id

        if app_code is None:
            raise Unauthorized("X-App-Code header is missing.")

        if system_features.webapp_auth.enabled:
            app_settings = EnterpriseService.WebAppAuth.get_app_access_mode_by_code(app_code=app_code)
            if not app_settings or not app_settings.access_mode == "public":
                raise WebAppAuthRequiredError()

        # get site from db and check if it is normal
        site = db.session.query(Site).filter(Site.code == app_code, Site.status == "normal").first()
        if not site:
            raise NotFound()
        # get app from db and check if it is normal and enable_site
        app_model = db.session.query(App).filter(App.id == site.app_id).first()
        if not app_model or app_model.status != "normal" or not app_model.enable_site:
            raise NotFound()

        if user_id:
            # 首先尝试通过external_user_id查找用户
            end_user = (
                db.session.query(EndUser)
                .filter(
                    EndUser.app_id == app_model.id,
                    EndUser.external_user_id == user_id
                )
                .first()
            )

            # 如果没找到，尝试通过session_id查找（向后兼容）
            if not end_user:
                end_user = (
                    db.session.query(EndUser)
                    .filter(
                        EndUser.app_id == app_model.id,
                        EndUser.session_id == user_id
                    )
                    .first()
                )

            if end_user:
                # 如果用户存在但external_user_id为空，更新它
                if not end_user.external_user_id:
                    end_user.external_user_id = user_id
                    end_user.name = user_id  # 将用户ID作为默认名称
                    end_user.is_anonymous = False
                    db.session.commit()
            else:
                # 创建新用户，使用external_user_id
                end_user = EndUser(
                    tenant_id=app_model.tenant_id,
                    app_id=app_model.id,
                    type="browser",
                    external_user_id=user_id,
                    name=user_id,  # 将用户ID作为默认名称
                    is_anonymous=False,
                    session_id=generate_session_id(),
                )
                db.session.add(end_user)
                db.session.commit()
        else:
            end_user = EndUser(
                tenant_id=app_model.tenant_id,
                app_id=app_model.id,
                type="browser",
                is_anonymous=True,
                session_id=generate_session_id(),
            )
            db.session.add(end_user)
            db.session.commit()

        payload = {
            "iss": site.app_id,
            "sub": "Web API Passport",
            "app_id": site.app_id,
            "app_code": app_code,
            "end_user_id": end_user.id,
        }

        tk = PassportService().issue(payload)

        return {
            "access_token": tk,
        }


api.add_resource(PassportResource, "/passport")


def generate_session_id():
    """
    Generate a unique session ID.
    """
    while True:
        session_id = str(uuid.uuid4())
        existing_count = db.session.query(EndUser).filter(EndUser.session_id == session_id).count()
        if existing_count == 0:
            return session_id
