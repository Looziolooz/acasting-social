// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { uploadFinalImage, getPreviewUrl } from '@/lib/cloudinary';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, title, salary, city, expiryDate, originalImage } = body;

    if (!originalImage) return NextResponse.json({ error: 'No image' }, { status: 400 });

    // 1. Scarichiamo l'immagine originale per caricarla sul TUO Cloudinary
    const imageRes = await fetch(originalImage);
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    // 2. Carichiamo l'immagine "pulita"
    const uploaded: any = await uploadFinalImage(imageBuffer, jobId);

    // 3. Generiamo l'URL con Overlay (logica n8n)
    const finalImageUrl = getPreviewUrl(uploaded.secure_url, { title, salary, expiryDate });

    // 4. Salva nel DB
    await db.processedJob.upsert({
      where: { jobId: String(jobId) },
      create: {
        jobId: String(jobId),
        title,
        status: 'generated',
        generatedImage: finalImageUrl,
        slugOrId: jobId,
      },
      update: {
        generatedImage: finalImageUrl,
        status: 'generated'
      }
    });

    return NextResponse.json({ success: true, imageUrl: finalImageUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}