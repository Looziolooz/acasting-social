import { NextRequest, NextResponse } from 'next/server';
import { publishToFacebook } from '@/lib/social/facebook';
import { publishToInstagram } from '@/lib/social/instagram';
import { publishToLinkedIn } from '@/lib/social/linkedin';
import { publishToTikTok } from '@/lib/social/tiktok';
import { buildCaption } from '@/lib/caption';
import { db } from '@/lib/db';
import type { Platform, PublishResult } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, platforms, customCaption } = body as {
      jobId: string;
      platforms: Platform[];
      customCaption?: string;
    };

    if (!jobId || !platforms?.length) {
      return NextResponse.json({ error: 'jobId and platforms are required' }, { status: 400 });
    }

    // Load job from DB
    const job = await db.processedJob.findUnique({ where: { jobId } });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (!job.generatedImage) {
      return NextResponse.json({ error: 'No generated image found' }, { status: 400 });
    }

    // Build job data for caption builder
    const jobData = {
      id: job.jobId,
      title: job.title,
      description: job.description || '',
      salary: job.salary,
      city: job.city,
      expiryDate: job.expiryDate,
      slugOrId: job.slugOrId,
      category: job.category,
      imageUrl: job.originalImage,
      createdAt: job.createdAt.toISOString(),
    };

    const results: PublishResult[] = await Promise.all(
      platforms.map(async (platform) => {
        const caption = customCaption || buildCaption(jobData, platform);
        const imageUrl = job.generatedImage!;

        switch (platform) {
          case 'facebook':
            return { platform, ...await publishToFacebook(imageUrl, caption) };
          case 'instagram':
            return { platform, ...await publishToInstagram(imageUrl, caption) };
          case 'linkedin':
            return { platform, ...await publishToLinkedIn(imageUrl, caption) };
          case 'tiktok':
            return { platform, ...await publishToTikTok(imageUrl, caption) };
          default:
            return { platform, success: false, error: 'Unknown platform' };
        }
      })
    );

    const successPlatforms = results.filter((r) => r.success).map((r) => r.platform);
    const allSuccess = successPlatforms.length === platforms.length;

    if (successPlatforms.length > 0) {
      await db.processedJob.update({
        where: { jobId },
        data: {
          status: 'published',
          publishedTo: JSON.stringify(successPlatforms),
          publishedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: allSuccess,
      results,
      publishedTo: successPlatforms,
    });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
