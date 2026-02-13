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
 * Questo risolve i problemi di caricamento su Vercel bypassando i blocchi anti-bot.
 */
export async function uploadImageToCloudinary(imageUrl: string): Promise<string> {
  // 1. Scarichiamo l'immagine con un User-Agent browser per evitare blocchi
  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Impossibile scaricare l'immagine originale: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 2. Utilizziamo upload_stream per caricare il buffer direttamente su Cloudinary
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'acasting',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.public_id);
      }
    );

    uploadStream.end(buffer);
  });
}

/** Encodes text safely for Cloudinary URL transformations */
function enc(text: string): string {
  return encodeURIComponent(text || '')
    .replace(/,/g, '%2C')
    .replace(/\//g, '%2F')
    .replace(/:/g, '%3A');
}

/**
 * Builds a Cloudinary overlay URL with Swedish text for the target audience.
 */
export function buildOverlayUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'dark'
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;

  const styleConfig = {
    dark: { brightness: -80, titleColor: 'white', subColor: 'white', accentColor: '7C3AED' },
    purple: { brightness: -60, titleColor: 'white', subColor: 'E5D5FF', accentColor: 'A78BFA' },
    noir: { brightness: -95, titleColor: 'white', subColor: 'CCCCCC', accentColor: 'FFFFFF' },
    warm: { brightness: -65, titleColor: 'FFEDD8', subColor: 'FFC599', accentColor: 'FF6B35' },
  }[style];

  const title = job.title || 'Casting';
  const salary = job.salary ? `Arvode: ${job.salary} kr` : 'Arvode: Ej angivet';
  const expiry = `Ansök senast: ${job.expiryDate ? job.expiryDate.split('T')[0] : 'Löpande'}`;
  const city = job.city || 'Sverige';

  const transforms = [
    'w_1080,h_1920,c_fill,g_face:auto,dpr_2.0,q_90',
    `e_brightness:${styleConfig.brightness}`,
    `l_text:Arial_4_bold:.,g_north,y_120,co_${styleConfig.accentColor},w_200`,
    `l_text:Arial_28_bold:${enc((job.category || 'CASTING').toUpperCase())},g_north,y_80,co_${styleConfig.accentColor}`,
    `l_text:Arial_58_bold_center:${enc(title)},g_center,y_-280,w_920,c_fit,co_${styleConfig.titleColor}`,
    `l_text:Arial_36_bold:─────────────,g_center,y_-160,co_${styleConfig.accentColor}`,
    `l_text:Arial_38_bold_center:${enc('📍 ' + city)},g_center,y_-90,w_920,c_fit,co_${styleConfig.subColor}`,
    `l_text:Arial_46_bold_center:${enc(salary)},g_center,y_10,w_920,c_fit,co_${styleConfig.titleColor}`,
    `l_text:Arial_38_bold_center:${enc(expiry)},g_center,y_100,w_920,c_fit,co_${styleConfig.subColor}`,
    `l_text:Arial_36_bold:─────────────,g_center,y_260,co_${styleConfig.accentColor}`,
    `l_text:Arial_42_bold_center:Ansök nu på,g_center,y_340,w_920,c_fit,co_${styleConfig.subColor}`,
    `l_text:Arial_72_bold_center:ACASTING.SE,g_center,y_430,w_920,c_fit,co_${styleConfig.accentColor}`,
    'f_jpg',
  ].join('/');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}.jpg`;
}

/** Generate a placeholder image when no source image is available */
export async function generatePlaceholderAndUpload(jobTitle: string): Promise<string> {
  const result = await cloudinary.uploader.upload(
    `https://placehold.co/1080x1920/0D0D1A/7C3AED.jpg?text=${encodeURIComponent(jobTitle)}`,
    { folder: 'acasting/placeholders' }
  );
  return result.public_id;
}