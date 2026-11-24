import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getSiteUrl } from '@/lib/site-url'

function sanitizeNextPath(raw: string | null): string {
  if (!raw) return '/hesabim'
  const trimmed = raw.trim()
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\')
  ) {
    return '/hesabim'
  }
  const pathOnly = trimmed.split('?')[0]
  if (pathOnly.includes('://')) return '/hesabim'
  if (trimmed.startsWith('/uye/panel')) return '/hesabim'
  return trimmed
}

function splitName(meta: Record<string, any>): { ad: string; soyad: string } {
  const given = (meta.given_name || meta.first_name || '').trim()
  const family = (meta.family_name || meta.last_name || '').trim()
  if (given || family) {
    return { ad: given, soyad: family }
  }
  const full = (meta.full_name || meta.name || '').trim()
  if (!full) return { ad: '', soyad: '' }
  const parts = full.split(/\s+/)
  if (parts.length === 1) return { ad: parts[0], soyad: '' }
  return { ad: parts.slice(0, -1).join(' '), soyad: parts[parts.length - 1] }
}

/**
 * Supabase PKCE auth callback handler.
 *
 * Supabase şifre sıfırlama, Google OAuth ve e-posta doğrulama linkleri buraya gelir.
 * ?code parametresini oturuma çevirir, ilk girişte uye_profiller kaydını oluşturur
 * ve güvenli hedef sayfaya yönlendirir.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'))
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
  } else if (origin && origin.includes('localhost')) {
    baseOrigin = origin
  }

  // Supabase'den direkt hata geldi (ör: link süresi dolmuş veya Google OAuth iptal edildi)
  if (errorParam) {
    console.error('[auth/callback] Supabase hata parametresi:', errorParam, errorDescription)

    const isRecoveryError =
      next.includes('sifre') ||
      errorDescription.toLowerCase().includes('expired') ||
      errorDescription.toLowerCase().includes('otp')

    if (isRecoveryError) {
      const sifreSifirlaUrl = new URL(`${baseOrigin}/uye/sifre-sifirla`)
      sifreSifirlaUrl.searchParams.set('error', 'link_suresi_doldu')
      return NextResponse.redirect(sifreSifirlaUrl.toString())
    }

    const uyeUrl = new URL(`${baseOrigin}/uye`)
    uyeUrl.searchParams.set('error', 'oauth_failed')
    return NextResponse.redirect(uyeUrl.toString())
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Google OAuth veya ilk kez giriş yapan kullanıcı için uye_profiller kaydı oluştur
      // (Mevcut kayıt varsa kullanıcının düzenlediği bilgileri ezme)
      if (data?.user && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const admin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { autoRefreshToken: false, persistSession: false } }
          )
          const { data: existing } = await admin
            .from('uye_profiller')
            .select('user_id')
            .eq('user_id', data.user.id)
            .maybeSingle()

          if (!existing) {
            const { ad, soyad } = splitName(data.user.user_metadata || {})
            await admin.from('uye_profiller').insert({
              user_id: data.user.id,
              ad,
              soyad,
              telefon: (data.user.user_metadata?.phone || '').trim(),
            })
          }
        } catch (profErr) {
          console.warn('[auth/callback] Profil oluşturma uyarısı (kritik değil):', profErr)
        }
      }

      return NextResponse.redirect(`${baseOrigin}${next}`)
    }

    console.error('[auth/callback] exchangeCodeForSession hatası:', error.message)
    const uyeUrl = new URL(`${baseOrigin}/uye`)
    uyeUrl.searchParams.set('error', 'oauth_failed')
    return NextResponse.redirect(uyeUrl.toString())
  }

  // Hata da yok, code da yoksa Implicit Flow (hash fragment) olabilir
  return NextResponse.redirect(`${baseOrigin}${next}`)
}
