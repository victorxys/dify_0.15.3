import { externalAuthConfig } from '@/config/external-auth-config'
import { apiPrefix } from '@/config'

// const apiPrefix = process.env.NEXT_PUBLIC_API_PREFIX

const basePost = async (url: string, data: any) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: externalAuthConfig.headers,
    body: JSON.stringify(data),
    credentials: externalAuthConfig.withCredentials ? 'include' : 'omit',
    // 如果需要设置超时，可能需要在这里使用 AbortController
  })

  // 检查非 2xx 状态码
  if (!response.ok) {
    let errorBody = null
    // *** 第 1 步：尝试读取错误响应体（假设服务器返回的是 JSON） ***
    // 检查 Content-Type 头部，确保它是 JSON
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      try {
        // 读取响应体是异步操作，需要 await
        errorBody = await response.json()
        //  console.error('basePost：服务器返回的错误响应体:', errorBody); // 打印一下看看内容，方便调试
      }
      catch (parseError) {
        //  console.error("basePost：尝试解析错误响应体为 JSON 失败:", parseError);
        // 如果解析失败，errorBody 保持为 null 或之前的默认值
        throw new Error('尝试解析错误响应体为 JSON 失败')
      }
    }
    else {
      // 如果不是 JSON 类型，可能需要根据实际情况处理，例如读取为文本或者忽略
      // console.warn("basePost：错误响应的 Content-Type 不是 JSON:", contentType, response.status, response.statusText);
      // 可选：如果需要读取文本内容，可以使用 await response.text();
      try {
        const errorText = await response.text()
        console.warn('错误响应文本:', errorText)
      }
      catch (e) {
        console.error('basePost：尝试读取错误响应文本失败:', e)
      }
    }

    const apiError: any = new Error(`HTTP error! status: ${response.status}`)

    apiError.status = response.status

    apiError.body = errorBody
    throw apiError // 抛出这个包含了更多信息的 Error 对象
  }

  // 如果 response.ok 为 true (状态码是 2xx)，则读取并返回成功响应体
  // 假设成功响应也是 JSON 格式
  try {
    const successBody = await response.json()
    return successBody
  }
  catch (parseError) {
    // console.error("basePost：尝试解析成功响应体为 JSON 失败:", parseError);
    // 如果成功了但响应体解析失败，也需要处理，例如抛出新的错误
    throw new Error('成功响应的格式不正确。')
  }
}

export const login = async (phone_number: string, password: string) => {
  const payload = {
    [externalAuthConfig.fieldNames.phone_number]: phone_number,
    [externalAuthConfig.fieldNames.password]: password,
  }

  return await basePost(externalAuthConfig.apiUrl, payload)
}

export type RegistrationData = {
  email: string
  name: string
  password: string
  interface_language?: string // 可选属性，表示用户界面语言
}

export async function registerUser(registrationData: RegistrationData): Promise<any> {
  // 检查 apiPrefix 是否已定义
  if (!apiPrefix) {
    console.log('NEXT_PUBLIC_API_PREFIX', apiPrefix)
    console.error('API 前缀未定义 (NEXT_PUBLIC_API_PREFIX)')
    throw new Error('客户端配置错误：API 前缀未设置。')
  }

  const apiUrl = `${apiPrefix}/register`
  // console.log(`向 ${apiUrl} 发送注册请求，数据:`, registrationData) // 调试日志

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json', // 明确表示期望接收 JSON
      },
      body: JSON.stringify(registrationData),
    })

    // --- 处理响应的逻辑 ---
    if (!response.ok) {
      // HTTP 状态码指示失败 (非 2xx)
      let errorPayload: any = { message: `请求失败，状态码: ${response.status}` } // 默认错误信息
      try {
        // 尝试解析后端返回的 JSON 错误体
        // 这很重要，因为后端通常会在错误响应中包含具体原因
        errorPayload = await response.json()
      }
      catch (parseError) {
        // 如果响应体不是有效的 JSON 或为空，则解析失败
        console.warn(`无法解析注册失败的响应体 (状态码: ${response.status})`, parseError)
        // 可以尝试使用 response.statusText 作为备选信息
        // errorPayload.message = response.statusText || errorPayload.message;
      }

      // 抛出一个带有具体错误信息的 Error 对象
      // 使用可选链和空值合并确保即使 errorPayload 结构不符合预期也不会崩溃
      const errorMessage = errorPayload?.error?.message || errorPayload?.message || `HTTP Error ${response.status}`
      throw new Error(errorMessage)
    }

    // --- 请求成功 (HTTP 状态码为 2xx) ---
    // 解析成功的 JSON 响应体
    const data = await response.json()
    console.log('注册成功，响应:', data)
    // 返回后端返回的数据，调用者可以用这些数据做后续处理
    return data
  }
  catch (error) {
    // --- 处理错误的逻辑 ---
    // 这个 catch 块会捕获两种错误：
    // 1. 网络错误 (例如，服务器无法访问，DNS 问题等) - fetch 本身会 reject Promise
    // 2. 上面 `if (!response.ok)` 块中手动 `throw new Error(...)` 抛出的错误

    console.error('注册用户过程中发生错误:', error)

    // 重新抛出错误，这是很重要的，这样调用 registerUser 的地方 (例如 handleLogin 函数)
    // 就能够知道注册操作失败了，并可以进行相应的处理 (比如显示错误提示给用户)
    // 可以选择直接抛出原始错误对象，或者包装一下
    if (error instanceof Error) {
      // 如果已经是 Error 对象，可以直接抛出或添加上下文信息
      throw new TypeError(`注册失败: ${error.message}`)
      // throw error; // 直接抛出原始错误
    }
    else {
      // 如果捕获到的不是 Error 对象 (理论上比较少见)
      throw new TypeError(`发生未知错误: ${String(error)}`)
    }
  }
}
