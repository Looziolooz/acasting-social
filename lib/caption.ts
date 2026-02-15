import type { AcastingJob, Platform } from './types';

function formatSalary(salary: string | null): string {
  if (!salary || salary === 'Ej angivet') return 'salary not specified';
  return `${salary} kr`;
}

function formatDeadline(expiryDate: string | null): string {
  if (!expiryDate) return 'open deadline';
  return expiryDate.split('T')[0];
}

export function buildCaption(job: AcastingJob, platform: Platform): string {
  const title    = job.title || 'Casting Call';
  const city     = job.city || 'Sweden';
  const salary   = formatSalary(job.salary);
  const deadline = formatDeadline(job.expiryDate);
  const link     = `https://www.acasting.se/explore/jobs/${job.slugOrId}`;

  switch (platform) {
    case 'instagram':
      return `🎬 ${title}

📍 ${city}
💰 ${salary}
⏰ Deadline: ${deadline}

Apply now on Acasting.se — link in bio!

#casting #acasting #castingcall #skådespeleri #sweden #filmjobb #statist #reklam #actor #audition`;

    case 'facebook':
      return `🎬 New Casting Call on Acasting.se

${title}

📍 Location: ${city}
💰 Salary: ${salary}
⏰ Apply by: ${deadline}

👉 Apply here: ${link}

Share this post to help reach the right candidate! 🎯`;

    case 'linkedin':
      return `🎬 Casting Opportunity | ${title}

We are looking for the right candidate for an upcoming production.

📍 Location: ${city}
💰 Compensation: ${salary}
📅 Application deadline: ${deadline}

Interested? Apply directly on Acasting.se:
${link}

#casting #filmproduction #talent #acasting #sweden`;

    case 'tiktok':
      return `🎬 ${title} 📍 ${city} 💰 ${salary} — Apply on Acasting.se! ⏰ Deadline: ${deadline} #casting #acasting #castingcall #sweden #actor`;

    default:
      return `🎬 ${title}\n📍 ${city} · 💰 ${salary} · ⏰ ${deadline}\n\n${link}`;
  }
}
