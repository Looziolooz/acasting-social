// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { uploadFinalImage, getPreviewUrl } from '@/lib/cloudinary';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, title, salary, expiryDate, originalImage } = body;

    if (!originalImage) return NextResponse.json({ error: 'Manca immagine sorgente' }, { status: 400 });

    // 1. Scarichiamo l'immagine originale (senza elaborarla con Sharp per evitare Fontconfig error)
    const imageRes = await fetch(originalImage);
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    // 2. Upload immagine originale su Cloudinary
    const uploaded: any = await uploadFinalImage(imageBuffer, String(jobId));

    // 3. Generazione URL finale con Overlay (replica n8n)
    const finalImageUrl = getPreviewUrl(uploaded.secure_url, { title, salary, expiryDate });

    // 4. Update Database
    await db.processedJob.upsert({
      where: { jobId: String(jobId) },
      create: {
        jobId: String(jobId),
        title,
        status: 'generated',
        generatedImage: finalImageUrl,
        slugOrId: jobId,
        originalImage,
      },
      update: {
        generatedImage: finalImageUrl,
        status: 'generated'
      }
    });

    return NextResponse.json({ success: true, imageUrl: finalImageUrl });
  } catch (error) {
    console.error('Generation Error:', error);
    return NextResponse.json({ error: 'Errore durante la generazione' }, { status: 500 });
  }
}