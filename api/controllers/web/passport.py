import uuid

from flask import request
from flask_restful import Resource  # type: ignore
from werkzeug.exceptions import BadRequest, NotFound, Unauthorized

from controllers.web import api
from controllers.web.error import WebSSOAuthRequiredError
from extensions.ext_database import db
from libs.passport import PassportService
from models.model import Account, App, EndUser, Site

# from models.account import Account
from services.enterprise.enterprise_service import EnterpriseService
from services.feature_service import FeatureService


class PassportResource(Resource):
    """Base resource for passport."""

    def get(self):
        system_features = FeatureService.get_system_features()
        app_code = request.headers.get("X-App-Code")
        account_id = request.headers.get("X-User-Id")
        print(f"account_id=====: {account_id}")
        # account= Account(id=account_id)
        if not account_id:
            # 如果获取不到 Account ID，可能需要返回错误或执行匿名流程
            # 这里我们先假设它必须存在
            raise BadRequest("User account information is missing.")

        # 检查 Account 是否真实存在 (可选但推荐)
        account = db.session.query(Account).filter(Account.id == account_id).first()
        if not account:
            raise Unauthorized("Invalid user account.")
        
        if app_code is None:
            raise Unauthorized("X-App-Code header is missing.")

        if system_features.sso_enforced_for_web:
            app_web_sso_enabled = EnterpriseService.get_app_web_sso_enabled(app_code).get("enabled", False)
            if app_web_sso_enabled:
                raise WebSSOAuthRequiredError()

        # get site from db and check if it is normal
        site = db.session.query(Site).filter(Site.code == app_code, Site.status == "normal").first()
        if not site:
            raise NotFound()
        # get app from db and check if it is normal and enable_site
        app_model = db.session.query(App).filter(App.id == site.app_id).first()
        if not app_model or app_model.status != "normal" or not app_model.enable_site:
            raise NotFound()
        # --- 修改 EndUser 的创建/获取逻辑 ---
        shared_id = account_id  # 使用 Account ID 作为共享 ID

        # 尝试查找是否已存在使用此共享 ID 的 EndUser
        end_user = db.session.query(EndUser).filter(EndUser.id == shared_id).first()
        if not end_user:
            print(f"--- Creating new EndUser with shared ID: {shared_id} ---", flush=True)
            try:
                end_user = EndUser(
                    id=shared_id,  # 使用 Account ID
                    tenant_id=app_model.tenant_id,
                    app_id=app_model.id,
                    type='account_linked',  # 定义一个新类型来标识
                    # 考虑是否将 Account ID 存入 external_user_id 更合适？
                    # external_user_id=account.id, # 或者保持 id 共享，这里不填
                    name=account.name if hasattr(account, 'name') else None,  # 使用 Account 的名字
                    is_anonymous=False,  # 标记为非匿名
                    session_id=str(uuid.uuid4())  # 仍然生成一个唯一的 session_id
                )
                db.session.add(end_user)
                db.session.commit()
                db.session.refresh(end_user)
            except Exception as e:
                # 处理可能的数据库错误，例如 UUID 冲突（虽然理论上不应发生）
                db.session.rollback()
                print(f"Error creating EndUser with shared ID {shared_id}: {e}", flush=True)
                # 重新查询一次，以防并发创建
                end_user = db.session.query(EndUser).filter(EndUser.id == shared_id).first()
                if not end_user:
                    # 如果仍然找不到，说明创建真的失败了
                    raise BadRequest("Failed to create or link user session.") from e
        else:
            # 如果已存在，更新一些信息（如果需要）
            print(f"--- Found existing EndUser with shared ID: {shared_id} ---", flush=True)
            needs_update = False
            if end_user.is_anonymous:
                end_user.is_anonymous = False
                needs_update = True
            if end_user.type != 'account_linked':
                end_user.type = 'account_linked'
                needs_update = True
            if hasattr(account, 'name') and end_user.name != account.name:
                end_user.name = account.name
                needs_update = True
            # 考虑是否需要更新 session_id
            # end_user.session_id = str(uuid.uuid4())
            # needs_update = True

            if needs_update:
                # end_user.updated_at = datetime.now(UTC).replace(tzinfo=None)
                db.session.commit()

        payload = {
            "iss": site.app_id,
            "sub": "Web API Passport",
            "app_id": site.app_id,
            "app_code": app_code,
            "end_user_id": end_user.id,
            "account_id": account_id,  # 此处增加了 account_id
            "user_type": end_user.type  # 使用我们设置的类型
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
