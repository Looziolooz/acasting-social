// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateSocialImage } from '@/lib/image-generator';
import { uploadFinalImage, getPreviewUrl } from '@/lib/cloudinary';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, title, salary, expiryDate, originalImage } = body;

    if (!originalImage) return NextResponse.json({ error: 'Nessuna immagine fornita' }, { status: 400 });

    // 1. Download immagine tramite Sharp
    const generated = await generateSocialImage(originalImage);

    // 2. Upload immagine pulita su Cloudinary
    const uploaded: any = await uploadFinalImage(generated.buffer, String(jobId));

    // 3. Generazione URL finale con Overlay (Logica n8n)
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
    console.error('Errore generazione:', error);
    return NextResponse.json({ error: 'Generazione fallita' }, { status: 500 });
  }
}