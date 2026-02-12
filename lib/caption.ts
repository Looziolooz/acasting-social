import type { AcastingJob, Platform } from './types';
import { buildAcastingJobUrl } from './acasting';

export function buildCaption(job: AcastingJob, platform: Platform): string {
  const url = buildAcastingJobUrl(job.slugOrId);
  const salary = job.salary ? `${job.salary} kr` : 'Ej angivet';
  const city = job.city || 'Sverige';
  const expiry = job.expiryDate ? job.expiryDate.split('T')[0] : 'Löpande';

  const base = `🎬 NY CASTING | ${job.title}

📍 ${city}
💰 Arvode: ${salary}
📅 Ansök senast: ${expiry}

${job.description ? job.description.slice(0, 200) + (job.description.length > 200 ? '...' : '') : ''}

🔗 Ansök nu: ${url}`;

  const hashtags = {
    facebook: '\n\n#casting #film #skådespelare #acasting #teater #reklam #figurer',
    instagram:
      '\n\n#casting #film #skådespelare #acasting #teater #reklam #figurant #castingsweden #sweden #model',
    linkedin: '\n\n#casting #film #entertainment #acasting #rekrytering #kreativt',
    tiktok: '\n\n#casting #film #skådespelare #acasting #fyp #foryou #sweden',
  }[platform];

  return (base + hashtags).slice(0, platform === 'tiktok' ? 2200 : 63206);
}
