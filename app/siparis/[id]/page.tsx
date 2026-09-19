import { redirect } from 'next/navigation'

interface Props {
  params: { id: string }
}

export default function SiparisIdPage({ params }: Props) {
  redirect(`/siparis-takip?no=${params.id}`)
}
