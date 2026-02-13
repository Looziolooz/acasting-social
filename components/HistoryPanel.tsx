'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Calendar, Share2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { PLATFORM_CONFIG } from '@/lib/types';
import type { Platform } from '@/lib/types';

interface HistoryJob {
  id: string; jobId: string; title: string; salary: string | null;
  city: string | null; generatedImage: string | null;
  publishedTo: string | null; publishedAt: string | null; slugOrId: string;
}

export default function HistoryPanel() {
  const [history, setHistory] = useState<HistoryJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history').then((r) => r.json()).then((d) => setHistory(d.history || [])).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} /></div>;
  }

  if (!history.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-white/20">
        <Share2 size={48} className="mb-4 opacity-30" />
        <p className="font-display text-xl">No published posts</p>
        <p className="text-sm mt-2">Published posts will appear here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {history.map((item, i) => {
        const platforms: Platform[] = item.publishedTo ? JSON.parse(item.publishedTo) : [];
        return (
          <div key={item.id} className="rounded-2xl overflow-hidden card-hover"
            style={{ background: 'var(--surface-2)', border: '1px solid rgba(16,185,129,0.12)', animation: 'slideUp 0.3s ease both', animationDelay: `${i * 50}ms` }}>
            <div className="relative h-48" style={{ background: 'var(--surface-3)' }}>
              {item.generatedImage ? (
                <Image src={item.generatedImage} alt={item.title} fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center"><CheckCircle2 size={24} className="text-emerald-400 opacity-30" /></div>
              )}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(18,18,31,0.95) 0%, transparent 50%)' }} />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="font-display font-bold text-white text-sm line-clamp-2 leading-tight">{item.title}</p>
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {platforms.map((p) => (
                  <span key={p} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                    style={{ background: `${PLATFORM_CONFIG[p].color}20`, color: PLATFORM_CONFIG[p].color }}>
                    {PLATFORM_CONFIG[p].label}
                  </span>
                ))}
              </div>
              {item.publishedAt && (
                <div className="flex items-center gap-1.5 text-white/30 text-xs">
                  <Calendar size={11} />
                  {new Date(item.publishedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
