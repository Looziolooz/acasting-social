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

    const jobData = { ...body, title, salary, city, expiryDate, slugOrId };
    const generatedImageUrl = buildOverlayUrl(publicId, jobData, style as ImageStyle, customSettings as CustomImageSettings);
    const hdDownloadUrl = buildHDDownloadUrl(publicId, jobData, style as ImageStyle, customSettings as CustomImageSettings);

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
      publicId, // Return for potential re-generation without re-upload
    });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: "Errore API generazione" }, { status: 500 });
  }
}