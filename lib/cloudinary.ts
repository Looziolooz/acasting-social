import { v2 as cloudinary } from 'cloudinary';
import type { AcastingJob, ImageStyle } from './types';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Carica un'immagine su Cloudinary scaricandola prima come buffer.
 * Fondamentale su Vercel per bypassare i blocchi anti-bot di acasting.se.
 */
export async function uploadImageToCloudinary(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Errore download immagine: ${response.statusText}`);
    }

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
    console.error("Cloudinary Flow Error:", error);
    throw error;
  }
}

function enc(text: string): string {
  return encodeURIComponent(text || '')
    .replace(/,/g, '%2C')
    .replace(/\//g, '%2F');
}

/**
 * Builds a Cloudinary overlay URL basato sul tuo workflow nativo.
 */
export function buildOverlayUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'dark'
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;

  // Mappatura luminosità basata sullo stile, mantenendo il look del workflow
  const brightness = {
    dark: -85,
    purple: -75,
    noir: -95,
    warm: -70
  }[style] || -85;

  const title = job.title || 'Casting';
  const salaryText = !job.salary || job.salary === 'Ej angivet' 
    ? 'Arvode: Ej angivet' 
    : `Arvode: ${job.salary} kr`;
  
  const expiry = `Ansök senast: ${job.expiryDate ? job.expiryDate.split('T')[0] : 'Löpande'}`;

  // Trasformazioni identiche al tuo script originale
  const transforms = [
    'w_1080,h_1920,c_fill,g_center,q_auto',
    `e_brightness:${brightness}`,
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