import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudinary, buildOverlayUrl, buildHDDownloadUrl, generatePlaceholderAndUpload } from '@/lib/cloudinary';
import { db } from '@/lib/db';
import type { ImageStyle, CustomImageSettings } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, title, salary, city, expiryDate, slugOrId, originalImage, style = 'cinematic', customSettings } = body;

    // Validazione base
    if (!jobId || !title) {
      return NextResponse.json({ error: 'jobId and title are required' }, { status: 400 });
    }

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

    const safeSlugOrId = slugOrId || String(jobId);
    const safeExpiryDate = expiryDate ? String(expiryDate).split('T')[0] : null;

    // Preparazione dati per i generatori di URL Cloudinary
    const jobData = {
      id: String(jobId),
      title: title || '',
      description: body.description || '',
      salary: salary != null ? String(salary) : null, // Conversione esplicita in stringa
      city: city || null,
      expiryDate: safeExpiryDate,
      slugOrId: safeSlugOrId,
      category: body.category || null,
      imageUrl: originalImage || null,
      createdAt: new Date().toISOString(),
    };

    const parsedCustom: CustomImageSettings | undefined = customSettings || undefined;
    const generatedImageUrl = buildOverlayUrl(publicId, jobData, style as ImageStyle, parsedCustom);
    const hdDownloadUrl = buildHDDownloadUrl(publicId, jobData, style as ImageStyle, parsedCustom);

    // Salvataggio o aggiornamento nel Database con Prisma
    await db.processedJob.upsert({
      where: { jobId: String(jobId) },
      create: {
        jobId: String(jobId),
        title: title || 'Untitled',
        // Risolve l'errore PrismaClientValidationError: converte Int in String
        salary: salary != null ? String(salary) : null,
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
        // Assicura che anche l'aggiornamento riceva una stringa
        salary: salary != null ? String(salary) : null,
      },
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