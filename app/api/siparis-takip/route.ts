import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'

export const dynamic = 'force-dynamic'

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!(await rateLimit(`siparis-takip:${ip}`, 20, 60_000))) {
      return NextResponse.json(
        { error: 'Çok fazla sorgulama denemesi yaptınız. Lütfen 1 dakika sonra tekrar deneyiniz.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const rawNo = String(body.siparis_no || '').trim().toUpperCase()
    const rawEmail = String(body.email || '').trim().toLowerCase()

    if (!rawNo || !rawEmail) {
      return NextResponse.json(
        { error: 'Lütfen Sipariş Numarası ve E-posta adresinizi eksiksiz giriniz.' },
        { status: 400 }
      )
    }

    // Tireli ve tiresiz varyantları hazırla
    const formattedWithHyphen = rawNo.startsWith('SCM') && !rawNo.includes('-')
      ? `SCM-${rawNo.slice(3)}`
      : rawNo
    const formattedWithoutHyphen = rawNo.replace(/[^a-zA-Z0-9]/g, '')

    const db = supabaseAdmin()

    const { data: siparis, error: sipErr } = await db
      .from('siparisler')
      .select('id, siparis_no, email, ad_soyad, telefon, toplam_tutar, indirim_tutari, kargo_ucreti, durum, odeme_durumu, odeme_tipi, kargo_takip_no, kargo_firmasi, teslimat_adresi, created_at')
      .or(`siparis_no.eq.${rawNo},siparis_no.eq.${formattedWithHyphen},siparis_no.eq.${formattedWithoutHyphen}`)
      .ilike('email', rawEmail)
      .neq('durum', 'odeme_bekliyor')
      .maybeSingle()

    if (sipErr || !siparis) {
      return NextResponse.json(
        { error: 'Girdiğiniz sipariş numarası ve e-posta adresi ile eşleşen bir sipariş bulunamadı. Lütfen bilgilerinizi kontrol ediniz.' },
        { status: 404 }
      )
    }

    // Sipariş kalemlerini çek
    const { data: kalemler } = await db
      .from('siparis_kalemleri')
      .select('urun_id, urun_adi, adet, birim_fiyat')
      .eq('siparis_id', siparis.id)

    // Kalemlerin fotoğraflarını getirmek için urunler tablosundan sorgula
    const urunIds = (kalemler || []).map((k: any) => k.urun_id).filter(Boolean)
    let fotograflarMap = new Map<string, string>()

    if (urunIds.length > 0) {
      const { data: urunRes } = await db
        .from('urunler')
        .select('id, slug, fotograflar')
        .in('id', urunIds)

      ;(urunRes || []).forEach((u: any) => {
        if (Array.isArray(u.fotograflar) && u.fotograflar.length > 0) {
          fotograflarMap.set(u.id, u.fotograflar[0])
        }
      })
    }

    const urunler = (kalemler || []).map((k: any) => ({
      urun_id: k.urun_id,
      ad: k.urun_adi,
      adet: Number(k.adet || 1),
      fiyat: Number(k.birim_fiyat || 0),
      fotograf: k.urun_id ? (fotograflarMap.get(k.urun_id) || null) : null,
    }))

    return NextResponse.json({
      success: true,
      siparis: {
        id: siparis.id,
        siparis_no: siparis.siparis_no,
        ad_soyad: siparis.ad_soyad,
        email: siparis.email,
        toplam_tutar: siparis.toplam_tutar,
        indirim_tutari: siparis.indirim_tutari || 0,
        kargo_ucreti: siparis.kargo_ucreti || 0,
        durum: siparis.durum,
        odeme_durumu: siparis.odeme_durumu,
        odeme_tipi: siparis.odeme_tipi,
        kargo_takip_no: siparis.kargo_takip_no,
        kargo_firmasi: siparis.kargo_firmasi,
        teslimat_adresi: siparis.teslimat_adresi,
        created_at: siparis.created_at,
        urunler,
      }
    })
  } catch (e: any) {
    console.error('[siparis-takip] Sorgulama hatası:', e)
    return NextResponse.json({ error: 'Sunucu hatası oluştu. Lütfen tekrar deneyiniz.' }, { status: 500 })
  }
}
