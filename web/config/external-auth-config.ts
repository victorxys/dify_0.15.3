/**
 * Configuration for external authentication system
 * Update these values to match your business system's API
 */
export const externalAuthConfig = {
  // API endpoint for authentication
  apiUrl: 'https://hr.mengyimengsao.com/api/auth/login',

  // API Key for authentication
  apiKey: 'api_key_123',

  // Client credentials for OAuth2 authentication (if required)
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',

  // Additional headers required by the external API
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'api_key_123',
    // Add any other required headers
  },

  // Request timeout in milliseconds
  timeout: 10000,

  // Whether to use credentials (cookies, HTTP authentication) in requests
  withCredentials: false, // Changed to false for testing

  // Field names in the request payload (adjust if your API uses different field names)
  fieldNames: {
    phone_number: 'phone_number',
    password: 'password',
  },

  // Response field names (adjust if your API returns different field names)
  responseFields: {
    token: 'token',
    user: 'user',
    success: 'success',
    message: 'message',
  },
}
