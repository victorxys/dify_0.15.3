'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ChatWithHistoryWrap from '@/app/components/base/chat/chat-with-history'
import Loading from '@/app/components/base/loading'
import { isAuthenticated } from '@/service/external-auth'

const Chat = () => {
  const router = useRouter()

  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  console.log('isCheckingAuth', isCheckingAuth)

  useEffect(() => {
    // Check if user is logged in using our custom authentication function
    if (!isAuthenticated()) {
      // User is not logged in, redirect to our custom login page
      // Include the current URL as a redirect parameter
      const currentPath = window.location.pathname
      router.push(`/chat111-login?redirect=${encodeURIComponent(currentPath)}`)
    }
    else {
      // User is logged in, stop loading
      setIsCheckingAuth(false)
    }
  }, [router])

  if (isCheckingAuth)
    return <Loading type='app' />

  return (
    <ChatWithHistoryWrap />
  )
}

export default React.memo(Chat)
