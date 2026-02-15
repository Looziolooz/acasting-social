// lib/image-generator.ts
import sharp from 'sharp';

export interface GeneratedImage {
  buffer: Buffer;
}

export async function generateSocialImage(imageUrl: string | null): Promise<GeneratedImage> {
  if (!imageUrl) throw new Error("URL sorgente mancante");

  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("Errore nel fetch dell'immagine sorgente");
  
  const buffer = Buffer.from(await response.arrayBuffer());
  
  // Non usiamo più filtri distruttivi come blur(40) o testi.
  // Ridimensioniamo solo per caricare un file ottimizzato.
  const finalBuffer = await sharp(buffer)
    .resize(1080, 1920, { fit: 'cover', position: 'center' })
    .toFormat('jpg', { quality: 100 })
    .toBuffer();

  return { buffer: finalBuffer };
}