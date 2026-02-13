import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudinary, buildOverlayUrl, generatePlaceholderAndUpload } from '@/lib/cloudinary';
import { db } from '@/lib/db';
import type { ImageStyle } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, title, salary, city, expiryDate, slugOrId, originalImage, style = 'dark', description, category } = body;

    if (!jobId) return NextResponse.json({ error: 'jobId mancante' }, { status: 400 });

    let publicId: string;
    try {
      if (originalImage && originalImage.startsWith('http')) {
        publicId = await uploadImageToCloudinary(originalImage);
      } else {
        publicId = await generatePlaceholderAndUpload(title);
      }
    } catch (e) {
      publicId = await generatePlaceholderAndUpload(title);
    }

    const generatedImageUrl = buildOverlayUrl(publicId, body, style as ImageStyle);

    // FIX CRITICO: Passiamo a Prisma solo i campi esistenti nel modello schema.prisma
    await db.processedJob.upsert({
      where: { jobId: String(jobId) },
      create: {
        jobId: String(jobId),
        title: title || 'Casting',
        description: description || null,
        salary: salary || null,
        city: city || null,
        expiryDate: expiryDate ? String(expiryDate).split('T')[0] : null,
        slugOrId: slugOrId || String(jobId),
        category: category || null,
        originalImage: originalImage || null,
        generatedImage: generatedImageUrl,
        style: String(style),
        status: 'generated',
      },
      update: {
        generatedImage: generatedImageUrl,
        status: 'generated',
      },
    });

    return NextResponse.json({ success: true, imageUrl: generatedImageUrl });
  } catch (error: any) {
    console.error('[API Generate] Errore Prisma:', error);
    return NextResponse.json({ error: 'Errore validazione database' }, { status: 500 });
  }
}