# 聊天系统外部登录集成

本文档介绍了如何配置聊天系统与外部业务系统的登录认证集成。

## 功能概述

该实现允许聊天系统通过外部业务系统的API进行用户认证，而不是使用Dify原有的登录系统。主要功能包括：

1. 自定义登录页面
2. 与外部业务系统API的集成
3. 登录状态检查和重定向
4. 配置化的API连接

## 文件结构

```
web/
├── app/
│   ├── chat-login/
│   │   ├── page.tsx          # 自定义登录页面
│   │   └── layout.tsx        # 登录页面布局
├── config/
│   └── external-auth-config.ts  # 外部认证API配置
├── service/
│   ├── external-auth.ts      # 外部认证服务
│   └── api-adapters/
│       └── external-auth-adapter.ts  # 外部API适配器
└── middleware.ts             # 中间件（处理认证检查和重定向）
```

## 配置说明

### 1. 配置外部认证API

编辑 `web/config/external-auth-config.ts` 文件，根据外部业务系统的API要求进行配置：

```typescript
export const externalAuthConfig = {
  // API认证端点
  apiUrl: 'https://your-external-system-api.com/auth',
  
  // OAuth2认证所需的客户端凭证（如果需要）
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  
  // API所需的额外请求头
  headers: {
    'Content-Type': 'application/json',
    // 添加其他必要的请求头
  },
  
  // 请求超时时间（毫秒）
  timeout: 10000,
  
  // 是否在请求中包含凭证（cookies, HTTP认证）
  withCredentials: true,
  
  // 请求负载中的字段名（根据API调整）
  fieldNames: {
    username: 'username',  // 用户名字段
    password: 'password',  // 密码字段
  },
  
  // 响应中的字段名（根据API调整）
  responseFields: {
    token: 'token',        // 认证令牌字段
    user: 'user',          // 用户信息字段
    success: 'success',    // 成功标志字段
    message: 'message',    // 消息字段
  },
}
```

### 2. 自定义API适配器

如果外部API的请求或响应格式需要特殊处理，可以修改 `web/service/api-adapters/external-auth-adapter.ts` 文件中的 `transformRequest` 和 `transformResponse` 方法。

## 工作流程

1. 用户访问聊天页面（`/chat/[token]`）
2. 中间件检查用户是否已登录
3. 如果未登录，重定向到自定义登录页面（`/chat-login`）
4. 用户在登录页面输入凭证
5. 系统通过外部业务系统API验证用户凭证
6. 验证成功后，将用户重定向回原始请求的聊天页面

## 安全考虑

1. 令牌存储在localStorage中，可能存在XSS风险
2. 客户端密钥不应在前端暴露，建议使用后端代理处理敏感凭证
3. 确保使用HTTPS连接以保护传输中的凭证

## 扩展和自定义

如需进一步自定义登录流程或UI，可以修改以下文件：

- `web/app/chat-login/page.tsx`：自定义登录页面UI和交互
- `web/service/external-auth.ts`：自定义认证逻辑
- `web/middleware.ts`：自定义认证检查和重定向逻辑
