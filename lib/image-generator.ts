import sharp from 'sharp';

export interface GeneratedImage {
  buffer: Buffer;
}

export async function generateSocialImage(imageUrl: string | null): Promise<GeneratedImage> {
  if (!imageUrl) throw new Error("URL immagine mancante");

  // Scarichiamo l'immagine originale
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("Impossibile scaricare l'immagine sorgente");
  
  const buffer = Buffer.from(await response.arrayBuffer());
  
  // Ridimensioniamo solo per uniformità, senza applicare filtri o testi
  const finalBuffer = await sharp(buffer)
    .resize(1080, 1920, { fit: 'cover', position: 'center' })
    .toFormat('jpg', { quality: 100 })
    .toBuffer();

  return { buffer: finalBuffer };
}