import { v2 as cloudinary } from 'cloudinary';
import type { AcastingJob, ImageStyle } from './types';

// Configurazione con fallback per debugging
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dylwdckvv';

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadImageToCloudinary(imageUrl: string): Promise<string> {
  console.log(`[Cloudinary] Avvio download immagine: ${imageUrl}`);
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
        console.error(`[Cloudinary] Download fallito: ${response.status} ${response.statusText}`);
        throw new Error(`Download fallito: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[Cloudinary] Buffer creato (${buffer.length} bytes), avvio upload_stream...`);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: 'acasting',
          resource_type: 'image',
          unique_filename: true 
        },
        (error, result) => {
          if (error) {
            console.error("[Cloudinary] Errore upload_stream:", error);
            return reject(error);
          }
          console.log(`[Cloudinary] Upload completato! PublicID: ${result!.public_id}`);
          resolve(result!.public_id);
        }
      );
      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error("[Cloudinary] Errore critico nel flusso:", error);
    throw error;
  }
}

// Funzione encoder pulita per evitare caratteri speciali che rompono l'URL
const enc = (text: string) => encodeURIComponent(text || '')
  .replace(/,/g, '%2C')
  .replace(/\//g, '%2F')
  .replace(/\(/g, '%28')
  .replace(/\)/g, '%29');

export function buildOverlayUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'dark'
): string {
  const title = job.title || 'Casting';
  const salaryText = !job.salary || job.salary === 'Ej angivet' 
    ? 'Arvode: Ej angivet' 
    : `Arvode: ${job.salary} kr`;
  
  const expiry = `Ansök senast: ${job.expiryDate ? job.expiryDate.split('T')[0] : 'Löpande'}`;

  // Sostituito Arial_46 con Arial_40 per garantire che il testo lungo non venga troncato o causi errori
  const transforms = [
    'w_1080,h_1920,c_fill,g_center,q_auto',
    'e_brightness:-85',
    `l_text:Arial_40_bold_center:${enc(title)},g_center,y_-250,w_900,c_fit,co_white`,
    'l_text:Arial_65_bold:__,g_center,y_-80,co_white',
    `l_text:Arial_40_bold_center:${enc(salaryText)},g_center,y_40,w_900,c_fit,co_white`,
    `l_text:Arial_40_bold_center:${enc(expiry)},g_center,y_140,w_900,c_fit,co_white`,
    'l_text:Arial_40_bold_center:Ansök nu på,g_center,y_300,w_900,c_fit,co_white',
    'l_text:Arial_40_bold_center:ACASTING,g_center,y_380,w_900,c_fit,co_rgb:7C3AED',
    'f_jpg'
  ].join('/');

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${publicId}.jpg`;
}

export async function generatePlaceholderAndUpload(jobTitle: string): Promise<string> {
  console.log(`[Cloudinary] Generazione placeholder per: ${jobTitle}`);
  const url = `https://placehold.co/1080x1920/0D0D1A/7C3AED.jpg?text=${encodeURIComponent(jobTitle)}`;
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'acasting/placeholders' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.public_id);
      }
    );
    uploadStream.end(buffer);
  });
}