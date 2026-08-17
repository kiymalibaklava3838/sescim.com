import { z } from 'zod'

export const siparisUrunSchema = z.object({
  urun_id: z.string().uuid().optional(),
  ad: z.string().min(1).max(500),
  adet: z.number().int().min(1).max(999),
  fiyat: z.number().min(0).max(100_000_000),
  fotograf: z.string().max(2000).optional(),
})

export const siparisOlusturSchema = z.object({
  user_id: z.string().uuid().nullable().optional(),
  urunler: z.array(siparisUrunSchema).min(1).max(100),
  toplam_tutar: z.number().min(0).max(50_000_000),
  kupon_kodu: z.string().max(100).optional().nullable(),
  indirim_tutari: z.number().min(0).max(50_000_000).optional().nullable(),
  ad_soyad: z.string().max(200).optional().nullable(),
  email: z.string().email().max(320),
  telefon: z.string().max(50).optional().nullable(),
  notlar: z.string().max(2000).optional().nullable(),
  odeme_tipi: z.string().max(50).optional().nullable(),
  teslimat_tipi: z.enum(['kargo', 'depo']).optional().default('kargo'),

  fatura_tipi: z.enum(['bireysel', 'kurumsal']).optional().default('bireysel'),
  firma_unvani: z.string().max(300).optional().nullable(),
  vergi_dairesi: z.string().max(100).optional().nullable(),
  vergi_no: z.string().max(50).optional().nullable(),
  teslimat_adresi: z.string().max(2000).optional().nullable(),
})

export const paytrTokenSchema = z.object({
  siparis_no: z.string().min(4).max(64),
  tutar: z.number().min(0.01).max(50_000_000),
  ad_soyad: z.string().min(1).max(200),
  email: z.string().email().max(320),
  telefon: z.string().max(50).optional().nullable(),
  urunler: z
    .array(
      z.object({
        ad: z.string().min(1).max(500),
        fiyat: z.number().min(0),
        adet: z.number().int().min(1).max(999),
      })
    )
    .min(1)
    .max(100),
})



export const sifreSifirlaSchema = z.object({
  email: z.string().email().max(320),
})

export const iletisimSchema = z.object({
  ad: z.string().min(1).max(120),
  soyad: z.string().max(120).optional().nullable(),
  telefon: z.string().max(50).optional().nullable(),
  email: z.string().email().max(320),
  konu: z.string().max(200).optional().nullable(),
  mesaj: z.string().min(1).max(8000),
})
