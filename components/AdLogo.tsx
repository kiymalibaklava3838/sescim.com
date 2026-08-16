import Image from 'next/image'

export default function AdLogo({ size = 44 }: { size?: number }) {
  // Yazının yanında sönük kalmaması için logoyu %35 oranında büyütüyoruz
  const scale = 1.35
  const displayHeight = Math.round(size * scale)
  const displayWidth = Math.round(displayHeight * (480 / 413))

  return (
    <Image
      src="/logo.png"
      alt="Akdağ Elektronik Logo"
      width={displayWidth}
      height={displayHeight}
      className="object-contain"
      priority
    />
  )
}
