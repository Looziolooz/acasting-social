import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Recupera la cronologia dei lavori pubblicati.
 */
export async function GET() {
  try {
    const history = await db.processedJob.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ history });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * Imposta lo stato di un lavoro come 'skipped' (saltato).
 * Utilizza upsert per gestire i casi in cui il lavoro non è ancora nel DB.
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    await db.processedJob.upsert({
      where: { jobId },
      update: { status: 'skipped' },
      create: {
        jobId,
        status: 'skipped',
        title: 'Skipped Job', // Valore richiesto dal modello Prisma
        slugOrId: jobId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * NUOVA FUNZIONE: Ripristina un lavoro portandolo dallo stato 'skipped' a 'pending'.
 * Permette alla card di ricomparire nella lista principale.
 */
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    await db.processedJob.update({
      where: { jobId },
      data: { status: 'pending' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}