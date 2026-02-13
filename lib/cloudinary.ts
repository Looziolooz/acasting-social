// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import type { AcastingJob, ImageStyle, CustomImageSettings } from './types';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadImageToCloudinary(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'acasting' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.public_id);
      }
    );
    uploadStream.end(buffer);
  });
}

export async function generatePlaceholderAndUpload(jobTitle: string): Promise<string> {
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

const enc = (text: string) => encodeURIComponent(text || '').replace(/,/g, '%2C').replace(/\//g, '%2F');

export function buildOverlayUrl(
  publicId: string, 
  job: AcastingJob, 
  style: ImageStyle = 'dark',
  custom?: CustomImageSettings
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  
  // Dynamic parameters for manual HD editor
  const brightness = custom?.brightness ?? (style === 'noir' ? -90 : -75);
  const titleY = custom?.titleY ?? -250;
  const titleSize = custom?.titleSize ?? 46;
  const titleColor = custom?.titleColor ?? 'white';
  const accentColor = style === 'purple' ? 'A78BFA' : '7C3AED';

  const transforms = [
    'w_1080,h_1920,c_fill,g_center,dpr_2.0,q_auto:best', // HD Quality
    `e_brightness:${brightness}`,
    `l_text:Arial_${titleSize}_bold_center:${enc(job.title)},g_center,y_${titleY},w_900,c_fit,co_${titleColor}`,
    'l_text:Arial_65_bold:__,g_center,y_-80,co_white',
    `l_text:Arial_46_bold_center:${enc(job.salary || 'Ej angivet')},g_center,y_40,w_900,c_fit,co_white`,
    `l_text:Arial_46_bold_center:${enc(job.expiryDate || 'Löpande')},g_center,y_140,w_900,c_fit,co_white`,
    'l_text:Arial_44_bold_center:Ansök nu på,g_center,y_300,w_900,c_fit,co_white',
    `l_text:Arial_52_bold_center:ACASTING.SE,g_center,y_${custom?.titleY ? custom.titleY + 640 : 390},w_900,c_fit,co_rgb:${accentColor}`,
    'f_jpg'
  ].join('/');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}.jpg`;
}