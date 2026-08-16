'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function AdminLogout() {
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/giris')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 text-white/30 hover:text-brand-red font-display font-600 text-xs tracking-widest uppercase transition-colors duration-200"
    >
      <LogOut size={14} />
      Çıkış Yap
    </button>
  )
}
