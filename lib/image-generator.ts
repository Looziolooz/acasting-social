// lib/image-generator.ts — Server-side image generation with Sharp
import sharp from 'sharp';
import type { AcastingJob, ImageStyle, CustomImageSettings } from './types';

export interface GeneratedImage {
  buffer: Buffer;
  width: number;
  height: number;
  sourceQuality: 'high' | 'medium' | 'low';
}

function getImageUrlCandidates(imageUrl: string): string[] {
  const candidates: string[] = [];
  if (imageUrl.includes('assets.acasting.se')) {
    const blobMatch = imageUrl.match(/plain\/(https:\/\/acasting\.blob\.core\.windows\.net\/.+)/);
    if (blobMatch) candidates.push(blobMatch[1]);
    candidates.push(imageUrl.replace(/w:\d+/, 'w:2000'));
    candidates.push(imageUrl.replace(/w:\d+/, 'w:1200'));
  }
  if (imageUrl.includes('acasting.blob.core.windows.net') && !candidates.includes(imageUrl)) {
    candidates.unshift(imageUrl);
  }
  if (!candidates.includes(imageUrl)) candidates.push(imageUrl);
  return candidates;
}

async function fetchSourceImage(imageUrl: string): Promise<Buffer | null> {
  const candidates = getImageUrlCandidates(imageUrl);
  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 1024) continue;
      return buffer;
    } catch { continue; }
  }
  return null;
}

function classifyQuality(width: number, height: number): 'high' | 'medium' | 'low' {
  const mp = (width * height) / 1_000_000;
  if (mp >= 1.5) return 'high';
  if (mp >= 0.5) return 'medium';
  return 'low';
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  return lines;
}

function buildTextOverlaySvg(job: AcastingJob, width: number, height: number, style: ImageStyle, custom?: CustomImageSettings): Buffer {
  const titleText = custom?.titleText || job.title || 'Casting';
  const accentHex = custom?.accentColor ?? '7C3AED';
  const titleSize = custom?.titleSize ?? 56;
  const salaryText = !job.salary || job.salary === 'Ej angivet' ? 'Arvode: Ej angivet' : `Arvode: ${job.salary} kr`;
  const expiryText = `Ansök senast: ${job.expiryDate?.split('T')[0] || 'Löpande'}`;
  const titleLines = wrapText(titleText, 28);
  const titleStartY = height * 0.38;
  const separatorY = titleStartY + (titleLines.length * (titleSize + 8)) + 30;
  const salaryY = separatorY + 80;
  const expiryY = salaryY + 70;
  const ctaLabelY = expiryY + 100;
  const ctaBrandY = ctaLabelY + 60;
  let gradientColor = style === 'noir' ? '0,0,0' : (style === 'purple' ? '45,15,80' : '13,13,26');

  const titleSvgLines = titleLines.map((line, i) => 
    `<text x="${width/2}" y="${titleStartY + i*(titleSize+8)}" font-family="Arial" font-size="${titleSize}" font-weight="bold" fill="white" text-anchor="middle">${escapeXml(line)}</text>`
  ).join('\n');

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(${gradientColor}, 0)" />
        <stop offset="100%" stop-color="rgba(${gradientColor}, 0.9)" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#grad)" />
    ${titleSvgLines}
    <line x1="${width/2 - 30}" y1="${separatorY}" x2="${width/2 + 30}" y2="${separatorY}" stroke="white" stroke-width="3" />
    <text x="${width/2}" y="${salaryY}" font-family="Arial" font-size="46" font-weight="bold" fill="white" text-anchor="middle">${escapeXml(salaryText)}</text>
    <text x="${width/2}" y="${expiryY}" font-family="Arial" font-size="46" font-weight="bold" fill="white" text-anchor="middle">${escapeXml(expiryText)}</text>
    <text x="${width/2}" y="${ctaLabelY}" font-family="Arial" font-size="42" fill="white" text-anchor="middle">Ansök nu på</text>
    <text x="${width/2}" y="${ctaBrandY}" font-family="Arial" font-size="48" font-weight="bold" fill="#${accentHex}" text-anchor="middle">ACASTING.SE</text>
  </svg>`;
  return Buffer.from(svg);
}

export async function generateSocialImage(imageUrl: string | null, job: AcastingJob, style: ImageStyle = 'cinematic', custom?: CustomImageSettings): Promise<GeneratedImage> {
  const W = custom?.outputWidth ?? 1080;
  const H = custom?.outputHeight ?? 1920;
  let sourceQuality: 'high' | 'medium' | 'low' = 'low';
  let backgroundBuffer: Buffer;

  if (imageUrl) {
    const sourceBuffer = await fetchSourceImage(imageUrl);
    if (sourceBuffer) {
      const metadata = await sharp(sourceBuffer).metadata();
      sourceQuality = classifyQuality(metadata.width || 0, metadata.height || 0);
      let bgPipeline = sharp(sourceBuffer).resize(W, H, { fit: 'cover', position: 'center' });

      // Miglioramento qualità (Allineato a n8n)
      if (sourceQuality === 'low') {
  bgPipeline = bgPipeline
    .modulate({ brightness: 0.6, saturation: 1.1 })
    .sharpen({ sigma: 1.5, m1: 0.5 }); // Recovers detail rather than blurring
} else {
        bgPipeline = bgPipeline.modulate({ brightness: 0.55 }).sharpen({ sigma: 1.0 });
      }

      if (style === 'noir') bgPipeline = bgPipeline.greyscale();
      else if (style === 'purple') bgPipeline = bgPipeline.tint({ r: 45, g: 15, b: 80 });

      backgroundBuffer = await bgPipeline.png().toBuffer();
    } else { backgroundBuffer = await sharp({ create: { width: W, height: H, channels: 4, background: '#0D0D1A' } }).png().toBuffer(); }
  } else { backgroundBuffer = await sharp({ create: { width: W, height: H, channels: 4, background: '#0D0D1A' } }).png().toBuffer(); }

  const textSvg = buildTextOverlaySvg(job, W, H, style, custom);
  const finalBuffer = await sharp(backgroundBuffer).composite([{ input: textSvg, top: 0, left: 0 }]).png({ compressionLevel: 9, quality: 100 }).toBuffer();

  return { buffer: finalBuffer, width: W, height: H, sourceQuality };
}