import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudinary, buildOverlayUrl, generatePlaceholderAndUpload } from '@/lib/cloudinary';
import { db } from '@/lib/db';
import type { ImageStyle } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, title, salary, city, expiryDate, slugOrId, category, description, originalImage, style = 'dark' } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    // Build a job object compatible with buildOverlayUrl
    const jobData = {
      id: jobId,
      title,
      salary,
      city,
      expiryDate,
      slugOrId,
      category,
      description,
      imageUrl: originalImage,
      createdAt: new Date().toISOString(),
    };

    // Upload source image to Cloudinary (or use placeholder)
    let publicId: string;
    if (originalImage) {
      publicId = await uploadImageToCloudinary(originalImage);
    } else {
      publicId = await generatePlaceholderAndUpload(title);
    }

    // Build overlay URL
    const generatedImageUrl = buildOverlayUrl(publicId, jobData, style as ImageStyle);

    // Save/update in DB
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

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      record,
    });
  } catch (error) {
    console.error('Generate image error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
