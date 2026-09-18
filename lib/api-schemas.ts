import { z } from 'zod'

export const siparisUrunSchema = z.object({
  urun_id: z.string().max(200).optional().nullable(),
  ad: z.string().min(1).max(500),
  adet: z.number().int().min(1).max(999),
  fiyat: z.number().min(0).max(100_000_000),
  fotograf: z.string().max(5000).optional().nullable(),
})

export const siparisOlusturSchema = z.object({
  user_id: z.string().max(200).nullable().optional(),
  urunler: z.array(siparisUrunSchema).min(1).max(100),
  toplam_tutar: z.number().min(0).max(50_000_000),
  kupon_kodu: z.string().max(100).optional().nullable(),
  indirim_tutari: z.number().min(0).max(50_000_000).optional().nullable(),
  ad_soyad: z.string().max(200).optional().nullable(),
  email: z.string().min(3, 'E-posta en az 3 karakter olmalıdır').max(320).refine((val) => val.includes('@'), {
    message: 'Lütfen geçerli bir e-posta adresi giriniz',
  }),
  telefon: z.string().max(50).optional().nullable(),
  notlar: z.string().max(2000).optional().nullable(),
  odeme_tipi: z.string().max(50).optional().nullable(),
  teslimat_tipi: z.enum(['kargo', 'depo']).optional().default('kargo'),
  kargo_ucreti: z.number().min(0).max(10_000).optional().default(0),

  fatura_tipi: z.enum(['bireysel', 'kurumsal']).optional().default('bireysel'),
  firma_unvani: z.string().max(300).optional().nullable(),
  vergi_dairesi: z.string().max(100).optional().nullable(),
  vergi_no: z.string().max(50).optional().nullable(),
  teslimat_adresi: z.string().max(2000).optional().nullable(),
})

export const paytrTokenSchema = z.object({
  siparis_no: z.string().min(3).max(64),
  tutar: z.number().min(0.01).max(50_000_000),
  ad_soyad: z.string().min(1).max(200),
  email: z.string().min(3).max(320).refine((val) => val.includes('@'), {
    message: 'Lütfen geçerli bir e-posta adresi giriniz',
  }),
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
