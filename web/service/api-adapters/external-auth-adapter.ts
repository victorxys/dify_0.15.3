import { externalAuthConfig } from '@/config/external-auth-config'
import type { LoginCredentials, LoginResponse } from '@/service/external-auth'

/**
 * External Authentication API Adapter
 *
 * This adapter handles the communication with the external business system's authentication API.
 * It transforms requests and responses between the application and the external API.
 */
export class ExternalAuthAdapter {
  /**
   * Authenticate user with the external business system
   * @param credentials User credentials (phone_number, password, and chat_id)
   * @returns Standardized login response
   */
  static async authenticate(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // For development/testing: Use mock authentication if in development mode
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_AUTH === 'true') {
        console.log('Using mock authentication')
        return this.mockAuthenticate(credentials)
      }

      // Transform request payload to match external API requirements
      const payload = this.transformRequest(credentials)

      // Make request to external API
      const response = await fetch(externalAuthConfig.apiUrl, {
        method: 'POST',
        headers: externalAuthConfig.headers,
        body: JSON.stringify(payload),
        credentials: externalAuthConfig.withCredentials ? 'include' : 'same-origin',
        signal: AbortSignal.timeout(externalAuthConfig.timeout),
      })

      // Handle response
      const data = await response.json()

      if (!response.ok) {
        console.error('Authentication failed:', data)
        return {
          success: false,
          error: data.error || 'Authentication failed',
        }
      }

      // Transform response to standardized format
      return this.transformResponse(data)
    }
    catch (error) {
      console.error('External authentication error:', error)
      return {
        success: false,
        token: '',
        user: { id: '', name: '', email: '' },
        message: error instanceof Error ? error.message : 'Authentication failed',
      }
    }
  }

  /**
   * Mock authentication for development/testing
   * @param credentials User credentials
   * @returns Standardized login response
   */
  private static mockAuthenticate(credentials: LoginCredentials): LoginResponse {
    console.log('Mock authentication with credentials:', credentials)

    // Simple mock authentication - accept any phone_number/password combination
    // In a real scenario, you would validate against a predefined list or database
    if (credentials.phone_number && credentials.password) {
      // For testing, you can set specific test accounts
      if (credentials.phone_number === '13800138000' && credentials.password === 'test') {
        console.log('Test account login successful')
        return {
          success: true,
          access_token: `mock-token-${Math.random().toString(36).substring(2)}`,
          user: {
            id: '1',
            role: 'admin',
            username: 'test',
          },
          message: 'Authentication successful',
        }
      }

      // For demo purposes, accept any non-empty credentials
      console.log('Generic account login successful')
      return {
        success: true,
        access_token: `mock-token-${Math.random().toString(36).substring(2)}`,
        user: {
          id: '2',
          role: 'user',
          username: credentials.phone_number,
        },
        message: 'Authentication successful',
      }
    }

    // Return error for empty credentials
    console.log('Authentication failed: Empty credentials')
    return {
      success: false,
      error: '用户名或密码错误,初始密码是"身份证后6位"',
    }
  }

  /**
   * Transform request payload to match external API requirements
   * @param credentials User credentials
   * @returns Transformed request payload
   */
  private static transformRequest(credentials: LoginCredentials): Record<string, any> {
    // Map our application's field names to the external API's field names
    return {
      phone_number: credentials.phone_number,
      password: credentials.password,
      chat_id: credentials.chat_id,
    }
  }

  /**
   * Transform response from external API to standardized format
   * @param data Response data from external API
   * @returns Standardized login response
   */
  private static transformResponse(data: any): LoginResponse {
    // Check if response contains an error
    if (data.error) {
      return {
        success: false,
        error: data.error,
      }
    }

    // Transform successful response
    return {
      success: true,
      access_token: data.access_token,
      user: data.user || { id: '', name: '', email: '' },
    }
  }
}
