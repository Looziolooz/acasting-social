import { NextRequest, NextResponse } from 'next/server';
import { buildCaption } from '@/lib/caption';
import type { Platform } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { job, platforms } = body as {
      job: {
        id: string;
        title: string;
        description?: string;
        salary?: string | null;
        city?: string | null;
        expiryDate?: string | null;
        slugOrId: string;
        category?: string | null;
        imageUrl?: string | null;
        createdAt?: string;
      };
      platforms: Platform[];
    };

    if (!job || !platforms?.length) {
      return NextResponse.json({ error: 'job and platforms required' }, { status: 400 });
    }

    const jobData = {
      id: job.id,
      title: job.title,
      description: job.description || '',
      salary: job.salary || null,
      city: job.city || null,
      expiryDate: job.expiryDate || null,
      slugOrId: job.slugOrId,
      category: job.category || null,
      imageUrl: job.imageUrl || null,
      createdAt: job.createdAt || new Date().toISOString(),
    };

    const captions: Record<string, string> = {};
    for (const platform of platforms) {
      captions[platform] = buildCaption(jobData, platform);
    }

    return NextResponse.json({ captions });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}