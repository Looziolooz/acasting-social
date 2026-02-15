import sharp from 'sharp';

export interface GeneratedImage {
  buffer: Buffer;
}

export async function generateSocialImage(imageUrl: string | null): Promise<GeneratedImage> {
  if (!imageUrl) throw new Error("URL immagine mancante");

  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("Impossibile scaricare l'immagine originale");
  
  const buffer = Buffer.from(await response.arrayBuffer());
  
  // Prepariamo l'immagine base: solo ridimensionamento pulito
  const finalBuffer = await sharp(buffer)
    .resize(1080, 1920, { fit: 'cover', position: 'center' })
    .toFormat('jpg', { quality: 100 })
    .toBuffer();

  return { buffer: finalBuffer };
}