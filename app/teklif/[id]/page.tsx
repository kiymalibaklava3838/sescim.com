import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import ProposalPageClient from './ProposalPageClient'

// Bu sayfa public (müşteri erişimli) olduğundan
// anon key'le RLS engeli yaşamamak için service_role kullanıyoruz.
// Güvenli: Bu kod sadece server-side'da çalışır, client'a key sızmaz.
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getProposal(id: string) {
  const supabase = createAdminClient()
  const { data: proposal } = await supabase
    .from('teklifler')
    .select('id, teklif_no, musteri_adi, tarih, genel_toplam, ara_toplam, kdv, kur_usd, kur_eur, ozel_not, urunler, bayi_id')
    .eq('id', id)
    .single()

  if (proposal && proposal.bayi_id) {
    const { data: bayiAyarlari } = await supabase
      .from('bayi_teklif_ayarlari')
      .select('logo_url, firma_adi, adres, telefon, email, web_sitesi, teklif_notu')
      .eq('bayi_id', proposal.bayi_id)
      .maybeSingle()
    
    return {
      ...proposal,
      bayiAyarlari: bayiAyarlari || null
    }
  }
  return proposal
}

export default async function ProposalPage({ params }: { params: { id: string } }) {
  const p = await getProposal(params.id)
  if (!p) notFound()
  return <ProposalPageClient proposal={p} />
}
