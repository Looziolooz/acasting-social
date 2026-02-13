'use client';

import { MapPin, Clock, Coins, Sparkles, SkipForward, CheckCircle2, RotateCcw } from 'lucide-react';
import type { AnnotatedJob, ImageStyle, CustomImageSettings } from '@/lib/types';
import Image from 'next/image';

interface Props { 
  job: AnnotatedJob; 
  index: number; 
  onGenerate: (style: ImageStyle, custom?: CustomImageSettings) => void | Promise<void>; 
  onSkip: () => void | Promise<void>;
  onRestore: () => void | Promise<void>; 
}

const STATUS_COLORS: Record<string, string> = { published: '#10b981', generated: '#F59E0B', skipped: '#6B7280' };
const STATUS_LABELS: Record<string, string> = { published: 'Published', generated: 'Generated', skipped: 'Skipped' };

export default function JobCard({ job, index, onGenerate, onSkip, onRestore }: Props) {
  const isDone = job.processedStatus === 'published';
  const isSkipped = job.processedStatus === 'skipped';
  const animDelay = Math.min(index * 60, 400);

  return (
    <div className="relative rounded-2xl overflow-hidden card-hover"
      style={{
        background: 'var(--surface-2)',
        border: `1px solid ${isDone ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)'}`,
        animationDelay: `${animDelay}ms`,
        animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
        opacity: isSkipped ? 0.6 : 1,
      }}>
      <div className="relative h-40 overflow-hidden" style={{ background: 'var(--surface-3)' }}>
        {job.imageUrl ? (
          <Image src={job.imageUrl} alt={job.title} fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-4)' }}>
              <Sparkles size={20} style={{ color: 'var(--accent-light)' }} />
            </div>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(18,18,31,0.9) 0%, transparent 60%)' }} />

        {job.processedStatus && STATUS_LABELS[job.processedStatus] && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: `${STATUS_COLORS[job.processedStatus]}22`, border: `1px solid ${STATUS_COLORS[job.processedStatus]}44`, color: STATUS_COLORS[job.processedStatus] }}>
            {STATUS_LABELS[job.processedStatus]}
          </div>
        )}

        {job.category && (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-mono"
            style={{ background: 'rgba(124,58,237,0.3)', color: 'var(--accent-light)' }}>
            {job.category}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-display font-bold text-white leading-tight mb-3 line-clamp-2" style={{ fontSize: '1rem' }}>{job.title}</h3>

        <div className="flex flex-col gap-1.5 mb-4">
          {job.city && <div className="flex items-center gap-2 text-white/50 text-xs"><MapPin size={12} /><span>{job.city}</span></div>}
          {job.salary && <div className="flex items-center gap-2 text-white/50 text-xs"><Coins size={12} /><span>{job.salary} kr</span></div>}
          {job.expiryDate && <div className="flex items-center gap-2 text-white/50 text-xs"><Clock size={12} /><span>Expires: {job.expiryDate.split('T')[0]}</span></div>}
        </div>

        {!isDone && !isSkipped ? (
          <div className="flex flex-col gap-2">
            <button onClick={() => onGenerate('cinematic')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))', color: 'white' }}>
              <Sparkles size={14} /> Generate Image
            </button>
            <button onClick={onSkip} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-white/30 hover:text-white/60 transition-colors font-medium">
              <SkipForward size={12} /> Skip listing
            </button>
          </div>
        ) : isDone ? (
          <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
            <CheckCircle2 size={14} /><span className="font-medium">Published</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(107,114,128,0.1)', color: '#6B7280' }}>
              <SkipForward size={14} /><span>Skipped</span>
            </div>
            <button 
              onClick={onRestore} 
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all border border-white/10 text-accent-light hover:bg-accent/10"
            >
              <RotateCcw size={12} /> Restore Job
            </button>
          </div>
        )}
      </div>
    </div>
  );
}