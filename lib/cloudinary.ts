// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import type { AcastingJob, ImageStyle } from './types';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadImageToCloudinary(imageUrl: string): Promise<string> {
  console.log(`[DEBUG] Tentativo upload immagine: ${imageUrl}`);
  try {
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) throw new Error(`Fetch fallito: ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'acasting' },
        (error, result) => {
          if (error) {
            console.error("[DEBUG] Errore Cloudinary Stream:", error);
            return reject(error);
          }
          resolve(result!.public_id);
        }
      );
      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error("[DEBUG] Errore uploadImageToCloudinary:", error);
    throw error;
  }
}

const enc = (text: string) => encodeURIComponent(text || '').replace(/,/g, '%2C').replace(/\//g, '%2F');

export function buildOverlayUrl(publicId: string, job: AcastingJob, style: ImageStyle = 'dark'): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dylwdckvv';
  const title = job.title || 'Casting';
  const salaryText = !job.salary || job.salary === 'Ej angivet' ? 'Arvode: Ej angivet' : `Arvode: ${job.salary} kr`;
  const expiry = `Ansök senast: ${job.expiryDate ? job.expiryDate.split('T')[0] : 'Löpande'}`;

  // LAYOUT HD (Workflow Telegram Fix)
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
  // Fallback se l'immagine originale è protetta
  const url = `https://placehold.co/1080x1920/0D0D1A/7C3AED.jpg?text=${encodeURIComponent(jobTitle)}`;
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder: 'acasting/placeholders' }, (err, res) => {
      if (err) return reject(err);
      resolve(res!.public_id);
    }).end(buffer);
  });
}