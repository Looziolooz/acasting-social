import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudinary, buildOverlayUrl, buildHDDownloadUrl, generatePlaceholderAndUpload } from '@/lib/cloudinary';
import { db } from '@/lib/db';
import type { ImageStyle, CustomImageSettings } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, title, salary, city, expiryDate, slugOrId, originalImage, style = 'cinematic', customSettings } = body;

    let publicId: string;
    try {
      if (originalImage?.startsWith('http')) {
        publicId = await uploadImageToCloudinary(originalImage);
      } else {
        publicId = await generatePlaceholderAndUpload(title);
      }
    } catch (e) {
      publicId = await generatePlaceholderAndUpload(title);
    }

    const jobData = {
      id: String(jobId),
      title: title || '',
      description: body.description || '',
      salary: salary || null,
      city: city || null,
      expiryDate: expiryDate ? String(expiryDate).split('T')[0] : null,
      slugOrId: slugOrId || '',
      category: body.category || null,
      imageUrl: originalImage || null,
      createdAt: new Date().toISOString(),
    };

    const parsedCustom: CustomImageSettings | undefined = customSettings || undefined;
    const generatedImageUrl = buildOverlayUrl(publicId, jobData, style as ImageStyle, parsedCustom);
    const hdDownloadUrl = buildHDDownloadUrl(publicId, jobData, style as ImageStyle, parsedCustom);

    await db.processedJob.upsert({
      where: { jobId: String(jobId) },
      create: {
        jobId: String(jobId),
        title, salary, city,
        expiryDate: expiryDate ? String(expiryDate).split('T')[0] : null,
        slugOrId, originalImage,
        generatedImage: generatedImageUrl,
        style, status: 'generated',
      },
      update: { generatedImage: generatedImageUrl, style, status: 'generated' },
    });

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      hdDownloadUrl,
    });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}