from datetime import datetime, timedelta
from flask_restx import Resource, fields, reqparse
from sqlalchemy import func, desc, and_, or_ as sa_or
import sqlalchemy as sa

from controllers.console import api
from controllers.console.app.wraps import get_app_model
from controllers.console.wraps import setup_required, account_initialization_required
from libs.login import login_required
from extensions.ext_database import db
from models.model import App, Conversation, Message, EndUser


class SimpleUserAnalyticsApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model
    def get(self, app_model: App):
        """获取简化的用户分析数据"""
        parser = reqparse.RequestParser()
        parser.add_argument('range', type=str, default='7d', location='args')
        parser.add_argument('user_id', type=str, location='args')
        parser.add_argument('start_date', type=str, location='args')
        parser.add_argument('end_date', type=str, location='args')
        args = parser.parse_args()

        # 计算时间范围
        time_range = args['range']
        user_id = args.get('user_id')
        start_date_str = args.get('start_date')
        end_date_str = args.get('end_date')
        # 处理自定义时间范围
        if start_date_str and end_date_str:
            try:
                # 尝试解析完整的日期时间格式 'YYYY-MM-DD HH:mm'
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d %H:%M')
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d %H:%M')
            except ValueError:
                try:
                    # 如果失败，尝试只解析日期部分 'YYYY-MM-DD'
                    start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                    end_date = datetime.strptime(end_date_str, '%Y-%m-%d') + timedelta(days=1)
                except ValueError:
                    # 如果都失败，回退到默认范围
                    start_date = datetime.now() - timedelta(days=7)
                    end_date = datetime.now()
        else:
            # 使用预设时间范围
            if time_range == '1d':
                start_date = datetime.now() - timedelta(days=1)
            elif time_range == '7d':
                start_date = datetime.now() - timedelta(days=7)
            elif time_range == '30d':
                start_date = datetime.now() - timedelta(days=30)
            elif time_range == '90d':
                start_date = datetime.now() - timedelta(days=90)
            else:
                start_date = datetime.now() - timedelta(days=7)

            end_date = datetime.now()
        
        try:
            # 详细调试信息开始
            print(f"🔍 [用户分析调试] App ID: {app_model.id}")
            print(f"🔍 [用户分析调试] 时间范围: {start_date} 到 {end_date}")
            print(f"🔍 [用户分析调试] 请求参数: range={time_range}, user_id={user_id}")
            
            # 检查各表的基础数据
            total_end_users_with_app_id = db.session.query(EndUser).filter(EndUser.app_id == app_model.id).count()
            total_end_users_all = db.session.query(EndUser).count()
            total_messages_in_app = db.session.query(Message).filter(Message.app_id == app_model.id).count()
            total_conversations_in_app = db.session.query(Conversation).filter(Conversation.app_id == app_model.id).count()
            
            print(f"📊 [数据统计] EndUser总数(所有): {total_end_users_all}")
            print(f"📊 [数据统计] EndUser总数(匹配app_id): {total_end_users_with_app_id}")
            print(f"📊 [数据统计] Message总数(匹配app_id): {total_messages_in_app}")
            print(f"📊 [数据统计] Conversation总数(匹配app_id): {total_conversations_in_app}")
            
            # 检查EndUser表中app_id的分布情况
            end_users_with_null_app_id = db.session.query(EndUser).filter(EndUser.app_id.is_(None)).count()
            print(f"📊 [数据统计] EndUser中app_id为NULL的数量: {end_users_with_null_app_id}")
            
            # 检查Message和Conversation表中的EndUser关联情况
            messages_with_end_user = db.session.query(Message).filter(
                and_(Message.app_id == app_model.id, Message.from_end_user_id.isnot(None))
            ).count()
            conversations_with_end_user = db.session.query(Conversation).filter(
                and_(Conversation.app_id == app_model.id, Conversation.from_end_user_id.isnot(None))
            ).count()
            
            print(f"📊 [关联统计] Message中有EndUser关联的数量: {messages_with_end_user}")
            print(f"📊 [关联统计] Conversation中有EndUser关联的数量: {conversations_with_end_user}")
            
            # 获取总用户数 - 优先使用app_id匹配，如果没有则通过关联查找
            total_users = total_end_users_with_app_id
            
            # 如果EndUser表中没有匹配的app_id记录，尝试通过Message表查找用户
            if total_users == 0:
                print("⚠️ [警告] EndUser表中没有匹配的app_id记录，尝试通过Message和Conversation表查找")
                # 通过Message表查找关联的用户
                users_from_messages = db.session.query(EndUser.id).join(
                    Message, Message.from_end_user_id == EndUser.id
                ).filter(Message.app_id == app_model.id).distinct().count()
                
                users_from_conversations = db.session.query(EndUser.id).join(
                    Conversation, Conversation.from_end_user_id == EndUser.id
                ).filter(Conversation.app_id == app_model.id).distinct().count()
                
                print(f"🔄 [备用查询] 通过Message表找到的用户数: {users_from_messages}")
                print(f"🔄 [备用查询] 通过Conversation表找到的用户数: {users_from_conversations}")
                
                total_users = max(users_from_messages, users_from_conversations)
                print(f"🔄 [备用查询] 最终采用的用户数: {total_users}")
            
            # 修改活跃用户查询逻辑 - 移除过于严格的JOIN条件
            active_users_in_range = db.session.query(EndUser.id).join(
                Message, Message.from_end_user_id == EndUser.id
            ).filter(
                and_(
                    Message.app_id == app_model.id,  # 只要求Message的app_id匹配
                    Message.created_at >= start_date,
                    Message.created_at <= end_date
                )
            ).distinct().count()
            
            # 修改对话数查询逻辑 - 直接查询Conversation表
            total_conversations = db.session.query(Conversation).filter(
                and_(
                    Conversation.app_id == app_model.id,
                    Conversation.created_at >= start_date,
                    Conversation.created_at <= end_date
                )
            ).count()

            # 修改消息数查询逻辑 - 直接查询Message表
            total_messages = db.session.query(Message).filter(
                and_(
                    Message.app_id == app_model.id,
                    Message.created_at >= start_date,
                    Message.created_at <= end_date
                )
            ).count()
            
            # 输出查询结果
            print(f"✅ [查询结果] 总用户数: {total_users}")
            print(f"✅ [查询结果] 活跃用户数(时间范围内): {active_users_in_range}")
            print(f"✅ [查询结果] 总对话数(时间范围内): {total_conversations}")
            print(f"✅ [查询结果] 总消息数(时间范围内): {total_messages}")
            
            # 分别查询消息统计和对话统计，避免笛卡尔积问题

            # 1. 查询消息统计和最后活跃时间 - 修复查询逻辑
            message_stats_subquery = db.session.query(
                EndUser.id.label('user_id'),
                func.count(Message.id).label('message_count'),
                func.max(Message.created_at).label('last_active')
            ).outerjoin(
                Message, and_(
                    Message.from_end_user_id == EndUser.id,
                    Message.app_id == app_model.id,
                    Message.created_at >= start_date,
                    Message.created_at <= end_date
                )
            ).filter(
                # 修改：改为OR条件，处理EndUser.app_id可能为NULL的情况
                sa_or(
                    EndUser.app_id == app_model.id,
                    EndUser.app_id.is_(None)
                )
            ).group_by(EndUser.id).subquery()

            # 2. 查询对话统计（在指定时间范围内）- 修复查询逻辑
            conversation_stats_subquery = db.session.query(
                EndUser.id.label('user_id'),
                func.count(Conversation.id).label('conversation_count')
            ).outerjoin(
                Conversation, and_(
                    Conversation.from_end_user_id == EndUser.id,
                    Conversation.app_id == app_model.id,
                    Conversation.created_at >= start_date,
                    Conversation.created_at <= end_date
                )
            ).filter(
                # 修改：改为OR条件，处理EndUser.app_id可能为NULL的情况
                sa_or(
                    EndUser.app_id == app_model.id,
                    EndUser.app_id.is_(None)
                )
            ).group_by(EndUser.id).subquery()

            # 3. 合并查询结果
            user_distribution_query = db.session.query(
                EndUser.id.label('user_id'),
                EndUser.name.label('user_name'),
                EndUser.external_user_id.label('external_user_id'),
                EndUser.created_at.label('user_created_at'),
                func.coalesce(message_stats_subquery.c.message_count, 0).label('message_count'),
                func.coalesce(conversation_stats_subquery.c.conversation_count, 0).label('conversation_count'),
                message_stats_subquery.c.last_active.label('last_active')
            ).outerjoin(
                message_stats_subquery, message_stats_subquery.c.user_id == EndUser.id
            ).outerjoin(
                conversation_stats_subquery, conversation_stats_subquery.c.user_id == EndUser.id
            ).filter(
                # 修改：改为OR条件，处理EndUser.app_id可能为NULL的情况
                sa_or(
                    EndUser.app_id == app_model.id,
                    EndUser.app_id.is_(None)
                )
            )

            # 如果指定了用户ID，添加筛选
            if user_id:
                user_distribution_query = user_distribution_query.filter(EndUser.id == user_id)

            # 获取所有用户数据（不限制数量）
            all_user_distribution = user_distribution_query.order_by(
                desc('message_count')
            ).all()
            
            print(f"📊 [用户分布] 查询到的原始用户记录数: {len(all_user_distribution)}")

            # 格式化用户分布数据并合并相同名称的用户
            user_name_map = {}
            for user in all_user_distribution:
                # 优先使用external_user_id，然后是name，最后是id
                display_name = user.external_user_id or user.user_name or f"用户{user.user_id[:8]}"

                # 如果相同名称的用户已存在，合并数据
                if display_name in user_name_map:
                    user_name_map[display_name]['message_count'] += (user.message_count or 0)
                    user_name_map[display_name]['conversation_count'] += (user.conversation_count or 0)
                    # 更新最后活跃时间为最新的 - 简化逻辑，避免类型比较问题
                    if user.last_active:
                        existing_last_active = user_name_map[display_name]['last_active']
                        if not existing_last_active:
                            # 如果现有记录没有last_active，直接使用新的
                            user_name_map[display_name]['last_active'] = user.last_active
                        elif isinstance(existing_last_active, datetime) and isinstance(user.last_active, datetime):
                            # 两个都是datetime对象，直接比较
                            if user.last_active > existing_last_active:
                                user_name_map[display_name]['last_active'] = user.last_active
                        else:
                            # 如果类型不匹配，优先使用新的时间
                            user_name_map[display_name]['last_active'] = user.last_active
                else:
                    user_name_map[display_name] = {
                        'user_id': user.user_id,
                        'user_name': display_name,
                        'message_count': user.message_count or 0,
                        'conversation_count': user.conversation_count or 0,
                        'last_active': user.last_active,  # 先保持datetime对象，稍后统一转换
                        'created_at': user.user_created_at.isoformat() if user.user_created_at else None,
                    }

            # 转换为列表并按消息数量排序
            formatted_user_distribution = list(user_name_map.values())
            # 确保last_active字段格式正确 - 统一转换为ISO字符串格式
            for user_data in formatted_user_distribution:
                if user_data['last_active']:
                    if isinstance(user_data['last_active'], str):
                        # 已经是字符串，保持不变
                        pass
                    else:
                        # 是datetime对象，转换为ISO字符串
                        user_data['last_active'] = user_data['last_active'].isoformat()
                else:
                    # 确保None值保持为None
                    user_data['last_active'] = None
            formatted_user_distribution.sort(key=lambda x: x['message_count'], reverse=True)
            
            print(f"📊 [用户分布] 合并后的用户数量: {len(formatted_user_distribution)}")
            if formatted_user_distribution:
                top_users = formatted_user_distribution[:3]  # 显示前3个用户
                for i, user in enumerate(top_users):
                    print(f"📊 [用户分布] 用户{i+1}: {user['user_name']} - 消息数:{user['message_count']}, 对话数:{user['conversation_count']}")

            # 调试：计算用户分布中的消息总数
            user_distribution_total_messages = sum(user['message_count'] for user in formatted_user_distribution)
            user_distribution_total_conversations = sum(user['conversation_count'] for user in formatted_user_distribution)

            # 数据一致性检查和详细分析
            print(f"🔍 [一致性检查] 用户分布消息总数: {user_distribution_total_messages}")
            print(f"🔍 [一致性检查] 直接查询消息总数: {total_messages}")
            print(f"🔍 [一致性检查] 用户分布对话总数: {user_distribution_total_conversations}")
            print(f"🔍 [一致性检查] 直接查询对话总数: {total_conversations}")
            
            if user_distribution_total_messages != total_messages:
                diff = total_messages - user_distribution_total_messages
                print(f"⚠️ [数据不一致] 消息数差异: {diff} 条消息")
                # 查找没有关联EndUser的消息
                orphan_messages = db.session.query(Message).filter(
                    and_(
                        Message.app_id == app_model.id,
                        Message.created_at >= start_date,
                        Message.created_at <= end_date,
                        Message.from_end_user_id.is_(None)
                    )
                ).count()
                print(f"🔍 [数据分析] 没有关联EndUser的消息数量: {orphan_messages}")
                
                # 查找关联到不存在EndUser的消息
                invalid_user_messages = db.session.query(Message).filter(
                    and_(
                        Message.app_id == app_model.id,
                        Message.created_at >= start_date,
                        Message.created_at <= end_date,
                        Message.from_end_user_id.isnot(None),
                        ~Message.from_end_user_id.in_(
                            db.session.query(EndUser.id).filter(
                                sa_or(
                                    EndUser.app_id == app_model.id,
                                    EndUser.app_id.is_(None)
                                )
                            )
                        )
                    )
                ).count()
                print(f"🔍 [数据分析] 关联到不存在EndUser的消息数量: {invalid_user_messages}")
                
            if user_distribution_total_conversations != total_conversations:
                diff = total_conversations - user_distribution_total_conversations
                print(f"⚠️ [数据不一致] 对话数差异: {diff} 个对话")
                # 查找没有关联EndUser的对话
                orphan_conversations = db.session.query(Conversation).filter(
                    and_(
                        Conversation.app_id == app_model.id,
                        Conversation.created_at >= start_date,
                        Conversation.created_at <= end_date,
                        Conversation.from_end_user_id.is_(None)
                    )
                ).count()
                print(f"🔍 [数据分析] 没有关联EndUser的对话数量: {orphan_conversations}")
                
                # 查找关联到不存在EndUser的对话
                invalid_user_conversations = db.session.query(Conversation).filter(
                    and_(
                        Conversation.app_id == app_model.id,
                        Conversation.created_at >= start_date,
                        Conversation.created_at <= end_date,
                        Conversation.from_end_user_id.isnot(None),
                        ~Conversation.from_end_user_id.in_(
                            db.session.query(EndUser.id).filter(
                                sa_or(
                                    EndUser.app_id == app_model.id,
                                    EndUser.app_id.is_(None)
                                )
                            )
                        )
                    )
                ).count()
                print(f"🔍 [数据分析] 关联到不存在EndUser的对话数量: {invalid_user_conversations}")

            daily_active_users = self._get_daily_active_users(app_model.id, start_date, end_date, user_id)
            
            # 最终返回结果调试
            print(f"✅ [最终结果] 返回数据:")
            print(f"   - total_users: {total_users}")
            print(f"   - active_users_today: {active_users_in_range}")
            print(f"   - total_conversations: {total_conversations}")
            print(f"   - total_messages: {total_messages}")
            print(f"   - user_distribution: {len(formatted_user_distribution)} 个用户")
            print(f"   - daily_active_users: {len(daily_active_users)} 天的数据")
            
            # 验证数据格式正确性
            for i, user in enumerate(formatted_user_distribution[:3]):  # 检查前3个用户
                last_active = user.get('last_active')
                if last_active and not isinstance(last_active, str):
                    print(f"⚠️ [警告] 用户{i+1}的last_active字段类型不正确: {type(last_active)}")
            
            print(f"🎉 [成功] 用户分析数据查询完成!")
            
            return {
                'total_users': total_users,
                'active_users_today': active_users_in_range,
                'total_conversations': total_conversations,
                'total_messages': total_messages,
                'user_distribution': formatted_user_distribution,
                'daily_active_users': daily_active_users
            }
            
        except Exception as e:
            # 如果查询失败，返回默认数据并记录详细错误信息
            print(f"查询用户分析数据时发生错误: {str(e)}")
            import traceback
            print(f"错误堆栈: {traceback.format_exc()}")
            return {
                'total_users': 0,
                'active_users_today': 0,
                'total_conversations': 0,
                'total_messages': 0,
                'user_distribution': [],
                'daily_active_users': []
            }

    def _get_daily_active_users(self, app_id, start_date, end_date, user_id=None):
        """获取每日活跃用户数据"""
        try:
            print(f"📅 [每日活跃用户] 开始计算，时间范围: {start_date.date()} 到 {end_date.date()}")
            # 生成日期范围
            date_range = []
            current_date = start_date.date()
            end_date_only = end_date.date()

            while current_date <= end_date_only:
                date_range.append(current_date)
                current_date += timedelta(days=1)
                
            print(f"📅 [每日活跃用户] 需要计算 {len(date_range)} 天的数据")

            daily_data = []
            for date in date_range:
                day_start = datetime.combine(date, datetime.min.time())
                day_end = datetime.combine(date, datetime.max.time())

                # 查询当天的活跃用户数 - 修复查询逻辑
                query = db.session.query(EndUser.id).join(
                    Message, Message.from_end_user_id == EndUser.id
                ).filter(
                    and_(
                        Message.app_id == app_id,  # 只检查Message的app_id
                        Message.created_at >= day_start,
                        Message.created_at <= day_end
                    )
                )

                # 如果指定了用户ID，添加筛选
                if user_id:
                    query = query.filter(EndUser.id == user_id)

                user_count = query.distinct().count()

                daily_data.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'user_count': user_count
                })

            print(f"📅 [每日活跃用户] 计算完成，总天数: {len(daily_data)}")
            if daily_data:
                total_daily_users = sum(day['user_count'] for day in daily_data)
                print(f"📅 [每日活跃用户] 所有天数活跃用户总和: {total_daily_users}")
            return daily_data
        except Exception as e:
            print(f"Error getting daily active users: {e}")
            return []


class UserListApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model
    def get(self, app_model: App):
        """获取应用的用户列表"""
        users = db.session.query(
            EndUser.id,
            EndUser.name,
            EndUser.external_user_id,
            EndUser.session_id,
            EndUser._is_anonymous.label('is_anonymous'),
            EndUser.created_at
        ).filter(
            EndUser.app_id == app_model.id
        ).order_by(
            desc(EndUser.created_at)
        ).all()

        user_list = []
        for user in users:
            # 优先使用name，然后external_user_id，最后使用session_id
            display_name = (
                user.name or
                user.external_user_id or
                user.session_id or
                f"User {user.id[:8]}"
            )
            user_list.append({
                "id": user.id,
                "name": display_name,
                "raw_name": user.name,
                "session_id": user.session_id,
                "external_user_id": user.external_user_id,
                "is_anonymous": user.is_anonymous,
                "created_at": user.created_at.strftime('%Y-%m-%d %H:%M:%S')
            })

        return {"users": user_list}


class UserAnalyticsDetailApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model
    def get(self, app_model: App):
        """获取用户分析详情（支持分页）"""
        parser = reqparse.RequestParser()
        parser.add_argument('range', type=str, default='7d', location='args')
        parser.add_argument('start_date', type=str, location='args')
        parser.add_argument('end_date', type=str, location='args')
        parser.add_argument('page', type=int, default=0, location='args')
        parser.add_argument('limit', type=int, default=10, location='args')
        args = parser.parse_args()

        # 计算时间范围（复用原有逻辑）
        time_range = args['range']
        start_date_str = args.get('start_date')
        end_date_str = args.get('end_date')
        page = args['page']
        limit = min(args['limit'], 100)  # 限制最大每页数量
        offset = page * limit

        # 处理自定义时间范围
        if start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d %H:%M')
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d %H:%M')
            except ValueError:
                try:
                    start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                    end_date = datetime.strptime(end_date_str, '%Y-%m-%d') + timedelta(days=1)
                except ValueError:
                    start_date = datetime.now() - timedelta(days=7)
                    end_date = datetime.now()
        else:
            # 使用预设时间范围
            if time_range == '1d':
                start_date = datetime.now() - timedelta(days=1)
            elif time_range == '7d':
                start_date = datetime.now() - timedelta(days=7)
            elif time_range == '30d':
                start_date = datetime.now() - timedelta(days=30)
            elif time_range == '90d':
                start_date = datetime.now() - timedelta(days=90)
            else:
                start_date = datetime.now() - timedelta(days=7)
            end_date = datetime.now()

        try:
            # 构建用户详情查询（与原有逻辑相同，但支持分页）
            message_stats_subquery = db.session.query(
                EndUser.id.label('user_id'),
                func.count(Message.id).label('message_count'),
                func.max(Message.created_at).label('last_active')
            ).outerjoin(
                Message, and_(
                    Message.from_end_user_id == EndUser.id,
                    Message.app_id == app_model.id,
                    Message.created_at >= start_date,
                    Message.created_at <= end_date
                )
            ).filter(
                # 修改：改为OR条件，处理EndUser.app_id可能为NULL的情况
                sa_or(
                    EndUser.app_id == app_model.id,
                    EndUser.app_id.is_(None)
                )
            ).group_by(EndUser.id).subquery()

            conversation_stats_subquery = db.session.query(
                EndUser.id.label('user_id'),
                func.count(Conversation.id).label('conversation_count')
            ).outerjoin(
                Conversation, and_(
                    Conversation.from_end_user_id == EndUser.id,
                    Conversation.app_id == app_model.id,
                    Conversation.created_at >= start_date,
                    Conversation.created_at <= end_date
                )
            ).filter(
                # 修改：改为OR条件，处理EndUser.app_id可能为NULL的情况
                sa_or(
                    EndUser.app_id == app_model.id,
                    EndUser.app_id.is_(None)
                )
            ).group_by(EndUser.id).subquery()

            # 获取总数（用于分页）
            total_query = db.session.query(EndUser.id).filter(
                # 修改：改为OR条件，处理EndUser.app_id可能为NULL的情况
                sa_or(
                    EndUser.app_id == app_model.id,
                    EndUser.app_id.is_(None)
                )
            )
            total = total_query.count()

            # 分页查询用户详情
            user_distribution_query = db.session.query(
                EndUser.id.label('user_id'),
                EndUser.name.label('user_name'),
                EndUser.external_user_id.label('external_user_id'),
                EndUser.created_at.label('user_created_at'),
                func.coalesce(message_stats_subquery.c.message_count, 0).label('message_count'),
                func.coalesce(conversation_stats_subquery.c.conversation_count, 0).label('conversation_count'),
                message_stats_subquery.c.last_active.label('last_active')
            ).outerjoin(
                message_stats_subquery, message_stats_subquery.c.user_id == EndUser.id
            ).outerjoin(
                conversation_stats_subquery, conversation_stats_subquery.c.user_id == EndUser.id
            ).filter(
                # 修改：改为OR条件，处理EndUser.app_id可能为NULL的情况
                sa_or(
                    EndUser.app_id == app_model.id,
                    EndUser.app_id.is_(None)
                )
            ).order_by(
                desc('message_count')
            ).offset(offset).limit(limit)

            user_distribution = user_distribution_query.all()

            # 格式化数据
            formatted_users = []
            for user in user_distribution:
                display_name = user.external_user_id or user.user_name or f"用户{user.user_id[:8]}"
                formatted_users.append({
                    'user_id': user.user_id,
                    'user_name': display_name,
                    'message_count': user.message_count or 0,
                    'conversation_count': user.conversation_count or 0,
                    'last_active': user.last_active.isoformat() if user.last_active else None,
                    'created_at': user.user_created_at.isoformat() if user.user_created_at else None,
                })

            return {
                'users': formatted_users,
                'total': total,
                'page': page,
                'limit': limit,
                'has_more': (offset + limit) < total
            }

        except Exception as e:
            return {
                'users': [],
                'total': 0,
                'page': page,
                'limit': limit,
                'has_more': False
            }


# 注册API路由
api.add_resource(SimpleUserAnalyticsApi, '/apps/<uuid:app_id>/user-analytics')
api.add_resource(UserListApi, '/apps/<uuid:app_id>/users')
api.add_resource(UserAnalyticsDetailApi, '/apps/<uuid:app_id>/user-analytics-detail')
