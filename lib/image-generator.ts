// lib/image-generator.ts — Solo download e ottimizzazione base
import sharp from 'sharp';

export interface GeneratedImage {
  buffer: Buffer;
  sourceQuality: 'high' | 'medium' | 'low';
}

export async function generateSocialImage(imageUrl: string | null): Promise<GeneratedImage> {
  if (!imageUrl) {
    throw new Error("L'URL dell'immagine è obbligatorio");
  }

  // Scarica l'immagine originale
  const response = await fetch(imageUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  
  // Ritorna il buffer originale senza filtri distruttivi (niente blur)
  const finalBuffer = await sharp(buffer)
    .resize(1080, 1920, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer();

  return {
    buffer: finalBuffer,
    sourceQuality: 'high',
  };
}