import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase PKCE auth callback handler.
 *
 * Supabase şifre sıfırlama ve davet e-postalarındaki linkler buraya gelir.
 * ?code parametresini oturuma çevirir, sonra hedef sayfaya yönlendirir.
 *
 * Supabase Dashboard → Authentication → URL Configuration kısmına
 * bu URL'yi eklemeyi unutmayın:
 *   https://www.akdagelektronik.com/auth/callback
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/uye/panel'
  // Supabase hata durumunda error ve error_description parametresi gönderir
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description') || ''

  // Supabase'den direkt hata geldi (ör: link süresi dolmuş)
  if (errorParam) {
    console.error('[auth/callback] Supabase hata parametresi:', errorParam, errorDescription)

    // Link süresi dolmuş veya geçersizse şifre sıfırlama sayfasına yönlendir
    const sifreSifirlaUrl = new URL(`${origin}/uye/sifre-sifirla`)
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
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[auth/callback] exchangeCodeForSession hatası:', error.message)
  }

  // Hata da yok, code da yoksa büyük ihtimalle Implicit Flow (hash fragment) kullanılıyordur.
  // Sunucu hash fragment'i göremediği için doğrudan hedefe yönlendiriyoruz,
  // böylece tarayıcı tarafındaki Supabase istemcisi URL'deki hash'i yakalayabilir.
  return NextResponse.redirect(`${origin}${next}`)
}
