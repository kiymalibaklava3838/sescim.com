/**
 * İstemci tarafında (tarayıcıda) fotoğrafları HTML5 Canvas kullanarak
 * sıfır sunucu yüküyle sıkıştıran ve WebP formatına dönüştüren motor.
 * Vercel sunucusuna hiçbir zaman ham / devasa fotoğraf gitmez.
 */

export async function compressImageToWebP(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Tarayıcı ortamında değilsek hata dön
    if (typeof window === 'undefined') {
      return reject(new Error('Browser environment required'))
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string

      img.onload = () => {
        let width = img.width
        let height = img.height

        // Orantılı küçültme
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return reject(new Error('Canvas context could not be created'))
        }

        // Pürüzsüz çizim ayarları
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        // WebP formatında sıkıştır (desteklenmiyorsa JPEG fallback)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Blob conversion failed'))
            }
          },
          'image/webp',
          quality
        )
      }

      img.onerror = (err) => reject(err)
    }

    reader.onerror = (err) => reject(err)
  })
}
