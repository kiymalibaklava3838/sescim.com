'use client'

import { Zap, Flame, Tag, Sparkles, Percent, Gift } from 'lucide-react'
import { BADGE_COLOR_THEMES, type BadgeIconKey, type FlashCampaignMeta } from '@/lib/flash-campaign'

export function CampaignIcon({ icon, size = 11 }: { icon: BadgeIconKey; size?: number }) {
  switch (icon) {
    case 'zap':
      return <Zap size={size} className="shrink-0 fill-current" />
    case 'flame':
      return <Flame size={size} className="shrink-0" />
    case 'tag':
      return <Tag size={size} className="shrink-0" />
    case 'sparkles':
      return <Sparkles size={size} className="shrink-0" />
    case 'percent':
      return <Percent size={size} strokeWidth={3} className="shrink-0" />
    case 'gift':
      return <Gift size={size} className="shrink-0" />
    default:
      return null
  }
}

interface CampaignBadgeProps {
  kampanya: FlashCampaignMeta
  discountPercent?: number | null
  size?: 'xs' | 'sm'
}

export default function CampaignBadge({ kampanya, discountPercent, size = 'xs' }: CampaignBadgeProps) {
  const theme = BADGE_COLOR_THEMES[kampanya.rozet_rengi] || BADGE_COLOR_THEMES.red
  const showPercent = kampanya.yuzde_goster && typeof discountPercent === 'number' && discountPercent > 0

  return (
    <span
      className={`inline-flex items-center gap-1 font-display font-black uppercase tracking-wider rounded shadow-xs whitespace-nowrap ${
        theme.pillClass
      } ${size === 'xs' ? 'text-[9px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1'}`}
    >
      <CampaignIcon icon={kampanya.rozet_ikonu} size={size === 'xs' ? 10 : 12} />
      <span>{kampanya.rozet_metni || kampanya.kampanya_adi}</span>
      {showPercent && <span className="opacity-90">• %{discountPercent}</span>}
    </span>
  )
}
