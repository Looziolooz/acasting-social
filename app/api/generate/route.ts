import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudinary, buildOverlayUrl, buildHDDownloadUrl, generatePlaceholderAndUpload } from '@/lib/cloudinary';
import { db } from '@/lib/db';
import type { ImageStyle, CustomImageSettings } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Estraiamo i dati assicurandoci che jobId sia una stringa
    const { jobId, title, salary, city, expiryDate, slugOrId, originalImage, style = 'cinematic', customSettings } = body;

    if (!jobId || !title) {
      return NextResponse.json({ error: 'jobId and title are required' }, { status: 400 });
    }

    // 1. Upload o Placeholder su Cloudinary
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

    // 2. Formattazione dati per Cloudinary (Logica del tuo Workflow originale)
    const safeSlugOrId = slugOrId || String(jobId);
    const safeExpiryDate = expiryDate ? String(expiryDate).split('T')[0] : 'Löpande';
    
    // Assicuriamoci che il salario sia trattato come nel tuo workflow
    const formattedSalary = !salary || salary === 'Ej angivet' 
      ? 'Ej angivet' 
      : String(salary);

    const jobData = {
      id: String(jobId),
      title: title || 'Casting',
      description: body.description || '',
      salary: formattedSalary,
      city: city || null,
      expiryDate: safeExpiryDate,
      slugOrId: safeSlugOrId,
      category: body.category || null,
      imageUrl: originalImage || null,
      createdAt: new Date().toISOString(),
    };

    // 3. Generazione URL (Logica HD Overlay)
    const parsedCustom: CustomImageSettings | undefined = customSettings || undefined;
    const generatedImageUrl = buildOverlayUrl(publicId, jobData, style as ImageStyle, parsedCustom);
    const hdDownloadUrl = buildHDDownloadUrl(publicId, jobData, style as ImageStyle, parsedCustom);

    // 4. FIX PRISMA: Upsert con conversione forzata a String
    await db.processedJob.upsert({
      where: { jobId: String(jobId) },
      create: {
        jobId: String(jobId),
        title: jobData.title,
        // Forziamo String per evitare PrismaClientValidationError
        salary: String(jobData.salary), 
        city: jobData.city,
        expiryDate: jobData.expiryDate,
        slugOrId: jobData.slugOrId,
        originalImage: jobData.imageUrl,
        generatedImage: generatedImageUrl,
        style: style || 'cinematic',
        status: 'generated',
      },
      update: {
        generatedImage: generatedImageUrl,
        style: style || 'cinematic',
        status: 'generated',
        // Aggiorniamo anche qui come stringa per sicurezza
        salary: String(jobData.salary),
        title: jobData.title,
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