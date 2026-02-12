import { NextResponse } from 'next/server';

const ACASTING_API_URL =
  'https://www.acasting.se/api/trpc/shared.jobs.query.listJobs?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22page%22%3A0%2C%22pageSize%22%3A50%2C%22orderBy%22%3A%22createdAt%22%2C%22orderByDirection%22%3A%22desc%22%7D%7D%7D';

export async function GET() {
  // Step 1: Fetch Acasting jobs
  let jobs: unknown[] = [];
  try {
    const response = await fetch(ACASTING_API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AcastingSocial/1.0)',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Acasting API error: ${response.status}`, jobs: [] },
        { status: 502 }
      );
    }

    const raw = await response.json();
    jobs = raw?.[0]?.result?.data?.json?.jobs ?? [];
  } catch (err) {
    console.error('[jobs/route] Fetch error:', err);
    return NextResponse.json({ error: String(err), jobs: [] }, { status: 500 });
  }

  // Step 2: Try to get processed job IDs from DB (non-blocking)
  let processedMap = new Map<string, string>();
  try {
    const { db } = await import('@/lib/db');
    const processed = await db.processedJob.findMany({
      select: { jobId: true, status: true },
    });
    processedMap = new Map(processed.map((p) => [p.jobId, p.status]));
  } catch (err) {
    // DB not ready yet — proceed without it
    console.warn('[jobs/route] DB not ready, skipping processed lookup:', err);
  }

  // Step 3: Annotate jobs
  const annotated = jobs.map((job: unknown) => {
    const j = job as Record<string, unknown>;
    return {
      ...j,
      // Normalize salary to string
      salary: j.salary != null ? String(j.salary) : null,
      processedStatus: processedMap.get(String(j.id)) ?? null,
    };
  });

  return NextResponse.json({ jobs: annotated, total: annotated.length });
}