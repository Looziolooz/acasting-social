// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadFinalImage(buffer: Buffer, jobId: string) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'acasting/social',
        public_id: `social-${jobId}`,
        resource_type: 'image',
        overwrite: true,
        invalidate: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    ).end(buffer);
  });
}

/**
 * REPLICA ESATTA DEL WORKFLOW n8n
 * Genera l'URL con overlay dinamico
 */
export function getPreviewUrl(secureUrl: string, job: any): string {
  // Estrae il public_id includendo la cartella
  const parts = secureUrl.split('/upload/');
  const publicIdWithFolder = parts[1].split('.')[0];
  
  const enc = (text: string) => encodeURIComponent(text || '')
    .replace(/,/g, '%2C')
    .replace(/\//g, '%2F');

  const title = job.title || 'Casting';
  const salaryText = !job.salary || job.salary === 'Ej angivet' ? 'Arvode: Ej angivet' : `Arvode: ${job.salary} kr`;
  const expiry = `Ansök senast: ${job.expiryDate?.split('T')[0] || 'Löpande'}`;

  const transforms = [
    'w_1080,h_1920,c_fill,g_center,q_auto', // Qualità automatica come n8n
    'e_brightness:-85',
    `l_text:Arial_46_bold_center:${enc(title)},g_center,y_-250,w_900,c_fit,co_white`,
    'l_text:Arial_65_bold:__,g_center,y_-80,co_white',
    `l_text:Arial_46_bold_center:${enc(salaryText)},g_center,y_40,w_900,c_fit,co_white`,
    `l_text:Arial_46_bold_center:${enc(expiry)},g_center,y_140,w_900,c_fit,co_white`,
    'l_text:Arial_46_bold_center:Ansök nu på,g_center,y_300,w_900,c_fit,co_white',
    'l_text:Arial_46_bold_center:ACASTING,g_center,y_380,w_900,c_fit,co_rgb:7C3AED',
    'f_jpg'
  ].join('/');

  return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${transforms}/${publicIdWithFolder}.jpg`;
}