// app/api/alternatives/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { findAlternativeImages } from '@/lib/pexels';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, category, description, originalImageUrl } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    const alternatives = await findAlternativeImages(
      title,
      category,
      description,
      originalImageUrl,
      8 // max 8 risultati
    );

    return NextResponse.json({ alternatives });
  } catch (error) {
    console.error('❌ Alternatives error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}