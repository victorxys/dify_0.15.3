from collections.abc import Callable, Sequence
from datetime import UTC, datetime
from typing import Optional, Union

from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.orm import Session

from core.app.entities.app_invoke_entities import InvokeFrom
from core.llm_generator.llm_generator import LLMGenerator
from extensions.ext_database import db
from libs.infinite_scroll_pagination import InfiniteScrollPagination
from models.account import Account
from models.model import App, Conversation, EndUser, Message
from services.errors.conversation import ConversationNotExistsError, LastConversationNotExistsError
from services.errors.message import MessageNotExistsError


class ConversationService:
    @classmethod
    def pagination_by_last_id(
        cls,
        *,
        session: Session,
        app_model: App,
        user: Optional[Union[Account, EndUser]],
        last_id: Optional[str],
        limit: int,
        invoke_from: InvokeFrom,
        include_ids: Optional[Sequence[str]] = None,
        exclude_ids: Optional[Sequence[str]] = None,
        sort_by: str = "-updated_at",
    ) -> InfiniteScrollPagination:
        if not user:
            return InfiniteScrollPagination(data=[], limit=limit, has_more=False)
        
        # print("\n=== 对话列表查询开始 ===")
        # print("用户信息:")
        # print(f"- 类型: {user.__class__.__name__}")
        # print(f"- ID: {user.id}")
        # print(f"- 应用ID: {app_model.id}")

        from_source = "api" if isinstance(user, EndUser) else "console"
        from_end_user_id = user.id if isinstance(user, EndUser) else None
        from_account_id = user.id if isinstance(user, Account) else None

        stmt = select(Conversation).where(
            Conversation.is_deleted == False,
            Conversation.app_id == app_model.id,
            Conversation.from_source == from_source,
            Conversation.from_end_user_id == from_end_user_id,
            Conversation.from_account_id == from_account_id,
            or_(Conversation.invoke_from.is_(None), Conversation.invoke_from == invoke_from.value),
        )
        
        # 执行查询并打印结果
        initial_query = stmt.order_by(desc(Conversation.updated_at)).limit(limit)
        initial_results = session.scalars(initial_query).all()
        

        # 应用过滤条件
        if include_ids is not None:
            stmt = stmt.where(Conversation.id.in_(include_ids))
        if exclude_ids is not None:
            stmt = stmt.where(~Conversation.id.in_(exclude_ids))

        # 设置排序参数
        sort_field, sort_direction = cls._get_sort_params(sort_by)

        if last_id:
            last_conversation = session.scalar(stmt.where(Conversation.id == last_id))
            if not last_conversation:
                raise LastConversationNotExistsError()

            # build filters based on sorting
            filter_condition = cls._build_filter_condition(
                sort_field=sort_field,
                sort_direction=sort_direction,
                reference_conversation=last_conversation,
            )
            stmt = stmt.where(filter_condition)
        query_stmt = stmt.order_by(sort_direction(getattr(Conversation, sort_field))).limit(limit)
        conversations = session.scalars(query_stmt).all()

        # 检查是否有更多数据
        has_more = False
        if len(conversations) == limit:
            current_page_last_conversation = conversations[-1]
            rest_filter_condition = cls._build_filter_condition(
                sort_field=sort_field,
                sort_direction=sort_direction,
                reference_conversation=current_page_last_conversation,
            )
            count_stmt = select(func.count()).select_from(stmt.where(rest_filter_condition).subquery())
            rest_count = session.scalar(count_stmt) or 0
            has_more = rest_count > 0

        # print("\n=== 最终分页结果 ===")
        # print(f"- 本页记录数: {len(conversations)}")
        # print(f"- 分页大小: {limit}")
        # print(f"- 是否有下一页: {has_more}")
        # if conversations:
        #     print(f"- 本页最后一条记录ID: {conversations[-1].id}")
        # print("=== 查询完成 ===\n")

        return InfiniteScrollPagination(data=conversations, limit=limit, has_more=has_more)

    @classmethod
    def _get_sort_params(cls, sort_by: str):
        if sort_by.startswith("-"):
            return sort_by[1:], desc
        return sort_by, asc

    @classmethod
    def _build_filter_condition(cls, sort_field: str, sort_direction: Callable, reference_conversation: Conversation):
        field_value = getattr(reference_conversation, sort_field)
        if sort_direction == desc:
            return getattr(Conversation, sort_field) < field_value
        else:
            return getattr(Conversation, sort_field) > field_value

    @classmethod
    def rename(
        cls,
        app_model: App,
        conversation_id: str,
        user: Optional[Union[Account, EndUser]],
        name: str,
        auto_generate: bool,
    ):
        conversation = cls.get_conversation(app_model, conversation_id, user)

        if auto_generate:
            return cls.auto_generate_name(app_model, conversation)
        else:
            conversation.name = name
            conversation.updated_at = datetime.now(UTC).replace(tzinfo=None)
            db.session.commit()

        return conversation

    @classmethod
    def auto_generate_name(cls, app_model: App, conversation: Conversation):
        # get conversation first message
        message = (
            db.session.query(Message)
            .filter(Message.app_id == app_model.id, Message.conversation_id == conversation.id)
            .order_by(Message.created_at.asc())
            .first()
        )

        if not message:
            raise MessageNotExistsError()

        # generate conversation name
        try:
            name = LLMGenerator.generate_conversation_name(
                app_model.tenant_id, message.query, conversation.id, app_model.id
            )
            conversation.name = name
        except:
            pass

        db.session.commit()

        return conversation

    @classmethod
    def get_conversation(cls, app_model: App, conversation_id: str, user: Optional[Union[Account, EndUser]]):
        # print("\n=== 获取单个对话 ===")
        # print("用户信息:")
        # print(f"- 类型: {user.__class__.__name__}")
        # print(f"- ID: {user.id}")
        # print(f"- 应用ID: {app_model.id}")
        # print(f"请求的对话ID: {conversation_id}")

        from_source = "api" if isinstance(user, EndUser) else "console" #此处对 api console 进行了对调---恢复
        # from_source = "console" if isinstance(user, EndUser) else "api"
        from_end_user_id = user.id if isinstance(user, EndUser) else None
        from_account_id = user.id if isinstance(user, Account) else None

        conversation = (
            db.session.query(Conversation)
            .filter(
                Conversation.id == conversation_id,
                Conversation.app_id == app_model.id,
                Conversation.from_source == from_source,
                Conversation.from_end_user_id == from_end_user_id,
                Conversation.from_account_id == from_account_id,
                Conversation.is_deleted == False,
                # 如果需要，也检查 status == 'normal'
                # Conversation.status == 'normal'
            )
            .first()
        )

        

        if not conversation:
            print(f"--- 查询失败: conv_id={conversation_id}, user_id={user.id}, is_end_user={from_end_user_id} ---", flush=True)
            raise ConversationNotExistsError()
        else:
            print(f"--- 查询成功: conv_id={conversation_id}, user_id={user.id}, is_end_user={from_account_id} ---", flush=True)

        return conversation

    @classmethod
    def delete(cls, app_model: App, conversation_id: str, user: Optional[Union[Account, EndUser]]):
        print("\n=== 删除对话开始 ===")
        print("用户信息:")
        print(f"- 类型: {user.__class__.__name__}")
        print(f"- ID: {user.id}")
        print(f"要删除的对话ID: {conversation_id}")

        # 获取对话信息
        conversation = cls.get_conversation(app_model, conversation_id, user)
        if not conversation:
            print("未找到对话，删除失败")
            raise ConversationNotExistsError()

        # 执行删除操作
        conversation.is_deleted = True
        conversation.updated_at = datetime.now(UTC).replace(tzinfo=None)
        db.session.commit()

        print("对话删除成功:")
        print(f"- 对话ID: {conversation.id}")
        print(f"- 删除时间: {conversation.updated_at}")
        print("=== 删除对话完成 ===\n")
