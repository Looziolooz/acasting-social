// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import type { AcastingJob, ImageStyle, CustomImageSettings } from './types';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * 🎯 UPLOAD OTTIMIZZATO - PRESERVA QUALITÀ ORIGINALE
 * Carica l'immagine su Cloudinary mantenendo la massima qualità
 */
export async function uploadImageToCloudinary(imageUrl: string): Promise<string> {
  try {
    // Fetch con headers per bypassare restrizioni
    const response = await fetch(imageUrl, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      } 
    });
    
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} - ${response.statusText}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    
    console.log(`📥 Uploading image: ${imageUrl.substring(0, 100)}...`);
    console.log(`📦 Buffer size: ${(buffer.length / 1024).toFixed(2)} KB`);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'acasting',
          // 🔥 PARAMETRI CRITICI PER QUALITÀ HD
          quality: 'auto:best',        // Usa la migliore qualità automatica
          fetch_format: 'auto',        // Formato ottimale (mantiene originale se migliore)
          flags: 'preserve_transparency', // Preserva trasparenza se presente
          resource_type: 'image',
          type: 'upload',
          overwrite: false,
          invalidate: true,
          // ⚠️ NON ridimensionare in upload, lo faremo nelle trasformazioni
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            return reject(error);
          }
          console.log(`✅ Upload successful: ${result!.public_id}`);
          console.log(`📊 Original: ${result!.width}x${result!.height}, ${(result!.bytes / 1024).toFixed(2)} KB`);
          resolve(result!.public_id);
        }
      );
      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

/**
 * Genera placeholder HD se l'immagine originale non è disponibile
 */
export async function generatePlaceholderAndUpload(jobTitle: string): Promise<string> {
  const url = `https://placehold.co/1080x1920/0D0D1A/7C3AED.png?text=${encodeURIComponent(jobTitle)}`;
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { 
        folder: 'acasting/placeholders',
        quality: 100,
        fetch_format: 'png'
      }, 
      (err, res) => {
        if (err) return reject(err);
        resolve(res!.public_id);
      }
    ).end(buffer);
  });
}

const enc = (text: string) =>
  encodeURIComponent(text || '')
    .replace(/,/g, '%2C')
    .replace(/\//g, '%2F');

function cfColor(color?: string): string {
  if (!color || color === 'white') return 'rgb:FFFFFF';
  if (color === 'black') return 'rgb:000000';
  const hex = color.startsWith('#') ? color.slice(1) : color;
  return `rgb:${hex}`;
}

/**
 * 🎯 BUILD URL OTTIMIZZATO - OVERLAY HD SU IMMAGINE ORIGINALE
 * Applica overlay mantenendo la qualità dell'immagine originale
 */
export function buildOverlayUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'cinematic',
  custom?: CustomImageSettings
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  // Parametri qualità personalizzabili
  const width = custom?.outputWidth ?? 1080;
  const height = custom?.outputHeight ?? 1920;
  const quality = custom?.outputQuality ?? 90;  // Ridotto a 90 per bilanciare qualità/dimensioni
  const format = custom?.outputFormat ?? 'auto'; // auto = WebP/AVIF dove supportato
  const progressive = custom?.enableProgressive !== false;

  // Parametri testo e stile
  const titleText = custom?.titleText || job.title || 'Casting';
  const titleSize = custom?.titleSize ?? 54;
  const titleColor = cfColor(custom?.titleColor);
  const titleY = custom?.titleY ?? -250;
  const titleFont = custom?.titleFont ?? 'Arial';

  const bodySize = custom?.subtitleSize ?? 46;
  const bodyColor = cfColor(custom?.subtitleColor || 'white');
  const bodyFont = custom?.subtitleFont ?? 'Arial';

  const ctaText = custom?.ctaText ?? 'ACASTING.SE';
  const accentColor = cfColor(custom?.accentColor ?? '7C3AED');

  const brightness = custom?.brightness ?? (
    style === 'noir' ? -90 : style === 'purple' ? -60 : -85
  );

  const salaryText = !job.salary || job.salary === 'Ej angivet'
    ? 'Arvode: Ej angivet'
    : `Arvode: ${job.salary} kr`;
  const expiryText = `Ansök senast: ${job.expiryDate?.split('T')[0] || 'Löpande'}`;

  /**
   * 🔥 STRATEGIA OTTIMALE:
   * 1. Usa immagine ORIGINALE ad alta risoluzione (no downscale in upload)
   * 2. Ridimensiona a 1080x1920 SOLO nella trasformazione finale
   * 3. Applica q_auto:best per qualità intelligente
   * 4. Usa f_auto per formato ottimale (WebP/AVIF)
   * 5. Aggiungi dpr_2.0 per Retina displays
   */
  const transforms = [
    // 🎯 FASE 1: Ridimensionamento dall'originale HD
    `w_${width},h_${height},c_fill,g_auto,dpr_2.0`,
    
    // 🎯 FASE 2: Qualità e formato
    'q_auto:best',           // Qualità automatica migliore
    `f_${format}`,           // Formato ottimale (WebP/AVIF su browser supportati)
    ...(progressive ? ['fl_progressive:steep'] : []),
    'fl_lossy',              // Compressione intelligente
    
    // 🎯 FASE 3: Effetti immagine
    `e_brightness:${brightness}`,
    'e_sharpen:80',          // Sharpening per testi più nitidi
    
    // 🎯 FASE 4: Text Overlays
    `l_text:${titleFont}_${titleSize}_bold_center:${enc(titleText)},g_center,y_${titleY},w_940,c_fit,co_${titleColor}`,
    'l_text:Arial_65_bold:__,g_center,y_-80,co_rgb:FFFFFF',
    `l_text:${bodyFont}_${bodySize}_bold_center:${enc(salaryText)},g_center,y_40,w_900,c_fit,co_${bodyColor}`,
    `l_text:${bodyFont}_${bodySize}_bold_center:${enc(expiryText)},g_center,y_140,w_900,c_fit,co_${bodyColor}`,
    `l_text:${bodyFont}_44_bold_center:${enc('Ansök nu på')},g_center,y_300,w_900,c_fit,co_${bodyColor}`,
    `l_text:${titleFont}_48_bold_center:${enc(ctaText)},g_center,y_380,w_900,c_fit,co_${accentColor}`
  ].join('/');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}`;
}

/**
 * 🎯 URL DOWNLOAD HD - VERSIONE MASSIMA QUALITÀ
 * Per download usa PNG lossless
 */
export function buildHDDownloadUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'cinematic',
  custom?: CustomImageSettings
): string {
  // Per il download, forza PNG a qualità 100
  const downloadSettings: CustomImageSettings = {
    ...custom,
    outputQuality: 100,
    outputFormat: 'png',
    enableProgressive: true,
    useLossyPNG: false, // Disabilita lossy per download
  };
  
  return buildOverlayUrl(publicId, job, style, downloadSettings);
}
