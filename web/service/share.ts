import type { IOnCompleted, IOnData, IOnError, IOnFile, IOnIterationFinished, IOnIterationNext, IOnIterationStarted, IOnMessageEnd, IOnMessageReplace, IOnNodeFinished, IOnNodeStarted, IOnTTSChunk, IOnTTSEnd, IOnTextChunk, IOnTextReplace, IOnThought, IOnWorkflowFinished, IOnWorkflowStarted } from './base'
import {
  del as consoleDel, get as consoleGet, patch as consolePatch, post as consolePost,
  delPublic as del, getPublic as get, patchPublic as patch, postPublic as post, ssePost,
} from './base'
import type { FeedbackType } from '@/app/components/base/chat/chat/type'
import type {
  AppConversationData,
  AppData,
  AppMeta,
  ConversationItem,
} from '@/models/share'
import type { ChatConfig } from '@/app/components/base/chat/types'
import type { SystemFeatures } from '@/types/feature'

function getAction(action: 'get' | 'post' | 'del' | 'patch', isInstalledApp: boolean) {
  switch (action) {
    case 'get':
      return isInstalledApp ? consoleGet : get
    case 'post':
      return isInstalledApp ? consolePost : post
    case 'patch':
      return isInstalledApp ? consolePatch : patch
    case 'del':
      return isInstalledApp ? consoleDel : del
  }
}

export function getUrl(url: string, isInstalledApp: boolean, installedAppId: string) {
  return isInstalledApp ? `installed-apps/${installedAppId}/${url.startsWith('/') ? url.slice(1) : url}` : url
}

