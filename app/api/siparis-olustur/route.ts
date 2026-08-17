import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { musterionayHTML, adminBildirimHTML } from '@/lib/email'
import { sendEmail } from '@/lib/send-email'
import { siparisOlusturSchema } from '@/lib/api-schemas'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'

const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

const akdagAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_AKDAG_SUPABASE_URL!, process.env.AKDAG_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!(await rateLimit(`siparis:${ip}`, 15, 60_000))) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen bir dakika sonra deneyin.' }, { status: 429 })
    }

    const raw = await req.json()
    const parsed = siparisOlusturSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Geçersiz veri', details: parsed.error.flatten() }, { status: 400 })
    }

    const {
      user_id,
      urunler,
      toplam_tutar,
      ad_soyad,
      email,
      telefon,
      notlar,
      odeme_tipi,
      teslimat_tipi,
      fatura_tipi,
      firma_unvani,
      vergi_dairesi,
      vergi_no,
      teslimat_adresi,
      kupon_kodu,
      indirim_tutari,
    } = parsed.data

    let hesaplanan = urunler.reduce((s, u) => s + u.fiyat * u.adet, 0)
    let appliedDiscount = 0

    const db = supabaseAdmin()
    const akdagDb = akdagAdmin()

    if (kupon_kodu) {
      const { data: kupon, error: kErr } = await db.from('kuponlar').select('*').eq('kod', kupon_kodu).eq('aktif', true).single()
      if (kErr || !kupon) {
        return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş kupon' }, { status: 400 })
      }
      
      const isExpired = kupon.gecerlilik_tarihi && new Date(kupon.gecerlilik_tarihi).getTime() < Date.now()
      if (isExpired) return NextResponse.json({ error: 'Kuponun süresi dolmuş' }, { status: 400 })
      
      if (kupon.max_kullanim && kupon.kullanim_sayisi >= kupon.max_kullanim) {
        return NextResponse.json({ error: 'Kupon kullanım limiti dolmuş' }, { status: 400 })
      }

      if (kupon.min_tutar && hesaplanan < kupon.min_tutar) {
        return NextResponse.json({ error: `Bu kupon en az ${kupon.min_tutar} ₺ alışverişte geçerlidir.` }, { status: 400 })
      }

      if (kupon.indirim_tipi === 'yuzde') {
        appliedDiscount = hesaplanan * (kupon.indirim_miktari / 100)
      } else {
        appliedDiscount = kupon.indirim_miktari
      }
      
      // Güvenlik: Frontend'den gelen indirim tutarı ile bizim hesapladığımız uyuşuyor mu?
      if (indirim_tutari !== undefined && indirim_tutari !== null && Math.abs(appliedDiscount - indirim_tutari) > 0.05) {
        return NextResponse.json({ error: 'Kupon tutarı doğrulanamadı' }, { status: 400 })
      }

      hesaplanan = Math.max(0, hesaplanan - appliedDiscount)
    }

    if (Math.abs(hesaplanan - toplam_tutar) > 0.05) {
      return NextResponse.json({ error: 'Tutar doğrulanamadı' }, { status: 400 })
    }

    // Döviz kurlarını al (Geçmişe dönük değer takibi için)
    let dolarKuru = 32.5
    let euroKuru = 35.2
    try {
      const kurRes = await fetch(`${req.nextUrl.origin}/api/kur`)
      if (kurRes.ok) {
        const kurData = await kurRes.json()
        dolarKuru = kurData.USD || 32.5
        euroKuru = kurData.EUR || 35.2
      }
    } catch {}

    const { data: siparis, error: dbErr } = await db
      .from('siparisler')
      .insert({
        user_id: user_id || null,
        urunler,
        toplam_tutar,
        ad_soyad,
        email,
        telefon,
        notlar,
        odeme_tipi,
        teslimat_tipi: teslimat_tipi || 'kargo',
        odeme_durumu: 'beklemede',
        durum: 'beklemede',
        fatura_tipi: fatura_tipi || 'bireysel',
        firma_unvani: firma_unvani || null,
        vergi_dairesi: vergi_dairesi || null,
        vergi_no: vergi_no || null,
        teslimat_adresi: teslimat_adresi || null,
        kupon_kodu: kupon_kodu || null,
        indirim_tutari: appliedDiscount,
        dolar_kuru: dolarKuru,
        euro_kuru: euroKuru,
        ip_adresi: ip,
        user_agent: req.headers.get('user-agent') || null,
      })
      .select('siparis_no, id')
      .single()

    if (dbErr || !siparis) {
      return NextResponse.json({ error: dbErr?.message || 'Sipariş oluşturulamadı' }, { status: 400 })
    }

    for (const item of urunler) {
      if (!item.urun_id) continue

      // Önce mevcut durumu al (siparise_gore mantığı için gerekli)
      const { data: urun } = await akdagDb
        .from('urunler')
        .select('stok_durumu, stok_adedi')
        .eq('id', item.urun_id)
        .single()

      if (typeof urun?.stok_adedi === 'number') {
        // Atomic stok düşürme — PostgreSQL fonksiyonu ile race condition olmadan güncelle
        // Supabase SQL: UPDATE urunler SET stok_adedi = GREATEST(stok_adedi - p_adet, 0) WHERE id = p_urun_id
        const { error: rpcErr } = await akdagDb.rpc('atomic_stok_dusur', {
          p_urun_id: item.urun_id,
          p_adet: item.adet,
        })

        if (rpcErr) {
          // RPC henüz eklenmemişse fallback (eski davranış) — uyarı logla
          console.warn('[stok] atomic_stok_dusur RPC bulunamadı, fallback kullanılıyor. Lütfen stok-migration.sql dosyasını Supabase SQL Editor\'da çalıştırın.', rpcErr.message)
          const kalan = Math.max(0, urun.stok_adedi - item.adet)
          const nextDurum = kalan <= 0 ? 'tukendi' : 'stokta'
          await akdagDb.from('urunler').update({ stok_adedi: kalan, stok_durumu: nextDurum }).eq('id', item.urun_id)
        }
      }

      if (urun?.stok_durumu === 'stokta') {
        const { count } = await db
          .from('siparisler')
          .select('*', { count: 'exact', head: true })
          .neq('durum', 'iptal')
          .neq('durum', 'teslim_edildi')
          .filter('urunler', 'cs', JSON.stringify([{ urun_id: item.urun_id }]))

        if ((count || 0) >= 5) {
          await akdagDb.from('urunler').update({ stok_durumu: 'siparise_gore' }).eq('id', item.urun_id)
        }
      }
    }

    // Kupon kullanım sayısını artır
    if (kupon_kodu) {
      const { error: rpcErr } = await db.rpc('increment_kupon_kullanim', { p_kod: kupon_kodu })
      if (rpcErr) {
        // Fallback if rpc is missing
        const { data: kData } = await db.from('kuponlar').select('kullanim_sayisi').eq('kod', kupon_kodu).single()
        if (kData) {
          await db.from('kuponlar').update({ kullanim_sayisi: kData.kullanim_sayisi + 1 }).eq('kod', kupon_kodu)
        }
      }
    }

    const emailData = {
      siparis_no: siparis.siparis_no,
      ad_soyad: ad_soyad || 'Müşteri',
      email,
      telefon: telefon || '',
      urunler,
      toplam_tutar,
      odeme_tipi: odeme_tipi || 'havale',
      notlar: notlar ?? undefined,
    }

    // E-postaları ayrı try/catch ile gönder — mail hatası siparişi engellemesin
    let emailError: string | undefined
    try {
      await sendEmail(
        email,
        `Siparişiniz Alındı — ${siparis.siparis_no} | sescim.com`,
        musterionayHTML(emailData)
      )
      const adminEmail = process.env.ADMIN_EMAIL || 'info@sescim.com'
      await sendEmail(
        adminEmail,
        `🔔 Yeni Sipariş: ${siparis.siparis_no} — ${toplam_tutar.toLocaleString('tr-TR')} ₺`,
        adminBildirimHTML(emailData)
      )
    } catch (mailErr) {
      emailError = (mailErr as Error).message
      console.error('[siparis-olustur] E-posta gönderilemedi, sipariş oluşturuldu:', emailError)
    }

    return NextResponse.json({
      success: true,
      siparis_no: siparis.siparis_no,
      id: siparis.id,
      ...(emailError ? { email_error: 'E-posta gönderilemedi, siparişiniz kaydedildi.' } : {}),
    })
  } catch (e) {
    console.error('Sipariş oluşturma hatası:', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
