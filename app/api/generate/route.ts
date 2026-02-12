import { NextRequest, NextResponse } from 'next/server';
import {
  generateOverlayImage,
  generatePlaceholderAndUpload,
} from '@/lib/cloudinary';
import { db } from '@/lib/db';
import type { ImageStyle, CustomOverlayStyle } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      jobId, title, salary, city, expiryDate,
      slugOrId, category, description, originalImage,
      style = 'dark', customStyle,
    } = body;

    console.log('[generate] START | jobId:', jobId, '| style:', style, '| image:', originalImage);

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const jobData = {
      id: String(jobId),
      title: title || '',
      salary: salary ? String(salary) : null,
      city: city || null,
      expiryDate: expiryDate || null,
      slugOrId: slugOrId || String(jobId),
      category: category || null,
      description: description || '',
      imageUrl: originalImage || null,
      createdAt: new Date().toISOString(),
    };

    // Source URL: use Acasting image or generate a placeholder
    const sourceUrl = originalImage ||
      await generatePlaceholderAndUpload(title);

    // Generate overlay — server-side processing, returns a clean direct URL
    const generatedImageUrl = await generateOverlayImage(
      typeof sourceUrl === 'string' ? sourceUrl : sourceUrl,
      jobData,
      style as ImageStyle,
      customStyle as CustomOverlayStyle | undefined
    );
    console.log('[generate] Done:', generatedImageUrl);

    // Save to DB
    const record = await db.processedJob.upsert({
      where: { jobId: String(jobId) },
      create: {
        jobId: String(jobId), title, description,
        salary: salary ? String(salary) : null,
        city,
        expiryDate: expiryDate ? expiryDate.split('T')[0] : null,
        slugOrId, category, originalImage,
        generatedImage: generatedImageUrl, style, status: 'generated',
      },
      update: { generatedImage: generatedImageUrl, style, status: 'generated' },
    });

    return NextResponse.json({ success: true, imageUrl: generatedImageUrl, record });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[generate] ERROR:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