// 添加 JWT 解码函数
const parseJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`
    }).join(''))
    return JSON.parse(jsonPayload)
  }
  catch (error) {
    console.error('Failed to parse JWT token:', error)
    return null
  }
}

// 获取当前用户ID
export const getCurrentUser = () => {
  const cookies = document.cookie.split(';')
  const cookieKey = 'auth_token' // 使用您定义的 TOKEN_KEY
  const authTokenCookie = cookies.find(cookie => cookie.trim().startsWith(`${cookieKey}=`))

  if (!authTokenCookie) {
    // console.log('getCurrentUser: auth_token cookie not found.'); // 按需保留或移除日志
    return null // Cookie 不存在，返回 null
  }

  // 安全地提取 token 值
  const token = authTokenCookie.split('=')[1]?.trim()
  if (!token) {
    // console.log('getCurrentUser: Token value is empty after splitting cookie.'); // 按需保留或移除日志
    return null // Cookie 存在但值为空
  }
  // console.log('getCurrentUser: Token value======:', token); // 按需保留或移除日志

  const decoded = parseJwt(token)
  // console.log('getCurrentUser: Decoded JWT payload:', decoded); // 按需保留或移除日志

  // 检查解码后的 payload 以及是否存在 user_id (对应 Account Token)
  if (decoded && decoded.user_id) {
    // console.log('getCurrentUser: Decoded Console/Account token payload:', decoded); // 按需保留或移除日志
    return {
      // 返回一个统一的结构，方便调用方使用
      // 注意：这里返回的是 Account ID
      type: 'account', // 可以加个类型区分
      userId: decoded.user_id,
    }
  }
  else {
    // console.log('getCurrentUser: Failed to decode token or find relevant user ID.', decoded); // 按需保留或移除日志
    return null // 解码失败或未找到需要的 ID
  }
}

export const sendChatMessage = async (body: Record<string, any>, { onData, onCompleted, onThought, onFile, onError, getAbortController, onMessageEnd, onMessageReplace, onTTSChunk, onTTSEnd }: {
  onData: IOnData
  onCompleted: IOnCompleted
  onFile: IOnFile
  onThought: IOnThought
  onError: IOnError
  onMessageEnd?: IOnMessageEnd
  onMessageReplace?: IOnMessageReplace
  getAbortController?: (abortController: AbortController) => void
  onTTSChunk?: IOnTTSChunk
  onTTSEnd?: IOnTTSEnd
}, isInstalledApp: boolean, installedAppId = '') => {
  return ssePost(getUrl('chat-messages', isInstalledApp, installedAppId), {
    body: {
      ...body,
      response_mode: 'streaming',
    },
  }, { onData, onCompleted, onThought, onFile, isPublicAPI: !isInstalledApp, onError, getAbortController, onMessageEnd, onMessageReplace, onTTSChunk, onTTSEnd })
}

export const stopChatMessageResponding = async (appId: string, taskId: string, isInstalledApp: boolean, installedAppId = '') => {
  return getAction('post', isInstalledApp)(getUrl(`chat-messages/${taskId}/stop`, isInstalledApp, installedAppId))
}

export const sendCompletionMessage = async (body: Record<string, any>, { onData, onCompleted, onError, onMessageReplace }: {
  onData: IOnData
  onCompleted: IOnCompleted
  onError: IOnError
  onMessageReplace: IOnMessageReplace
}, isInstalledApp: boolean, installedAppId = '') => {
  return ssePost(getUrl('completion-messages', isInstalledApp, installedAppId), {
    body: {
      ...body,
      response_mode: 'streaming',
    },
  }, { onData, onCompleted, isPublicAPI: !isInstalledApp, onError, onMessageReplace })
}

export const sendWorkflowMessage = async (
  body: Record<string, any>,
  {
    onWorkflowStarted,
    onNodeStarted,
    onNodeFinished,
    onWorkflowFinished,
    onIterationStart,
    onIterationNext,
    onIterationFinish,
    onTextChunk,
    onTextReplace,
  }: {
    onWorkflowStarted: IOnWorkflowStarted
    onNodeStarted: IOnNodeStarted
    onNodeFinished: IOnNodeFinished
    onWorkflowFinished: IOnWorkflowFinished
    onIterationStart: IOnIterationStarted
    onIterationNext: IOnIterationNext
    onIterationFinish: IOnIterationFinished
    onTextChunk: IOnTextChunk
    onTextReplace: IOnTextReplace
  },
  isInstalledApp: boolean,
  installedAppId = '',
) => {
  return ssePost(getUrl('workflows/run', isInstalledApp, installedAppId), {
    body: {
      ...body,
      response_mode: 'streaming',
    },
  }, { onNodeStarted, onWorkflowStarted, onWorkflowFinished, isPublicAPI: !isInstalledApp, onNodeFinished, onIterationStart, onIterationNext, onIterationFinish, onTextChunk, onTextReplace })
}

export const fetchAppInfo = async () => {
  return get('/site') as Promise<AppData>
}

export const fetchConversations = async (isInstalledApp: boolean, installedAppId = '', last_id?: string, pinned?: boolean, limit?: number) => {
  return getAction('get', isInstalledApp)(getUrl('conversations', isInstalledApp, installedAppId), { params: { ...{ limit: limit || 20 }, ...(last_id ? { last_id } : {}), ...(pinned !== undefined ? { pinned } : {}) } }) as Promise<AppConversationData>
}

export const pinConversation = async (isInstalledApp: boolean, installedAppId = '', id: string) => {
  return getAction('patch', isInstalledApp)(getUrl(`conversations/${id}/pin`, isInstalledApp, installedAppId))
}

export const unpinConversation = async (isInstalledApp: boolean, installedAppId = '', id: string) => {
  return getAction('patch', isInstalledApp)(getUrl(`conversations/${id}/unpin`, isInstalledApp, installedAppId))
}

export const delConversation = async (isInstalledApp: boolean, installedAppId = '', id: string) => {
  return getAction('del', isInstalledApp)(getUrl(`conversations/${id}`, isInstalledApp, installedAppId))
}

export const renameConversation = async (isInstalledApp: boolean, installedAppId = '', id: string, name: string) => {
  return getAction('post', isInstalledApp)(getUrl(`conversations/${id}/name`, isInstalledApp, installedAppId), { body: { name } })
}

export const generationConversationName = async (isInstalledApp: boolean, installedAppId = '', id: string) => {
  return getAction('post', isInstalledApp)(getUrl(`conversations/${id}/name`, isInstalledApp, installedAppId), { body: { auto_generate: true } }) as Promise<ConversationItem>
}

export const fetchChatList = async (conversationId: string, isInstalledApp: boolean, installedAppId = '') => {
  return getAction('get', isInstalledApp)(getUrl('messages', isInstalledApp, installedAppId), { params: { conversation_id: conversationId, limit: 20, last_id: '' } }) as any
}

// Abandoned API interface
// export const fetchAppVariables = async () => {
//   return get(`variables`)
// }

// init value. wait for server update
export const fetchAppParams = async (isInstalledApp: boolean, installedAppId = '') => {
  return (getAction('get', isInstalledApp))(getUrl('parameters', isInstalledApp, installedAppId)) as Promise<ChatConfig>
}

export const fetchSystemFeatures = async () => {
  return (getAction('get', false))(getUrl('system-features', false, '')) as Promise<SystemFeatures>
}

export const fetchWebSAMLSSOUrl = async (appCode: string, redirectUrl: string) => {
  return (getAction('get', false))(getUrl('/enterprise/sso/saml/login', false, ''), {
    params: {
      app_code: appCode,
      redirect_url: redirectUrl,
    },
  }) as Promise<{ url: string }>
}

export const fetchWebOIDCSSOUrl = async (appCode: string, redirectUrl: string) => {
  return (getAction('get', false))(getUrl('/enterprise/sso/oidc/login', false, ''), {
    params: {
      app_code: appCode,
      redirect_url: redirectUrl,
    },

  }) as Promise<{ url: string }>
}

export const fetchWebOAuth2SSOUrl = async (appCode: string, redirectUrl: string) => {
  return (getAction('get', false))(getUrl('/enterprise/sso/oauth2/login', false, ''), {
    params: {
      app_code: appCode,
      redirect_url: redirectUrl,
    },
  }) as Promise<{ url: string }>
}

export const fetchAppMeta = async (isInstalledApp: boolean, installedAppId = '') => {
  return (getAction('get', isInstalledApp))(getUrl('meta', isInstalledApp, installedAppId)) as Promise<AppMeta>
}

export const updateFeedback = async ({ url, body }: { url: string; body: FeedbackType }, isInstalledApp: boolean, installedAppId = '') => {
  return (getAction('post', isInstalledApp))(getUrl(url, isInstalledApp, installedAppId), { body })
}

export const fetchMoreLikeThis = async (messageId: string, isInstalledApp: boolean, installedAppId = '') => {
  return (getAction('get', isInstalledApp))(getUrl(`/messages/${messageId}/more-like-this`, isInstalledApp, installedAppId), {
    params: {
      response_mode: 'blocking',
    },
  })
}

export const saveMessage = (messageId: string, isInstalledApp: boolean, installedAppId = '') => {
  return (getAction('post', isInstalledApp))(getUrl('/saved-messages', isInstalledApp, installedAppId), { body: { message_id: messageId } })
}

export const fetchSavedMessage = async (isInstalledApp: boolean, installedAppId = '') => {
  return (getAction('get', isInstalledApp))(getUrl('/saved-messages', isInstalledApp, installedAppId))
}

export const removeMessage = (messageId: string, isInstalledApp: boolean, installedAppId = '') => {
  return (getAction('del', isInstalledApp))(getUrl(`/saved-messages/${messageId}`, isInstalledApp, installedAppId))
}

export const fetchSuggestedQuestions = (messageId: string, isInstalledApp: boolean, installedAppId = '') => {
  return (getAction('get', isInstalledApp))(getUrl(`/messages/${messageId}/suggested-questions`, isInstalledApp, installedAppId))
}

export const audioToText = (url: string, isPublicAPI: boolean, body: FormData) => {
  return (getAction('post', !isPublicAPI))(url, { body }, { bodyStringify: false, deleteContentType: true }) as Promise<{ text: string }>
}

export const textToAudio = (url: string, isPublicAPI: boolean, body: FormData) => {
  return (getAction('post', !isPublicAPI))(url, { body }, { bodyStringify: false, deleteContentType: true }) as Promise<{ data: string }>
}

export const textToAudioStream = (url: string, isPublicAPI: boolean, header: { content_type: string }, body: { streaming: boolean; voice?: string; message_id?: string; text?: string | null | undefined }) => {
  return (getAction('post', !isPublicAPI))(url, { body, header }, { needAllResponseContent: true })
}

export const fetchAccessToken = async (appCode: string) => {
  const headers = new Headers()
  const currentUserInfo = getCurrentUser()
  // console.log('fetchAccessToken: currentUserInfo:', currentUserInfo.userId); // 调试日志
  if (currentUserInfo)
    headers.append('X-User-Id', currentUserInfo.userId)

  headers.append('X-App-Code', appCode)
  // headers.append('X-User-Id', 'test-user-id')
  // console.log('fetchAccessToken: headers:', headers); // 调试日志
  return get('/passport', { headers }) as Promise<{ access_token: string }>
}
