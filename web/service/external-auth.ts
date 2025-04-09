import { ExternalAuthAdapter } from './api-adapters/external-auth-adapter'

export type LoginCredentials = {
  phone_number: string
  password: string
  chat_id: string
}

export type LoginResponse = {
  success: boolean
  access_token?: string
  token?: string
  user?: {
    id: string
    role?: string
    username?: string
    name?: string
    email?: string
  }
  error?: string
  message?: string
}

// 统一使用的token键名 - 必须与middleware.ts中使用的键名一致
// export const TOKEN_KEY = 'console_token';
export const TOKEN_KEY = 'auth_token'
export const USER_INFO_KEY = 'user_info'

/**
 * Authenticate user with external business system
 * @param credentials User credentials (phone_number, password, and chat_id)
 * @returns Login response with token and user information
 */
export const loginWithExternalSystem = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    console.log('Authenticating with external system:', credentials.phone_number)

    // Use the adapter to handle the authentication process
    const result = await ExternalAuthAdapter.authenticate(credentials)

    console.log('Authentication result:', result)

    // Standardize the response
    const standardizedResult = {
      success: !!result.access_token,
      token: result.access_token || '',
      user: result.user || { id: '', name: '', email: '' },
      message: result.error || result.message || (result.access_token ? 'Authentication successful' : 'Authentication failed'),
    }

    // Store the token from the external system
    if (standardizedResult.success && standardizedResult.token) {
      console.log('Storing token in localStorage and cookie')

      // 存储到localStorage (用于客户端检查)
      localStorage.setItem(TOKEN_KEY, standardizedResult.token)
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(standardizedResult.user))

      // 同时存储到cookie (用于服务器端middleware检查)
      document.cookie = `${TOKEN_KEY}=${standardizedResult.token}; path=/; max-age=86400; SameSite=Lax`

      console.log('Token stored successfully')
    }
    else {
      console.log('Authentication failed or no token received')
    }

    return standardizedResult
  }
  catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

/**
 * Check if user is authenticated
 * @returns Boolean indicating if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  try {
    // 检查localStorage中的token
    console.log('Checking authentication...')
    const token = localStorage.getItem(TOKEN_KEY)
    console.log('Token:', token)
    // 如果localStorage中没有token，尝试从cookie中获取
    if (!token) {
      const cookies = document.cookie.split(';')
      const tokenCookie = cookies.find(cookie => cookie.trim().startsWith(`${TOKEN_KEY}=`))
      if (tokenCookie) {
        const cookieToken = tokenCookie.split('=')[1]
        // 如果找到了cookie中的token，同步到localStorage
        if (cookieToken) {
          localStorage.setItem(TOKEN_KEY, cookieToken)
          return true
        }
      }
      return false
    }

    console.log('Authentication check: token exists')
    return true
  }
  catch (error) {
    console.error('Error checking authentication:', error)
    return false
  }
}

/**
 * Logout user
 */
export const logout = (): void => {
  try {
    // 清除localStorage中的token
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_INFO_KEY)

    // 清除cookie中的token
    document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`

    console.log('User logged out, redirecting to login page')
    // Redirect to login page after logout
    window.location.href = '/chat-login'
  }
  catch (error) {
    console.error('Error during logout:', error)
    // 即使出错也尝试重定向
    window.location.href = '/chat-login'
  }
}
