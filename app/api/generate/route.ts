import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudinary, buildOverlayUrl, generatePlaceholderAndUpload } from '@/lib/cloudinary';
import { db } from '@/lib/db';
import type { ImageStyle } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, title, salary, city, expiryDate, slugOrId, category, description, originalImage, style = 'dark' } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    // Caricamento immagine originale o placeholder
    let publicId: string;
    try {
      if (originalImage && originalImage.startsWith('http')) {
        publicId = await uploadImageToCloudinary(originalImage);
      } else {
        publicId = await generatePlaceholderAndUpload(title);
      }
    } catch (uploadError) {
      console.error("Upload failure, falling back to placeholder:", uploadError);
      publicId = await generatePlaceholderAndUpload(title);
    }

    // Costruzione dell'URL con overlay
    const jobDataForOverlay = { id: jobId, title, salary, city, expiryDate, slugOrId, category, description, createdAt: '', imageUrl: originalImage };
    const generatedImageUrl = buildOverlayUrl(publicId, jobDataForOverlay, style as ImageStyle);

    // Salvataggio nel DB (Prisma)
    const record = await db.processedJob.upsert({
      where: { jobId: String(jobId) },
      create: {
        jobId: String(jobId),
        title,
        description,
        salary,
        city,
        expiryDate: expiryDate ? expiryDate.split('T')[0] : null,
        slugOrId,
        category,
        originalImage,
        generatedImage: generatedImageUrl,
        style,
        status: 'generated',
      },
      update: {
        generatedImage: generatedImageUrl,
        style,
        status: 'generated',
      },
    });

    return NextResponse.json({ success: true, imageUrl: generatedImageUrl, record });
  } catch (error) {
    console.error('Critical generation API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}