'use client';

import { MapPin, Clock, Coins, Sparkles, SkipForward, CheckCircle2, Share2 } from 'lucide-react';
import type { AcastingJob, ImageStyle } from '@/lib/types';
import { STYLE_LABELS } from '@/lib/types';
import { useState } from 'react';
import Image from 'next/image';

interface AnnotatedJob extends AcastingJob {
  processedStatus: string | null;
}

interface Props {
  job: AnnotatedJob;
  index: number;
  onGenerate: (style: ImageStyle) => void;
  onSkip: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  published: '#10b981',
  generated: '#F59E0B',
  skipped: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  published: 'Pubblicato',
  generated: 'Generato',
  skipped: 'Saltato',
};

export default function JobCard({ job, index, onGenerate, onSkip }: Props) {
  const [showStyles, setShowStyles] = useState(false);
  const isDone = job.processedStatus === 'published';
  const isSkipped = job.processedStatus === 'skipped';

  const animDelay = Math.min(index * 60, 400);

  return (
    <div
      className="relative rounded-2xl overflow-hidden card-hover"
      style={{
        background: 'var(--surface-2)',
        border: `1px solid ${isDone ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)'}`,
        animationDelay: `${animDelay}ms`,
        animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
        opacity: isSkipped ? 0.45 : 1,
      }}>
      {/* Image */}
      <div className="relative h-40 overflow-hidden"
        style={{ background: 'var(--surface-3)' }}>
        {job.imageUrl ? (
          <Image
            src={job.imageUrl}
            alt={job.title}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface-4)' }}>
              <Sparkles size={20} style={{ color: 'var(--accent-light)' }} />
            </div>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(18,18,31,0.9) 0%, transparent 60%)' }} />

        {/* Status badge */}
        {job.processedStatus && STATUS_LABELS[job.processedStatus] && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: `${STATUS_COLORS[job.processedStatus]}22`,
              border: `1px solid ${STATUS_COLORS[job.processedStatus]}44`,
              color: STATUS_COLORS[job.processedStatus],
            }}>
            {STATUS_LABELS[job.processedStatus]}
          </div>
        )}

        {/* Category */}
        {job.category && (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-mono"
            style={{ background: 'rgba(124,58,237,0.3)', color: 'var(--accent-light)' }}>
            {job.category}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-display font-bold text-white leading-tight mb-3 line-clamp-2"
          style={{ fontSize: '1rem' }}>
          {job.title}
        </h3>

        <div className="flex flex-col gap-1.5 mb-4">
          {job.city && (
            <div className="flex items-center gap-2 text-white/50 text-xs">
              <MapPin size={12} />
              <span>{job.city}</span>
            </div>
          )}
          {job.salary && (
            <div className="flex items-center gap-2 text-white/50 text-xs">
              <Coins size={12} />
              <span>{job.salary} kr</span>
            </div>
          )}
          {job.expiryDate && (
            <div className="flex items-center gap-2 text-white/50 text-xs">
              <Clock size={12} />
              <span>Scade: {job.expiryDate.split('T')[0]}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isDone && !isSkipped ? (
          <div className="flex flex-col gap-2">
            {/* Style selector dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStyles((p) => !p)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))', color: 'white' }}>
                <Sparkles size={14} />
                Genera Immagine
              </button>

              {showStyles && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-10 shadow-2xl"
                  style={{ background: 'var(--surface-3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {(Object.entries(STYLE_LABELS) as [ImageStyle, typeof STYLE_LABELS[ImageStyle]][]).map(
                    ([styleKey, config]) => (
                      <button
                        key={styleKey}
                        onClick={() => {
                          setShowStyles(false);
                          onGenerate(styleKey);
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left">
                        <div>
                          <div className="text-sm font-medium text-white">{config.label}</div>
                          <div className="text-xs text-white/40">{config.desc}</div>
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <button
              onClick={onSkip}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-white/30 hover:text-white/60 transition-colors">
              <SkipForward size={12} />
              Salta
            </button>
          </div>
        ) : isDone ? (
          <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm"
            style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
            <CheckCircle2 size={14} />
            <span className="font-medium">Pubblicato</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm"
            style={{ background: 'rgba(107,114,128,0.1)', color: '#6B7280' }}>
            <SkipForward size={14} />
            <span>Saltato</span>
          </div>
        )}
      </div>
    </div>
  );
}
