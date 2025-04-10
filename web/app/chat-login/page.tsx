'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { TOKEN_KEY } from '@/service/external-auth'
import Toast from '@/app/components/base/toast'
import cn from '@/utils/classnames'
import Button from '@/app/components/base/button'
import type { RegistrationData } from '@/app/service/base'
import { login, registerUser } from '@/app/service/base'

const ChatLogin = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/chat'

  // Extract chat_id from redirect URL if available
  const getChatIdFromRedirect = () => {
    try {
      // Check if redirectUrl contains '/chat/'
      if (redirectUrl.includes('/chat/')) {
        // Extract the part after '/chat/'
        const parts = redirectUrl.split('/chat/')
        if (parts.length > 1)
          return parts[1].split('/')[0] // Get the first segment after /chat/
      }
      return '' // Return empty string if no chat_id found
    }
    catch (error) {
      console.error('Error extracting chat_id:', error)
      return ''
    }
  }
  // 定义颜色常量
  const colors = {
    primary: '#26A69A',
    primaryDark: '#408d86',
    text: '#263339',
    textLight: '#728f9e',
    bg: '#FFFFFF',
    bgLight: '#f0f4f8',
  }

  const chat_id = getChatIdFromRedirect()
  const [phone_number, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // 在 ChatLogin.tsx 中

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!phone_number || !password) {
      Toast.notify({ type: 'error', message: '请输入手机号和密码' })
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // --- 第一步：尝试外部登录 ---
      const loginRes = await login(phone_number, password)
      // console.log('外部登录响应:', loginRes)

      // 检查外部登录是否成功并获取了必要信息
      if (loginRes?.access_token && loginRes?.user) {
        const initialToken = loginRes.access_token // 可以先保存一下，虽然马上会被覆盖
        const user = loginRes.user

        // 注意：这里可以暂时不写入 localStorage，或者写入后准备被覆盖
        // localStorage.setItem(TOKEN_KEY, initialToken); // 临时写入或省略
        // localStorage.setItem('user', JSON.stringify(user)); // 用户信息通常可以先写入

        // --- 第二步：尝试在本系统注册并自动登录 ---
        // console.log('外部登录成功，尝试在本系统注册/登录...')
        try {
          // 准备注册数据
          const registrationPayload: RegistrationData = {
            email: `${phone_number}@mengyimengsao.com`,
            name: user.username || `User_${phone_number}`,
            password: 'myms123456', // !!! 再次提醒：密码安全问题 !!!
            interface_language: 'zh-CN',
          }

          // 调用并等待注册/登录完成，获取包含新 token 的响应数据
          const registerResult = await registerUser(registrationPayload)
          // console.log('注册/自动登录成功，响应:', registerResult)

          // --- 处理注册/登录结果，写入新 Token ---
          // 检查后端返回结果是否成功，并且包含 data 和 access_token
          if (registerResult?.result === 'success' && registerResult?.data?.access_token) {
            const newAccessToken = registerResult.data.access_token
            const newRefreshToken = registerResult.data.refresh_token // 获取 refresh token

            // console.log('注册/登录接口返回了新的凭证，更新 localStorage...')
            // ******** 1. 写入/覆盖 localStorage ********
            localStorage.setItem(TOKEN_KEY, newAccessToken)

            // ******** 2. 新增：写入 Cookie ********
            const cookieKey = TOKEN_KEY // 确保使用与 localStorage 和中间件相同的键名
            const maxAgeInSeconds = 86400 // 设置 Cookie 有效期为 1 天 (24 * 60 * 60 秒)
            // 你可以根据需要调整有效期，例如设置为会话 Cookie (不设置 max-age 或 expires) 或更长时间

            // 构建 Cookie 字符串
            // path=/ 表示 Cookie 对整个网站有效
            // SameSite=Lax 是一个推荐的安全设置
            // 注意: document.cookie 不能设置 HttpOnly 标志，这是为了安全，防止脚本读取敏感 cookie
            // 注意: 如果你的网站部署在 HTTPS 上，强烈建议添加 'Secure' 标志: `${cookieKey}=${newAccessToken}; path=/; max-age=${maxAgeInSeconds}; SameSite=Lax; Secure`
            const cookieString = `${cookieKey}=${newAccessToken}; path=/; max-age=${maxAgeInSeconds}; SameSite=Lax`

            document.cookie = cookieString
            // console.log(`Token 已写入 Cookie: ${cookieKey}=...`)

            // ******** (可选) 存储 refresh token ********
            // 注意：将 refresh token 存储在 localStorage 有安全风险，更好的做法是存储在 httpOnly cookie 中由服务器管理
            // 但如果确实需要前端存储，可以这样做：
            // localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken); // 需要定义 REFRESH_TOKEN_KEY

            // 如果注册接口也更新了用户信息，可以在这里更新 'user'
            // if (registerResult.data.user) { localStorage.setItem('user', JSON.stringify(registerResult.data.user)); }
            // 否则，使用初始登录时获取的 user 信息通常是OK的
          }
          else {
            // 虽然 registerUser 调用没抛错，但后端返回的不是成功状态或缺少 token
            console.error('注册/登录响应无效或未包含 token:', registerResult)
            // 根据业务逻辑决定如何处理，可能需要抛出错误阻止后续流程
            throw new Error('注册/登录后未能获取有效的用户凭证。')
          }
        }
        catch (error) {
          // 捕获 registerUser 函数抛出的错误 (网络错误或后端返回错误状态)
          console.error('自动注册/登录用户失败:', error)
          // 向用户显示错误，并可能需要阻止跳转
          const errorMessage = error instanceof Error ? error.message : '未知错误'
          Toast.notify({
            type: 'error',
            message: `操作失败: ${errorMessage}`,
          })
          // 抛出错误或 return，以阻止后续的成功提示和跳转
          throw error
        }

        // --- 如果所有步骤都成功 ---
        Toast.notify({ type: 'success', message: '登录成功' })
        // console.log('登录并创建用户成功，即将跳转到:', redirectUrl)
        router.push(redirectUrl)
      }
      else {
        // 外部登录失败
        console.error('外部登录失败：响应中缺少 access_token 或 user 信息')
        Toast.notify({ type: 'error', message: '外部登录失败：无效的响应' })
      }
    }
    catch (err) {
      // 捕获外部登录 (login 函数) 或 注册/登录 (registerUser) 抛出的错误
      console.error('登录流程中发生错误:', err)
      // 确保不显示成功的 Toast
      // Toast.notify({ type: 'error', message: `登录失败: ${err.message}` }); // Toast 消息已在各自的 catch 块中处理
    }
    finally {
      setIsLoading(false)
    }
  }

  // Check if user is already logged in
  useEffect(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token)
        router.push(redirectUrl)
    }
    catch (error) {
      // Handle case where localStorage is not available (e.g., SSR)
      console.error('Error checking authentication:', error)
    }
  }, [redirectUrl, router])

  return (
    <div
      className={cn('flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 relative overflow-hidden')}
      style={{
        background: `linear-gradient(120deg, ${colors.bgLight} 0%, #E0F2F1 50%, #D0EBEA 100%)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: `radial-gradient(circle at 30% 50%, ${colors.primary}1a 0%, transparent 25%),
                      radial-gradient(circle at 70% 20%, ${colors.primary}1a 0%, transparent 25%),
                      radial-gradient(circle at 20% 80%, ${colors.primary}0d 0%, transparent 35%),
                      radial-gradient(circle at 80% 70%, ${colors.primary}0d 0%, transparent 35%)`,
          animation: 'pulse 8s ease-in-out infinite',
        }}
      />
      <style jsx global>{`
        @keyframes pulse {
          0% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.05);
          }
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
        }
      `}</style>
      <div className={cn('sm:mx-auto sm:w-full sm:max-w-sm relative z-10')}>
        <div className="flex flex-col items-center">
          <Image
            src="/logo/logo-site.png"
            alt="萌姨萌嫂智能助手"
            width={120}
            height={120}
            priority
            className="mb-4"
          />
          <h2 className={cn('text-center text-2xl font-bold leading-9 tracking-tight')} style={{ color: colors.text }}>
            萌姨萌嫂智能助手
          </h2>
        </div>
      </div>

      <div
        className={cn('mt-10 sm:mx-auto sm:w-full sm:max-w-sm p-8 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px]')}
        style={{
          background: `linear-gradient(to bottom right, ${colors.bg}, rgba(255,255,255,0.9))`,
          backdropFilter: 'blur(10px)',
          boxShadow: `0 8px 32px -2px rgba(0, 0, 0, 0.1), 0 0 1px 0 rgba(0, 0, 0, 0.1), 0 0 16px 0 ${colors.primary}1a`,
        }}
      >
        <form className={cn('space-y-6')} onSubmit={handleLogin}>
          <div>
            <label htmlFor="phone_number" className={cn('block text-sm font-medium leading-6')} style={{ color: colors.text }}>
              手机号
            </label>
            <div className={cn('mt-2')}>
              <input
                id="phone_number"
                name="phone_number"
                type="text"
                required
                value={phone_number}
                onChange={e => setPhoneNumber(e.target.value)}
                className={cn(
                  'block w-full rounded-md border py-2 px-3 shadow-sm sm:text-sm sm:leading-6',
                  'focus:outline-none focus:border-2 transition-all duration-200',
                )}
                style={{
                  color: colors.text,
                  borderColor: colors.primary,
                }}
              />
            </div>
          </div>

          <div>
            <div className={cn('flex items-center justify-between')}>
              <label htmlFor="password" className={cn('block text-sm font-medium leading-6')} style={{ color: colors.text }}>
                密码
              </label>
            </div>
            <div className={cn('mt-2')}>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={cn(
                  'block w-full rounded-md border py-2 px-3 shadow-sm sm:text-sm sm:leading-6',
                  'focus:outline-none focus:border-2 transition-all duration-200',
                )}
                style={{
                  color: colors.text,
                  borderColor: colors.primary,
                }}
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              className={cn('w-full hover:!bg-[#408d86]')}
            >
              {isLoading ? '正在登录...' : '登录'}
            </Button>
          </div>
        </form>

        {redirectUrl !== '/chat' && (
          <div className={cn('mt-4 text-center')}>
            <p className={cn('text-sm')} style={{ color: colors.textLight }}>
              You will be redirected to your original destination after login.
            </p>
          </div>
        )}

        {chat_id && (
          <div className={cn('mt-4 text-sm')} style={{ color: colors.textLight }}>
            Logging in for chat: {chat_id}
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatLogin
