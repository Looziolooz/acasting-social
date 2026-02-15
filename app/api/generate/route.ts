// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  uploadImageToCloudinary,
  buildOverlayUrl,
  buildHDDownloadUrl,
  generatePlaceholderAndUpload,
} from '@/lib/cloudinary';
import { db } from '@/lib/db';
import type { ImageStyle, CustomImageSettings } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      jobId,
      title,
      salary,
      city,
      expiryDate,
      slugOrId,
      originalImage,
      style = 'cinematic',
      customSettings,
    } = body;

    console.log('🎬 Starting generation:', { jobId, title: title?.substring(0, 40), style });

    if (!jobId || !title) {
      return NextResponse.json(
        { error: 'jobId and title are required' },
        { status: 400 }
      );
    }

    // 1. Upload + quality detection
    let uploadResult;
    try {
      if (originalImage && originalImage.startsWith('http')) {
        console.log(`📸 Source: ${originalImage.substring(0, 100)}...`);
        uploadResult = await uploadImageToCloudinary(originalImage);
      } else {
        console.log('⚠️ No source image, using placeholder');
        uploadResult = await generatePlaceholderAndUpload(title);
      }
    } catch (e) {
      console.error('❌ Upload failed, falling back to placeholder:', e);
      uploadResult = await generatePlaceholderAndUpload(title);
    }

    console.log(
      `📊 Source analysis: ${uploadResult.width}x${uploadResult.height}, ` +
      `${(uploadResult.bytes / 1024).toFixed(1)} KB → Quality: ${uploadResult.quality.toUpperCase()}`
    );

    // 2. Format data
    const safeSlugOrId = slugOrId || String(jobId);
    const safeExpiryDate = expiryDate
      ? String(expiryDate).split('T')[0]
      : 'Löpande';
    const formattedSalary =
      !salary || salary === 'Ej angivet' ? 'Ej angivet' : String(salary);

    const jobData = {
      id: String(jobId),
      title: title || 'Casting',
      salary: formattedSalary,
      city: city || null,
      expiryDate: safeExpiryDate,
      slugOrId: safeSlugOrId,
      imageUrl: originalImage || null,
    };

    // 3. Build URLs with quality-aware pipeline
    const generatedImageUrl = buildOverlayUrl(
      uploadResult.publicId,
      jobData as any,
      style as ImageStyle,
      customSettings,
      uploadResult.quality // 🆕 Passa la qualità rilevata
    );

    const hdDownloadUrl = buildHDDownloadUrl(
      uploadResult.publicId,
      jobData as any,
      style as ImageStyle,
      customSettings,
      uploadResult.quality // 🆕 Passa la qualità rilevata
    );

    console.log(`🎨 Quality pipeline: ${uploadResult.quality.toUpperCase()}`);
    console.log(`   Preview: ${generatedImageUrl.substring(0, 150)}...`);

    // 4. Save to database
    await db.processedJob.upsert({
      where: { jobId: String(jobId) },
      create: {
        jobId: String(jobId),
        title: title || 'Untitled',
        salary: String(formattedSalary),
        city: city || null,
        expiryDate: safeExpiryDate,
        slugOrId: safeSlugOrId,
        originalImage: originalImage || null,
        generatedImage: generatedImageUrl,
        style: style || 'cinematic',
        status: 'generated',
      },
      update: {
        generatedImage: generatedImageUrl,
        style: style || 'cinematic',
        status: 'generated',
        salary: String(formattedSalary),
        title: title || 'Untitled',
      },
    });

    console.log('💾 Saved to DB');

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      hdDownloadUrl,
      publicId: uploadResult.publicId,
      sourceQuality: uploadResult.quality, // 🆕 Ritorna al frontend
      sourceDimensions: `${uploadResult.width}x${uploadResult.height}`,
    });
  } catch (error) {
    console.error('❌ Generate error:', error);
    return NextResponse.json(
      {
        error: String(error),
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}