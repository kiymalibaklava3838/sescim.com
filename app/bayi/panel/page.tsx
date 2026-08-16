'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BayiPanel from '@/components/BayiPanel'
import type { User } from '@supabase/supabase-js'

export default function BayiPanelPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useRef(createClient()).current

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/bayi')
        return
      }

      // Bayi olup olmadığını doğrula
      setUser(session.user)
      setLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!session) router.push('/bayi')
      else setUser(session.user)
    })

    return () => subscription.unsubscribe()
  }, [router, supabase])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" />
      </div>
    )
  }

  return <BayiPanel user={user} />
}
