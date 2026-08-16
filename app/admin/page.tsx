'use client'

import { useRouter } from 'next/navigation'
import AdminClient from '@/components/AdminClient'

export default function AdminPage() {
  const router = useRouter()

  return (
    <AdminClient 
      onSuccess={() => {
        // Yönlendirme yapma, sadece sayfayı yenile
        router.refresh() 
      }} 
    />
  )
}