import { NextRequest, NextResponse } from 'next/server';
import { 
  uploadImageToCloudinary, 
  buildOverlayUrl, 
  buildHDDownloadUrl, 
  generatePlaceholderAndUpload 
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
      customSettings 
    } = body;

    if (!jobId || !title) {
      return NextResponse.json({ error: 'jobId and title are required' }, { status: 400 });
    }

    // 1. Caricamento immagine originale su Cloudinary
    let publicId: string;
    try {
      if (originalImage && originalImage.startsWith('http')) {
        publicId = await uploadImageToCloudinary(originalImage);
      } else {
        publicId = await generatePlaceholderAndUpload(title);
      }
    } catch (e) {
      console.error('Errore Cloudinary:', e);
      publicId = await generatePlaceholderAndUpload(title);
    }

    // 2. Formattazione dati
    const safeSlugOrId = slugOrId || String(jobId);
    const safeExpiryDate = expiryDate ? String(expiryDate).split('T')[0] : 'Löpande';
    const formattedSalary = !salary || salary === 'Ej angivet' ? 'Ej angivet' : String(salary);

    const jobData = {
      id: String(jobId),
      title: title || 'Casting',
      salary: formattedSalary,
      city: city || null,
      expiryDate: safeExpiryDate,
      slugOrId: safeSlugOrId,
      imageUrl: originalImage || null,
    };

    // 3. Generazione URL ad alta qualità con customSettings
    const generatedImageUrl = buildOverlayUrl(publicId, jobData as any, style as ImageStyle, customSettings);
    const hdDownloadUrl = buildHDDownloadUrl(publicId, jobData as any, style as ImageStyle, customSettings);

    // 4. Salvataggio Database
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
