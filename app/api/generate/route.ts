import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudinary, buildOverlayUrl, buildHDDownloadUrl, generatePlaceholderAndUpload } from '@/lib/cloudinary';
import { db } from '@/lib/db';
import type { ImageStyle, CustomImageSettings } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Extrahera data från Acasting-listing
    const { 
      jobId, 
      title, 
      salary, 
      city, 
      expiryDate, 
      slugOrId, 
      originalImage, // Denna URL kommer från acasting.se
      style = 'cinematic', 
      customSettings 
    } = body;

    // Grundläggande validering
    if (!jobId || !title) {
      return NextResponse.json({ error: 'jobId and title are required' }, { status: 400 });
    }

    // 1. Extrahera och ladda upp bild till Cloudinary (Fix för Acasting URL)
    let publicId: string;
    try {
      if (originalImage && originalImage.startsWith('http')) {
        // Laddar upp bilden som extraherats från Acasting till Cloudinary
        publicId = await uploadImageToCloudinary(originalImage);
      } else {
        // Fallback om ingen bild finns i annonsen
        publicId = await generatePlaceholderAndUpload(title);
      }
    } catch (e) {
      console.error('Cloudinary upload error:', e);
      publicId = await generatePlaceholderAndUpload(title);
    }

    // 2. Formatera data enligt din ursprungliga workflow-logik
    const safeSlugOrId = slugOrId || String(jobId);
    const safeExpiryDate = expiryDate ? String(expiryDate).split('T')[0] : 'Löpande';
    
    // Workflow Fix: Hantera "Ej angivet" och konvertera tal till sträng
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

    // 3. Generera Cloudinary URLs med overlay (Telegram Fix)
    const parsedCustom: CustomImageSettings | undefined = customSettings || undefined;
    const generatedImageUrl = buildOverlayUrl(publicId, jobData, style as ImageStyle, parsedCustom);
    const hdDownloadUrl = buildHDDownloadUrl(publicId, jobData, style as ImageStyle, parsedCustom);

    // 4. FIX PRISMA: Upsert med tvingad String-konvertering för salary
    await db.processedJob.upsert({
      where: { jobId: String(jobId) },
      create: {
        jobId: String(jobId),
        title: jobData.title,
        // Förhindrar PrismaClientValidationError genom att skicka sträng istället för Int
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