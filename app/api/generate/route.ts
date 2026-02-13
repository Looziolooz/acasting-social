import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudinary, buildOverlayUrl, generatePlaceholderAndUpload } from '@/lib/cloudinary';
import { db } from '@/lib/db';
import type { ImageStyle } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, title, salary, city, expiryDate, slugOrId, originalImage, style = 'dark' } = body;

    console.log(`[API Generate] Ricevuta richiesta per jobId: ${jobId}`);

    if (!jobId) return NextResponse.json({ error: 'jobId mancante' }, { status: 400 });

    let publicId: string;
    try {
      if (originalImage && originalImage.startsWith('http')) {
        publicId = await uploadImageToCloudinary(originalImage);
      } else {
        console.log("[API Generate] Nessuna immagine originale, uso placeholder");
        publicId = await generatePlaceholderAndUpload(title);
      }
    } catch (e) {
      console.error("[API Generate] Fallimento upload, ripiego su placeholder HD:", e);
      publicId = await generatePlaceholderAndUpload(title);
    }

    const generatedImageUrl = buildOverlayUrl(publicId, body, style as ImageStyle);
    console.log(`[API Generate] Immagine generata: ${generatedImageUrl}`);

    // Salvataggio DB
    await db.processedJob.upsert({
      where: { jobId: String(jobId) },
      create: {
        jobId: String(jobId),
        title,
        salary,
        city,
        expiryDate: expiryDate ? expiryDate.split('T')[0] : null,
        slugOrId,
        originalImage,
        generatedImage: generatedImageUrl,
        style,
        status: 'generated',
      },
      update: {
        generatedImage: generatedImageUrl,
        status: 'generated',
      },
    });

    return NextResponse.json({ success: true, imageUrl: generatedImageUrl });
  } catch (error: any) {
    console.error('[API Generate] Errore irreversibile:', error);
    return NextResponse.json({ error: error.message || 'Errore interno' }, { status: 500 });
  }
}