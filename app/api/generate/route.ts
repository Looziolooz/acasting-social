// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateSocialImage } from '@/lib/image-generator';
import { uploadFinalImage, getPreviewUrl, getDownloadUrl } from '@/lib/cloudinary';
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

    console.log('🎬 Generating:', { jobId, title: title?.substring(0, 40), style });

    if (!jobId || !title) {
      return NextResponse.json({ error: 'jobId and title required' }, { status: 400 });
    }

    // Build job data
    const safeExpiryDate = expiryDate ? String(expiryDate).split('T')[0] : 'Löpande';
    const formattedSalary = !salary || salary === 'Ej angivet' ? 'Ej angivet' : String(salary);

    const jobData = {
      id: String(jobId),
      title: title || 'Casting',
      salary: formattedSalary,
      city: city || null,
      expiryDate: safeExpiryDate,
      slugOrId: slugOrId || String(jobId),
      imageUrl: originalImage || null,
    };

    // 🔥 Step 1: Generate image server-side with Sharp
    const generated = await generateSocialImage(
      originalImage || null,
      jobData as any,
      style as ImageStyle,
      customSettings as CustomImageSettings
    );

    // 🔥 Step 2: Upload final image to Cloudinary (just for hosting)
    const uploaded = await uploadFinalImage(generated.buffer, String(jobId));

    // URLs
    const previewUrl = getPreviewUrl(uploaded.secureUrl);
    const hdDownloadUrl = getDownloadUrl(uploaded.secureUrl);

    console.log(`📊 Result: ${generated.sourceQuality.toUpperCase()} source → ${generated.width}x${generated.height}`);
    console.log(`🔗 Preview: ${previewUrl}`);

    // Step 3: Save to database
    await db.processedJob.upsert({
      where: { jobId: String(jobId) },
      create: {
        jobId: String(jobId),
        title: title || 'Untitled',
        salary: String(formattedSalary),
        city: city || null,
        expiryDate: safeExpiryDate,
        slugOrId: slugOrId || String(jobId),
        originalImage: originalImage || null,
        generatedImage: previewUrl,
        style: style || 'cinematic',
        status: 'generated',
      },
      update: {
        generatedImage: previewUrl,
        style: style || 'cinematic',
        status: 'generated',
        salary: String(formattedSalary),
        title: title || 'Untitled',
      },
    });

    return NextResponse.json({
      success: true,
      imageUrl: previewUrl,
      hdDownloadUrl,
      sourceQuality: generated.sourceQuality,
      sourceDimensions: `${generated.width}x${generated.height}`,
    });
  } catch (error) {
    console.error('❌ Generate error:', error);
    return NextResponse.json(
      { error: String(error), details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}