'use client'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useRouter } from 'next/navigation'

import type { SubmitHandler } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Loading from '../components/base/loading'
import classNames from '@/utils/classnames'
import Button from '@/app/components/base/button'

import { fetchInitValidateStatus, fetchSetupStatus, setup } from '@/service/common'
import type { InitValidateStatusResponse, SetupStatusResponse } from '@/models/common'

const validPassword = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/

// 使用 z.object 定义表单的 schema (数据结构和验证规则)
const accountFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'login.error.emailInValid' }) // 至少1个字符，错误消息使用 i18n key
    .email('login.error.emailInValid'), // 必须是有效的 email 格式
  name: z.string().min(1, { message: 'login.error.nameEmpty' }), // 至少1个字符
  password: z.string().min(8, {
    message: 'login.error.passwordLengthInValid', // 密码最小长度为8
  }).regex(validPassword, 'login.error.passwordInvalid'), // 使用正则表达式验证密码强度
})

// 从 schema 推断出表单数据的 TypeScript 类型
type AccountFormValues = z.infer<typeof accountFormSchema>

const InstallForm = () => {
  const { t } = useTranslation() // 获取翻译函数
  const router = useRouter() // 获取 Next.js 路由器
  const [showPassword, setShowPassword] = React.useState(false) // 控制密码可见性
  const [loading, setLoading] = React.useState(true) // 加载状态

  // 使用 react-hook-form 管理表单
  const {
    register, // 用于注册表单字段，使其受 react-hook-form 控制
    handleSubmit, // 用于处理表单提交的函数
    formState: { errors }, // 包含表单验证错误的对象
  } = useForm<AccountFormValues>({ // 指定表单数据类型
    resolver: zodResolver(accountFormSchema), // 使用 zodResolver 连接 zod schema 和 react-hook-form
    defaultValues: { // 设置表单字段的默认值
      name: '',
      password: '',
      email: '',
    },
  })

  // 表单提交处理函数
  const onSubmit: SubmitHandler<AccountFormValues> = async (data) => {
    // 调用 setup API (假设你已经在 '@/service/common' 中定义了这个函数)
    await setup({
      body: {
        ...data, // 将表单数据作为请求体
      },
    })
    router.push('/signin') // 提交成功后，重定向到 /signin 页面
  }

  // 另一种提交方式。这个handleSetting函数和上面的onSubmit函数作用一样。
  // 因为你的代码里同时出现了两种提交方式，为了避免混淆，保留其中一种就可以。这里保留了onSubmit。
  // const handleSetting = async () => {
  //   handleSubmit(onSubmit)()
  // }

  useEffect(() => {
    // 检查安装状态
    fetchSetupStatus().then((res: SetupStatusResponse) => {
      if (res.step === 'finished') {
        // 如果已经安装完成，将 setup_status 存入 localStorage
        localStorage.setItem('setup_status', 'finished')
        window.location.href = '/signin' // 重定向到 /signin
      }
      else {
        // 如果尚未完成安装，检查初始化验证状态
        fetchInitValidateStatus().then((res: InitValidateStatusResponse) => {
          if (res.status === 'not_started')
            window.location.href = '/init' // 如果初始化未开始，重定向到 /init
        })
      }
      setLoading(false) // 设置加载状态为 false
    })
  }, [])

  return (
    loading
      ? <Loading /> // 显示加载组件
      : ( // 使用括号包裹，修正三元表达式的错误
        <> {/* 使用片段包裹所有内容，修正 JSX 错误 */}
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h2 className="text-[32px] font-bold text-gray-900">{t('login.setAdminAccount')}</h2>
            {/* 使用正确的字符串拼接方式 */}
            <p className='mt-1 text-sm text-gray-600'>
              {t('login.setAdminAccountDesc')}
            </p>
          </div>
          <div className="grow mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white ">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className='mb-5'>
                  <label htmlFor="email" className="my-2 flex items-center justify-between text-sm font-medium text-gray-900">
                    {t('login.email')}
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('email')} // 注册 email 字段
                      placeholder={t('login.emailPlaceholder') || ''}
                      className={'appearance-none block w-full rounded-lg pl-[14px] px-3 py-2 border border-gray-200 hover:border-gray-300 hover:shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 caret-primary-600 sm:text-sm'}
                    />
                    {/* 显示 email 字段的错误信息 */}
                    {errors.email && <span className='text-red-400 text-sm'>{t(`${errors.email?.message}`)}</span>}
                  </div>
                </div>

                <div className='mb-5'>
                  <label htmlFor="name" className="my-2 flex items-center justify-between text-sm font-medium text-gray-900">
                    {t('login.name')}
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      {...register('name')} // 注册 name 字段
                      placeholder={t('login.namePlaceholder') || ''}
                      className={'appearance-none block w-full rounded-lg pl-[14px] px-3 py-2 border border-gray-200 hover:border-gray-300 hover:shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 caret-primary-600 sm:text-sm pr-10'}
                    />
                  </div>
                  {/* 显示 name 字段的错误信息 */}
                  {errors.name && <span className='text-red-400 text-sm'>{t(`${errors.name.message}`)}</span>}
                </div>

                <div className='mb-5'>
                  <label htmlFor="password" className="my-2 flex items-center justify-between text-sm font-medium text-gray-900">
                    {t('login.password')}
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      {...register('password')} // 注册 password 字段
                      type={showPassword ? 'text' : 'password'} // 根据 showPassword 切换输入类型
                      placeholder={t('login.passwordPlaceholder') || ''}
                      className={'appearance-none block w-full rounded-lg pl-[14px] px-3 py-2 border border-gray-200 hover:border-gray-300 hover:shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 caret-primary-600 sm:text-sm pr-10'}
                    />

                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <button
                        type="button" // 添加 type="button"，防止 button 在 form 内触发 submit
                        onClick={() => setShowPassword(!showPassword)} // 切换密码可见性
                        className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500"
                      >
                        {/* 切换显示密码/隐藏密码的图标 */}
                        {showPassword ? '👀' : '😝'}
                      </button>
                    </div>
                  </div>
                  {/* 显示密码格式错误信息 */}
                  <div className={classNames('mt-1 text-xs text-gray-500', {
                    'text-red-400 !text-sm': errors.password,
                  })}>{t('login.error.passwordInvalid')}</div>
                </div>

                <div>
                  {/* 使用 Button 组件 */}
                  <Button variant='primary' className='w-full' onClick={handleSubmit(onSubmit)}>
                    {t('login.installBtn')}
                  </Button>
                </div>
              </form>
              {/* 暂时注销，以后可以改为“隐私协议等" */}
              {/* <div className="block w-full mt-2 text-xs text-gray-600">
                {t('login.license.tip')}
                &nbsp;
                <Link
                  className='text-primary-600'
                  target='_blank' rel='noopener noreferrer'
                  href={'https://docs.dify.ai/user-agreement/open-source'}
                >{t('login.license.link')}</Link>
              </div> */}
            </div>
          </div>
        </>
      )
  )
}

export default InstallForm
