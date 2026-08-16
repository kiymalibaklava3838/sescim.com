import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
  if (request.nextUrl.pathname.startsWith('/admin') && user) {
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

  // Hesabım koruması — giriş yapmadan erişim yok
  if (request.nextUrl.pathname.startsWith('/hesabim') && !user) {
    return NextResponse.redirect(new URL('/uye', request.url))
  }

  // Üye panel koruması
  if (request.nextUrl.pathname.startsWith('/uye/panel') && !user) {
    return NextResponse.redirect(new URL('/uye', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/hesabim', '/hesabim/:path*', '/uye/panel', '/uye/panel/:path*'],
}
