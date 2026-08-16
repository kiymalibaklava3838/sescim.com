// Bu sayfa artık kullanılmıyor — auth AdminClient içinde yönetiliyor
import { redirect } from 'next/navigation'

export default function AdminGirisPage() {
  redirect('/admin')
}
