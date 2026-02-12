import type { AcastingJob } from './types';

const ACASTING_API_URL =
  'https://www.acasting.se/api/trpc/shared.jobs.query.listJobs?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22page%22%3A0%2C%22pageSize%22%3A50%2C%22orderBy%22%3A%22createdAt%22%2C%22orderByDirection%22%3A%22desc%22%7D%7D%7D';

export async function fetchAcastingJobs(): Promise<AcastingJob[]> {
  const response = await fetch(ACASTING_API_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AcastingSocial/1.0)',
      Accept: 'application/json',
    },
    next: { revalidate: 0 }, // always fresh
  });

  if (!response.ok) {
    throw new Error(`Acasting API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const jobs: AcastingJob[] = data?.[0]?.result?.data?.json?.jobs ?? [];
  return jobs;
}

export function buildAcastingJobUrl(slugOrId: string): string {
  return `https://www.acasting.se/explore/jobs/${slugOrId}`;
}

export function formatSalary(salary: string | null): string {
  if (!salary || salary === 'Ej angivet') return 'Ej angivet';
  return `${salary} kr`;
}

export function formatExpiryDate(expiryDate: string | null): string {
  if (!expiryDate) return 'Löpande';
  return expiryDate.split('T')[0];
}
