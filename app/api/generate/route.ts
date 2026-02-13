import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudinary, buildOverlayUrl, generatePlaceholderAndUpload } from '@/lib/cloudinary';
import { db } from '@/lib/db';
import type { ImageStyle } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, title, salary, city, expiryDate, slugOrId, originalImage, style = 'dark' } = body;

    let publicId: string;
    if (originalImage && originalImage.startsWith('http')) {
      publicId = await uploadImageToCloudinary(originalImage);
    } else {
      publicId = await generatePlaceholderAndUpload(title);
    }

    const generatedImageUrl = buildOverlayUrl(publicId, body, style as ImageStyle);

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
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}