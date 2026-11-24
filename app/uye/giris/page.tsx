import { redirect } from 'next/navigation'

export default function UyeGirisPage({
  searchParams,
}: {
  searchParams?: { next?: string; redirect?: string }
}) {
  const nextTarget = searchParams?.next || searchParams?.redirect
  if (nextTarget && nextTarget.startsWith('/') && !nextTarget.startsWith('//')) {
    redirect(`/uye?next=${encodeURIComponent(nextTarget)}`)
  }
  redirect('/uye')
}
