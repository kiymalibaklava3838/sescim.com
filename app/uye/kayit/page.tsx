import { redirect } from 'next/navigation'

export default function KayitPage({
  searchParams,
}: {
  searchParams?: { next?: string; redirect?: string }
}) {
  const nextTarget = searchParams?.next || searchParams?.redirect
  if (nextTarget && nextTarget.startsWith('/') && !nextTarget.startsWith('//')) {
    redirect(`/uye?tab=kayit&next=${encodeURIComponent(nextTarget)}`)
  }
  redirect('/uye?tab=kayit')
}
