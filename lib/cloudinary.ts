import { v2 as cloudinary } from 'cloudinary';
import type { AcastingJob, ImageStyle } from './types';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Carica l'immagine su Cloudinary bypassando i blocchi anti-bot.
 * Scarica l'immagine su Vercel e la invia come stream.
 */
export async function uploadImageToCloudinary(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) throw new Error(`Download fallito: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'acasting', resource_type: 'image' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result!.public_id);
        }
      );
      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
}

const enc = (text: string) => encodeURIComponent(text || '').replace(/,/g, '%2C').replace(/\//g, '%2F');

/**
 * Genera l'URL HD con l'overlay esatto del tuo workflow originale.
 */
export function buildOverlayUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'dark'
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  
  // Sincronizzato con il tuo prompt originale
  const title = job.title || 'Casting';
  const salaryText = !job.salary || job.salary === 'Ej angivet' ? 'Arvode: Ej angivet' : `Arvode: ${job.salary} kr`;
  const expiry = `Ansök senast: ${job.expiryDate ? job.expiryDate.split('T')[0] : 'Löpande'}`;

  const transforms = [
    'w_1080,h_1920,c_fill,g_center,q_auto',
    'e_brightness:-85',
    `l_text:Arial_46_bold_center:${enc(title)},g_center,y_-250,w_900,c_fit,co_white`,
    'l_text:Arial_65_bold:__,g_center,y_-80,co_white',
    `l_text:Arial_46_bold_center:${enc(salaryText)},g_center,y_40,w_900,c_fit,co_white`,
    `l_text:Arial_46_bold_center:${enc(expiry)},g_center,y_140,w_900,c_fit,co_white`,
    'l_text:Arial_46_bold_center:Ansök nu på,g_center,y_300,w_900,c_fit,co_white',
    'l_text:Arial_46_bold_center:ACASTING,g_center,y_380,w_900,c_fit,co_rgb:7C3AED',
    'f_jpg'
  ].join('/');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}.jpg`;
}

export async function generatePlaceholderAndUpload(jobTitle: string): Promise<string> {
  const response = await fetch(`https://placehold.co/1080x1920/0D0D1A/7C3AED.jpg?text=${encodeURIComponent(jobTitle)}`);
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