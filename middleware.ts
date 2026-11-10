import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. PayTR iFrame ödeme sonrası /odeme/basarili veya /odeme/hata sayfalarına POST ile dönebilir.
  // Next.js App Router sayfaları sadece GET kabul ettiğinden POST istekleri 303 ile GET'e çevrilir.
  if (
    request.method === 'POST' &&
    (pathname.startsWith('/odeme/basarili') || pathname.startsWith('/odeme/hata'))
  ) {
    const redirectUrl = new URL(pathname + request.nextUrl.search, request.url)
    return NextResponse.redirect(redirectUrl, 303)
  }

  // 2. /odeme/ rotalarındaki GET istekleri genel bilgilendirme sayfalarıdır;
  // Supabase auth kontrolü gerektirmez, doğrudan devam et (Edge CPU tasarrufu).
  if (pathname.startsWith('/odeme/basarili') || pathname.startsWith('/odeme/hata')) {
    return NextResponse.next()
  }

  // 3. /uye/panel eski rotası doğrudan /hesabim'e yönlendirilir
  if (pathname.startsWith('/uye/panel')) {
    return NextResponse.redirect(new URL('/hesabim', request.url))
  }

  // 4. Supabase auth çerezi ön kontrolü:
  // @supabase/ssr kütüphanesi oturum çerezlerini `sb-<project-ref>-auth-token` formatında tutar.
  // Çerezlerde bu isimde bir token yoksa kullanıcı kesinlikle anonimdir.
  const hasAuthCookie = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.includes('auth-token')
  )

  // Anonim kullanıcı /hesabim sayfasına gitmek isterse harici API beklemeden anında yönlendir (0ms, 0 Edge CPU)
  if (pathname.startsWith('/hesabim') && !hasAuthCookie) {
    return NextResponse.redirect(new URL('/uye', request.url))
  }

  // Anonim kullanıcı /admin sayfasına girerse AdminClient zaten AdminLoginForm gösterecektir;
  // Supabase auth sorgusu yapmadan devam et
  if (pathname.startsWith('/admin') && !hasAuthCookie) {
    return NextResponse.next()
  }

  // 5. Yalnızca auth çerezi bulunan kullanıcılar için Supabase SSR oturum yenileme ve doğrulama
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return response
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        request.cookies.set({ name, value, ...options })
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: Record<string, unknown>) {
        request.cookies.set({ name, value: '', ...options })
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Admin koruması — site_admins tablosunda olması gerekiyor
  if (pathname.startsWith('/admin') && user) {
    const { data: row, error } = await supabase
      .from('site_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return response
    }

    if (!row) {
      const u = new URL('/', request.url)
      u.searchParams.set('yetki', 'admin')
      return NextResponse.redirect(u)
    }
  }

  // Hesabım koruması — çerez vardı ancak geçersiz/süresi dolmuşsa
  if (pathname.startsWith('/hesabim') && !user) {
    return NextResponse.redirect(new URL('/uye', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/hesabim',
    '/hesabim/:path*',
    '/uye/panel',
    '/uye/panel/:path*',
    '/odeme/basarili',
    '/odeme/hata',
  ],
}
