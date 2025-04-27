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
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [buttonText, setButtonText] = useState('登录') // 新增状态来控制按钮文字
  const [setError] = useState('')

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!phone_number || !password) {
      Toast.notify({ type: 'error', message: '请输入手机号和密码' })
      return
    }

    setIsLoading(true)
    setButtonText('正在登录请稍候...')
    setError('')

    try {
      // --- 第一步：尝试外部登录 ---
      const loginRes = await login(phone_number, password)

      // 检查外部登录是否成功并获取了必要信息
      if (loginRes?.access_token && loginRes?.user) {
        setButtonText('正在跳转到AI助手...') // 更新按钮文字
        // const initialToken = loginRes.access_token
        const user = loginRes.user

        try {
          const registrationPayload: RegistrationData = {
            email: `${phone_number}@mengyimengsao.com`,
            name: user.username || `User_${phone_number}`,
            password: 'myms123456',
            interface_language: 'zh-CN',
          }

          const registerResult = await registerUser(registrationPayload)

          if (registerResult?.result === 'success' && registerResult?.data?.access_token) {
            const newAccessToken = registerResult.data.access_token
            // const newRefreshToken = registerResult.data.refresh_token

            localStorage.setItem(TOKEN_KEY, newAccessToken)

            const cookieKey = TOKEN_KEY
            const maxAgeInSeconds = 86400
            const cookieString = `${cookieKey}=${newAccessToken}; path=/; max-age=${maxAgeInSeconds}; SameSite=Lax`

            document.cookie = cookieString
          }
          else {
            throw new Error('注册/登录后未能获取有效的用户凭证。')
          }
        }
        catch (error) {
          const errorMessage = error instanceof Error ? error.message : '未知错误'
          Toast.notify({
            type: 'error',
            message: `操作失败: ${errorMessage}`,
          })
          throw error
        }

        Toast.notify({ type: 'success', message: '登录成功' })
        setIsRedirecting(true)
        router.push(redirectUrl)
      }
      else {
        Toast.notify({ type: 'error', message: '外部登录失败：无效的响应' })
      }
    }
    catch (err) {
      setIsLoading(false)
      setButtonText('登录') // 重置按钮文字状态

      let errorMessage = '登录失败，请稍后再试。'

      if (err && typeof err === 'object' && err.body && typeof err.body === 'object') {
        if (err.body.error)
          errorMessage = err.body.error
        else
          errorMessage = `服务器返回错误 (状态码: ${err.status})`
      }
      else if (err instanceof Error) {
        errorMessage = err.message || '请求过程中发生错误。'
      }
      else {
        errorMessage = '发生未知错误。'
      }

      Toast.notify({
        type: 'error',
        message: errorMessage,
      })
    }
    finally {
      if (!isRedirecting)
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
              loading={isLoading || isRedirecting}
              disabled={isLoading || isRedirecting}
              className={cn(
                'w-full',
                (isLoading || isRedirecting)
                  ? 'cursor-not-allowed opacity-70 !bg-gray-100'
                  : 'hover:!bg-[#408d86]',
              )}
              style={{
                color: (isLoading || isRedirecting) ? colors.primary : '#fff',
                pointerEvents: (isLoading || isRedirecting) ? 'none' : 'auto',
              }}
            >
              {buttonText}
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
