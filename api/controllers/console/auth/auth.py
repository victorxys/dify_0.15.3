from flask import Blueprint, request, jsonify
from flask_login import login_user
from services.account_service import AccountService, RegisterService
from models.account import Account

bp = Blueprint('auth', __name__)

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    try:
        # 尝试验证账号
        account = AccountService.authenticate(email=email, password=password)
        login_user(account)
        return jsonify({
            'code': 200,
            'data': {
                'email': account.email,
                'name': account.name
            }
        })
    except Exception as e:
        # 如果账号不存在,尝试注册
        try:
            account = RegisterService.register(
                email=email,
                name=email.split('@')[0],
                password=password,
                language='zh-Hans'  # 默认使用中文
            )
            # 注册成功后登录
            login_user(account)
            return jsonify({
                'code': 200, 
                'data': {
                    'email': account.email,
                    'name': account.name
                }
            })
        except Exception as e:
            return jsonify({
                'code': 500,
                'msg': f'Failed to auto register: {str(e)}'
            }), 500
