import { NextResponse } from 'next/server';
import { fetchAcastingJobs } from '@/lib/acasting';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch fresh jobs from Acasting
    const jobs = await fetchAcastingJobs();

    // Get IDs of already processed jobs from DB
    const processed = await db.processedJob.findMany({
      select: { jobId: true, status: true },
    });
    const processedMap = new Map(processed.map((p) => [p.jobId, p.status]));

    // Annotate jobs with their processing status
    const annotated = jobs.map((job) => ({
      ...job,
      processedStatus: processedMap.get(String(job.id)) ?? null,
    }));

    return NextResponse.json({ jobs: annotated, total: annotated.length });
  } catch (error) {
    console.error('Jobs fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}
