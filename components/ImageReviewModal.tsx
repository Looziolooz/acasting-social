'use client';

import { useState, useEffect } from 'react';
import { X, Check, RotateCcw, Send, Loader2, ExternalLink, Facebook, Instagram, Linkedin, AlertCircle, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import type { AcastingJob, ImageStyle, Platform, PublishResult } from '@/lib/types';
import { STYLE_LABELS, PLATFORM_CONFIG } from '@/lib/types';

interface AnnotatedJob extends AcastingJob { processedStatus: string | null; }

interface Props {
  job: AnnotatedJob; imageUrl: string | null; currentStyle: ImageStyle; generating: boolean;
  onRegenerate: (style: ImageStyle) => void; onPublished: (platforms: string[]) => void; onClose: () => void;
}

type Step = 'preview' | 'platforms' | 'publishing' | 'done';

const TikTokIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.37a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.8z"/>
  </svg>
);

const PlatformIcon = ({ platform }: { platform: Platform }) => {
  switch (platform) {
    case 'facebook': return <Facebook size={16} />;
    case 'instagram': return <Instagram size={16} />;
    case 'linkedin': return <Linkedin size={16} />;
    case 'tiktok': return <TikTokIcon />;
  }
};

export default function ImageReviewModal({ job, imageUrl, currentStyle, generating, onRegenerate, onPublished, onClose }: Props) {
  const [step, setStep] = useState<Step>('preview');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'facebook']);
  const [customCaption, setCustomCaption] = useState('');
  const [publishResults, setPublishResults] = useState<PublishResult[]>([]);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const handlePublish = async () => {
    if (!selectedPlatforms.length) return;
    setPublishing(true); setStep('publishing');
    try {
      const res = await fetch('/api/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: String(job.id), platforms: selectedPlatforms, customCaption: customCaption || undefined }),
      });
      const data = await res.json();
      setPublishResults(data.results || []); setStep('done');
      const successful = (data.results as PublishResult[]).filter((r) => r.success).map((r) => r.platform);
      if (successful.length > 0) onPublished(successful);
    } finally { setPublishing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-4xl rounded-3xl overflow-hidden animate-slide-up"
        style={{ background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.06)', maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h2 className="font-display font-bold text-white text-lg leading-tight line-clamp-1">{job.title}</h2>
            <p className="text-white/40 text-xs mt-0.5 font-mono">{job.city && `${job.city} · `}{job.salary && `${job.salary} kr`}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row overflow-y-auto" style={{ maxHeight: 'calc(92vh - 68px)' }}>
          {/* Image Preview */}
          <div className="md:w-[340px] flex-shrink-0 p-5 flex flex-col gap-4">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16]" style={{ minHeight: '300px' }}>
              {generating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 skeleton">
                  <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-light)' }} />
                  <span className="text-white/60 text-sm">Generating...</span>
                </div>
              ) : imageUrl ? (
                <Image src={imageUrl} alt="Preview" fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">Select a style to generate</div>
              )}
            </div>
            {imageUrl && (
              <a href={imageUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-white/40 hover:text-white/70 transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <ExternalLink size={12} /> Open original image
              </a>
            )}
          </div>

          {/* Right Panel */}
          <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">
            {step === 'preview' && (
              <>
                <div>
                  <h3 className="text-white/60 text-xs font-mono uppercase tracking-wider mb-3">Image Style</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(STYLE_LABELS) as [ImageStyle, typeof STYLE_LABELS[ImageStyle]][]).map(([styleKey, config]) => (
                      <button key={styleKey} onClick={() => onRegenerate(styleKey)} disabled={generating}
                        className={`px-3 py-3 rounded-xl text-left transition-all hover:opacity-90 ${currentStyle === styleKey ? 'ring-2' : ''}`}
                        style={{ background: currentStyle === styleKey ? 'rgba(124,58,237,0.15)' : 'var(--surface-3)', border: `1px solid ${currentStyle === styleKey ? 'rgba(124,58,237,0.4)' : 'transparent'}` }}>
                        <div className="font-medium text-sm text-white">{config.label}</div>
                        <div className="text-xs text-white/40 mt-0.5">{config.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ background: 'var(--surface-3)' }}>
                  <h3 className="text-white/60 text-xs font-mono uppercase tracking-wider mb-3">Listing Details</h3>
                  <dl className="space-y-2">
                    {[
                      ['Title', job.title],
                      ['City', job.city || '—'],
                      ['Fee', job.salary ? `${job.salary} kr` : 'Not specified'],
                      ['Deadline', job.expiryDate ? job.expiryDate.split('T')[0] : 'Rolling'],
                      ['Category', job.category || '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4 text-sm">
                        <dt className="text-white/40 flex-shrink-0">{label}</dt>
                        <dd className="text-white/80 text-right truncate">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <a href={`https://www.acasting.se/explore/jobs/${job.slugOrId}`} target="_blank" rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-1.5 text-xs transition-colors" style={{ color: 'var(--accent-light)' }}>
                    <ExternalLink size={11} /> View on Acasting.se
                  </a>
                </div>

                <div className="flex gap-3 mt-auto pt-2">
                  <button onClick={() => onRegenerate(currentStyle)} disabled={generating}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                    style={{ background: 'var(--surface-3)', color: 'rgba(255,255,255,0.6)' }}>
                    <RotateCcw size={14} /> Regenerate
                  </button>
                  <button onClick={() => setStep('platforms')} disabled={!imageUrl || generating}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))', color: 'white' }}>
                    <Check size={14} /> Approve
                  </button>
                </div>
              </>
            )}

            {step === 'platforms' && (
              <>
                <div>
                  <h3 className="font-display font-bold text-white mb-1">Where to publish?</h3>
                  <p className="text-white/40 text-sm">Select one or more platforms</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(([platform, config]) => {
                    const selected = selectedPlatforms.includes(platform);
                    return (
                      <button key={platform} onClick={() => togglePlatform(platform)}
                        className={`flex items-center gap-3 p-4 rounded-xl transition-all ${selected ? 'ring-1' : ''}`}
                        style={{ background: selected ? `${config.color}18` : 'var(--surface-3)', border: `1px solid ${selected ? `${config.color}55` : 'transparent'}` }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: selected ? config.color : 'var(--surface-4)', color: 'white' }}>
                          <PlatformIcon platform={platform} />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-sm text-white">{config.label}</div>
                          <div className={`text-xs mt-0.5 ${selected ? 'text-white/60' : 'text-white/30'}`}>{selected ? 'Selected' : 'Click to add'}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="text-white/60 text-xs font-mono uppercase tracking-wider mb-2 block">Custom Caption (optional)</label>
                  <textarea value={customCaption} onChange={(e) => setCustomCaption(e.target.value)}
                    placeholder="Leave empty to use the auto-generated caption..." rows={4}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:ring-1"
                    style={{ background: 'var(--surface-3)', border: '1px solid rgba(255,255,255,0.06)', '--tw-ring-color': 'var(--accent)' } as React.CSSProperties} />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep('preview')} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium"
                    style={{ background: 'var(--surface-3)', color: 'rgba(255,255,255,0.6)' }}>Back</button>
                  <button onClick={handlePublish} disabled={!selectedPlatforms.length}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))', color: 'white' }}>
                    <Send size={14} /> Publish to {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''}
                  </button>
                </div>
              </>
            )}

            {step === 'publishing' && (
              <div className="flex flex-col items-center justify-center gap-4 py-12">
                <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse-ring"
                  style={{ background: 'rgba(124,58,237,0.1)', border: '2px solid var(--accent)' }}>
                  <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
                </div>
                <h3 className="font-display font-bold text-white text-xl">Publishing...</h3>
                <div className="flex gap-3">
                  {selectedPlatforms.map((p) => (
                    <div key={p} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                      style={{ background: 'var(--surface-3)', color: 'rgba(255,255,255,0.5)' }}>
                      <PlatformIcon platform={p} /> {PLATFORM_CONFIG[p].label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="flex flex-col gap-4">
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '2px solid #10b981' }}>
                    <CheckCircle2 size={28} className="text-emerald-400" />
                  </div>
                  <h3 className="font-display font-bold text-white text-xl">Done!</h3>
                </div>
                <div className="space-y-2">
                  {publishResults.map((result) => (
                    <div key={result.platform} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'var(--surface-3)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: PLATFORM_CONFIG[result.platform].color }}>
                          <PlatformIcon platform={result.platform} />
                        </div>
                        <span className="text-sm font-medium text-white">{PLATFORM_CONFIG[result.platform].label}</span>
                      </div>
                      {result.success ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs"><CheckCircle2 size={14} /> Published</div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-400 text-xs" title={result.error}><AlertCircle size={14} /> Error</div>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-medium mt-2"
                  style={{ background: 'var(--surface-3)', color: 'rgba(255,255,255,0.7)' }}>Close</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
