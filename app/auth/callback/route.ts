import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSiteUrl } from '@/lib/site-url'

/**
 * Supabase PKCE auth callback handler.
 *
 * Supabase şifre sıfırlama, Google OAuth ve e-posta doğrulama linkleri buraya gelir.
 * ?code parametresini oturuma çevirir, sonra hedef sayfaya yönlendirir.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/hesabim'
  if (next.startsWith('/uye/panel')) {
    next = '/hesabim'
  }
  // Supabase hata durumunda error ve error_description parametresi gönderir
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description') || ''

  // Dinamik ve güvenli canlı origin belirleme
  const forwardedHost = req.headers.get('x-forwarded-host')
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https'
  let baseOrigin = getSiteUrl()
  if (forwardedHost && !forwardedHost.includes('localhost')) {
    baseOrigin = `${forwardedProto}://${forwardedHost}`
  } else if (origin && !origin.includes('localhost')) {
    baseOrigin = origin
  }

  // Supabase'den direkt hata geldi (ör: link süresi dolmuş)
  if (errorParam) {
    console.error('[auth/callback] Supabase hata parametresi:', errorParam, errorDescription)

    // Link süresi dolmuş veya geçersizse şifre sıfırlama sayfasına yönlendir
    const sifreSifirlaUrl = new URL(`${baseOrigin}/uye/sifre-sifirla`)
    sifreSifirlaUrl.searchParams.set('error', 'link_suresi_doldu')
    return NextResponse.redirect(sifreSifirlaUrl.toString())
  }

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value, ...options } as any)
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value: '', ...options } as any)
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${baseOrigin}${next}`)
    }

    console.error('[auth/callback] exchangeCodeForSession hatası:', error.message)
  }

  // Hata da yok, code da yoksa büyük ihtimalle Implicit Flow (hash fragment) kullanılıyordur.
  // Sunucu hash fragment'i göremediği için doğrudan hedefe yönlendiriyoruz,
  // böylece tarayıcı tarafındaki Supabase istemcisi URL'deki hash'i yakalayabilir.
  return NextResponse.redirect(`${baseOrigin}${next}`)
}
