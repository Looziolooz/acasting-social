// components/ImageReviewModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, Check, Loader2, Download, Copy,
  Sliders, CheckCircle2, Facebook, Instagram, Linkedin,
  AlertCircle, Eye, Palette, ImageIcon,
  Clipboard, ExternalLink
} from 'lucide-react';
import type { AnnotatedJob, ImageStyle, Platform, PublishResult, CustomImageSettings } from '@/lib/types';
import {
  STYLE_LABELS, PLATFORM_CONFIG, AVAILABLE_FONTS,
  COLOR_PRESETS, DEFAULT_CUSTOM_SETTINGS
} from '@/lib/types';

interface Props {
  job: AnnotatedJob;
  imageUrl: string | null;
  currentStyle: ImageStyle;
  generating: boolean;
  onRegenerate: (style: ImageStyle, custom?: CustomImageSettings) => void;
  onPublished: (platforms: string[]) => void;
  onClose: () => void;
}

type Step = 'preview' | 'platforms' | 'publishing' | 'done';
type RightTab = 'style' | 'captions' | 'export';

const PlatformIcon = ({ platform, size = 16 }: { platform: Platform; size?: number }) => {
  switch (platform) {
    case 'facebook': return <Facebook size={size} />;
    case 'instagram': return <Instagram size={size} />;
    case 'linkedin': return <Linkedin size={size} />;
    case 'tiktok': return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.37a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.8z" /></svg>;
  }
};

function ColorPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <div className="text-[10px] text-white/40 uppercase font-mono mb-2 tracking-wider">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {COLOR_PRESETS.map((c) => (
          <button key={c.value} onClick={() => onChange(c.value)} title={c.label}
            className={`w-7 h-7 rounded-lg border-2 transition-all ${value === c.value ? 'border-accent scale-110 shadow-lg' : 'border-white/10 hover:border-white/30'}`}
            style={{ background: c.hex }} />
        ))}
      </div>
    </div>
  );
}

function FontSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <div className="text-[10px] text-white/40 uppercase font-mono mb-2 tracking-wider">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-accent/50"
        style={{ background: 'var(--surface-3)' }}>
        {AVAILABLE_FONTS.map((f) => (
          <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
        ))}
      </select>
    </div>
  );
}

function SliderControl({ label, value, min, max, unit, onChange }: {
  label: string; value: number; min: number; max: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-white/40 mb-1.5 uppercase font-mono tracking-wider">
        <span>{label}</span>
        <span className="text-accent-light font-bold">{value}{unit || 'px'}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 bg-surface-4 rounded-lg appearance-none cursor-pointer accent-purple-500" />
    </div>
  );
}

export default function ImageReviewModal({
  job, imageUrl, currentStyle, generating,
  onRegenerate, onPublished, onClose
}: Props) {
  const [step, setStep] = useState<Step>('preview');
  const [rightTab, setRightTab] = useState<RightTab>('style');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'facebook']);
  const [publishResults, setPublishResults] = useState<PublishResult[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState<string | null>(null);
  const [copiedImageLink, setCopiedImageLink] = useState(false);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [loadingCaptions, setLoadingCaptions] = useState(false);
  const [customSet, setCustomSet] = useState<CustomImageSettings>({ ...DEFAULT_CUSTOM_SETTINGS });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const fetchCaptions = useCallback(async () => {
    setLoadingCaptions(true);
    try {
      const res = await fetch('/api/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job: {
            id: job.id, title: job.title, description: job.description,
            salary: job.salary, city: job.city, expiryDate: job.expiryDate,
            slugOrId: job.slugOrId, category: job.category, imageUrl: job.imageUrl,
            createdAt: job.createdAt,
          },
          platforms: ['facebook', 'instagram', 'linkedin', 'tiktok'],
        }),
      });
      const data = await res.json();
      if (data.captions) setCaptions(data.captions);
    } catch (e) {
      console.error('Failed to fetch captions', e);
    } finally {
      setLoadingCaptions(false);
    }
  }, [job]);

  useEffect(() => {
    if (rightTab === 'captions' || rightTab === 'export') {
      if (!Object.keys(captions).length) fetchCaptions();
    }
  }, [rightTab, fetchCaptions, captions]);

  const downloadImageHD = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `acasting-hd-${job.id}.png`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { console.error('Download failed', e); }
  };

  const downloadImageWithCaption = async () => {
    if (!imageUrl) return;
    await downloadImageHD();
    const caption = buildManualCaption();
    await navigator.clipboard.writeText(caption);
    setCopiedCaption('all');
    setTimeout(() => setCopiedCaption(null), 2500);
  };

  const buildManualCaption = () => {
    return `🎬 NY CASTING | ${job.title}\n\n📍 ${job.city || 'Sverige'}\n💰 Arvode: ${job.salary || 'Ej angivet'}\n📅 Ansök senast: ${job.expiryDate?.split('T')[0] || 'Löpande'}\n\n${job.description ? job.description.slice(0, 200) + '...' : ''}\n\n🔗 Ansök nu: https://www.acasting.se/explore/jobs/${job.slugOrId}`;
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCaption(key);
    setTimeout(() => setCopiedCaption(null), 2000);
  };

  const copyImageUrl = async () => {
    if (!imageUrl) return;
    await navigator.clipboard.writeText(imageUrl);
    setCopiedImageLink(true);
    setTimeout(() => setCopiedImageLink(false), 2000);
  };

  const handlePublish = async () => {
    if (!selectedPlatforms.length) return;
    setPublishing(true); setStep('publishing');
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: String(job.id), platforms: selectedPlatforms }),
      });
      const data = await res.json();
      setPublishResults(data.results || []);
      setStep('done');
      if (data.success) onPublished(selectedPlatforms);
    } catch (e) { setStep('preview'); } finally { setPublishing(false); }
  };

  const updateCustom = (partial: Partial<CustomImageSettings>) => {
    setCustomSet((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-7xl rounded-[32px] overflow-hidden border border-white/10 flex flex-col max-h-[95vh] shadow-2xl"
        style={{ background: 'var(--surface-1)', animation: 'slideUp 0.3s ease both' }}>

        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-display font-bold text-white truncate">{job.title}</h2>
            <p className="text-white/40 text-xs mt-0.5 font-mono">{job.city} · {job.salary} kr · {job.category}</p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            {step === 'preview' && (
              <button onClick={() => setStep('platforms')}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-white/90 transition-all">
                <Check size={14} /> Approve & Publish
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/40 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row overflow-hidden flex-1">
          <div className="md:w-[400px] lg:w-[440px] p-6 bg-black/40 flex flex-col gap-4 border-r border-white/5 overflow-y-auto">
            {/* ANTEPRIMA HD - FIX: Rimosso next/image che sfuocava i testi generati dinamicamente */}
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-surface-0">
              {generating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">HD Rendering...</span>
                </div>
              ) : imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt="HD Preview" 
                  className="w-full h-full object-cover" 
                  style={{ imageRendering: 'auto' }} 
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm font-display uppercase tracking-widest">
                  Select a style to preview
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={downloadImageHD} disabled={!imageUrl || generating}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold transition-all disabled:opacity-30"
                style={{ background: 'var(--surface-3)', color: 'white' }}>
                <Download size={14} /> Save HD
              </button>
              <button onClick={downloadImageWithCaption} disabled={!imageUrl || generating}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold transition-all disabled:opacity-30"
                style={{ background: 'var(--surface-3)', color: 'white' }}>
                <ImageIcon size={14} /> IMG + Caption
              </button>
            </div>
            <button onClick={copyImageUrl} disabled={!imageUrl}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[11px] font-medium transition-all disabled:opacity-30"
              style={{ borderColor: 'rgba(255,255,255,0.1)', color: copiedImageLink ? '#10b981' : 'rgba(255,255,255,0.5)' }}>
              {copiedImageLink ? <><CheckCircle2 size={13} /> URL Copied!</> : <><Copy size={13} /> Copy Image URL</>}
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface-1)' }}>
            {step === 'preview' && (
              <div className="flex border-b border-white/5 px-6">
                {([
                  { key: 'style' as RightTab, label: 'Style & Custom', icon: <Palette size={14} /> },
                  { key: 'captions' as RightTab, label: 'Caption Preview', icon: <Eye size={14} /> },
                  { key: 'export' as RightTab, label: 'Manual Export', icon: <ExternalLink size={14} /> },
                ]).map((t) => (
                  <button key={t.key} onClick={() => setRightTab(t.key)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${rightTab === t.key
                      ? 'text-white border-accent'
                      : 'text-white/30 border-transparent hover:text-white/60'
                    }`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              {step === 'preview' && rightTab === 'style' && (
                <div className="flex flex-col gap-6">
                  <section>
                    <h3 className="text-[10px] font-bold text-white/30 uppercase mb-3 tracking-widest border-l-2 pl-3"
                      style={{ borderColor: 'var(--accent)' }}>Preset Styles</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(STYLE_LABELS).map(([styleKey, config]) => (
                        <button key={styleKey}
                          onClick={() => {
                            if (styleKey === 'custom') {
                              onRegenerate(styleKey as ImageStyle, customSet);
                            } else {
                              onRegenerate(styleKey as ImageStyle);
                            }
                          }}
                          className={`p-4 rounded-2xl text-left border-2 transition-all ${currentStyle === styleKey
                            ? 'border-accent bg-accent/10'
                            : 'border-white/5 hover:border-white/15'
                          }`}
                          style={{ background: currentStyle === styleKey ? undefined : 'var(--surface-2)' }}>
                          <div className="text-sm font-bold text-white">{config.label}</div>
                          <div className="text-[10px] text-white/40 mt-0.5">{config.desc}</div>
                        </button>
                      ))}
                    </div>
                  </section>

                  {currentStyle === 'custom' && (
                    <section className="rounded-2xl border border-accent/20 overflow-hidden"
                      style={{ background: 'rgba(124,58,237,0.04)' }}>
                      <div className="flex items-center gap-2 px-5 py-3 border-b border-accent/10"
                        style={{ color: 'var(--accent-light)' }}>
                        <Sliders size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">Custom Studio</span>
                      </div>

                      <div className="p-5 space-y-5">
                        <div>
                          <div className="text-[10px] text-white/40 uppercase font-mono mb-2 tracking-wider">Title Override</div>
                          <input type="text"
                            value={customSet.titleText || ''}
                            onChange={(e) => updateCustom({ titleText: e.target.value })}
                            placeholder={job.title}
                            className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent/50"
                            style={{ background: 'var(--surface-3)' }} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FontSelect label="Title Font" value={customSet.titleFont || 'Arial'}
                            onChange={(v) => updateCustom({ titleFont: v })} />
                          <FontSelect label="Body Font" value={customSet.subtitleFont || 'Arial'}
                            onChange={(v) => updateCustom({ subtitleFont: v })} />
                        </div>

                        <ColorPicker label="Title Color" value={customSet.titleColor || 'white'}
                          onChange={(v) => updateCustom({ titleColor: v })} />
                        <ColorPicker label="Body Text Color" value={customSet.subtitleColor || 'white'}
                          onChange={(v) => updateCustom({ subtitleColor: v })} />
                        <ColorPicker label="CTA / Accent Color" value={customSet.accentColor || '7C3AED'}
                          onChange={(v) => updateCustom({ accentColor: v, ctaColor: v })} />

                        <SliderControl label="Title Position (Y)" value={customSet.titleY ?? -250}
                          min={-500} max={0} onChange={(v) => updateCustom({ titleY: v })} />
                        <SliderControl label="Title Size" value={customSet.titleSize ?? 54}
                          min={24} max={100} onChange={(v) => updateCustom({ titleSize: v })} />
                        <SliderControl label="Body Size" value={customSet.subtitleSize ?? 46}
                          min={20} max={80} onChange={(v) => updateCustom({ subtitleSize: v })} />
                        <SliderControl label="Brightness" value={customSet.brightness ?? -75}
                          min={-100} max={0} unit="" onChange={(v) => updateCustom({ brightness: v })} />

                        <div>
                          <div className="text-[10px] text-white/40 uppercase font-mono mb-2 tracking-wider">CTA Text</div>
                          <input type="text" value={customSet.ctaText || 'ACASTING.SE'}
                            onChange={(e) => updateCustom({ ctaText: e.target.value })}
                            className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent/50"
                            style={{ background: 'var(--surface-3)' }} />
                        </div>

                        <button onClick={() => onRegenerate('custom', customSet)}
                          className="w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] text-white"
                          style={{ background: 'var(--accent)' }}>
                          Apply Custom Settings
                        </button>
                      </div>
                    </section>
                  )}
                </div>
              )}

              {step === 'preview' && rightTab === 'captions' && (
                <div className="flex flex-col gap-5">
                  {loadingCaptions ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent)' }} />
                    </div>
                  ) : (
                    (Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(([platform, config]) => (
                      <div key={platform} className="rounded-2xl overflow-hidden border border-white/5"
                        style={{ background: 'var(--surface-2)' }}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5"
                          style={{ background: 'var(--surface-3)' }}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: `${config.color}30`, color: config.color }}>
                              <PlatformIcon platform={platform} size={14} />
                            </div>
                            <span className="text-sm font-bold text-white">{config.label}</span>
                          </div>
                          <button onClick={() => copyToClipboard(captions[platform] || '', platform)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-white/5"
                            style={{ color: copiedCaption === platform ? '#10b981' : 'var(--accent-light)' }}>
                            {copiedCaption === platform ? <><CheckCircle2 size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                          </button>
                        </div>
                        <div className="p-4 max-h-48 overflow-y-auto">
                          <pre className="text-[12px] text-white/70 whitespace-pre-wrap leading-relaxed font-sans">
                            {captions[platform] || 'Loading...'}
                          </pre>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {step === 'preview' && rightTab === 'export' && (
                <div className="flex flex-col gap-5">
                  <div className="rounded-2xl overflow-hidden border border-white/10"
                    style={{ background: 'var(--surface-2)' }}>
                    <div className="relative">
                      {imageUrl ? (
                        <div className="relative aspect-video">
                          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(18,18,31,0.8) 0%, transparent 40%)' }} />
                        </div>
                      ) : (
                        <div className="aspect-video flex items-center justify-center" style={{ background: 'var(--surface-3)' }}>
                          <span className="text-white/20 text-xs uppercase">No image generated yet</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5 border-t border-white/5">
                      <pre className="text-[12px] text-white/70 whitespace-pre-wrap leading-relaxed font-sans max-h-40 overflow-y-auto">
                        {buildManualCaption()}
                      </pre>
                    </div>
                  </div>
                  <button onClick={downloadImageWithCaption} disabled={!imageUrl}
                    className="w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-white disabled:opacity-30"
                    style={{ background: 'var(--accent)' }}>
                    <Download size={16} /> Download PNG + Copy Caption
                  </button>
                </div>
              )}

              {step === 'platforms' && (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(([p, config]) => {
                      const selected = selectedPlatforms.includes(p);
                      return (
                        <button key={p}
                          onClick={() => setSelectedPlatforms(prev => selected ? prev.filter(x => x !== p) : [...prev, p])}
                          className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${selected ? 'border-accent bg-accent/10' : 'border-white/5 hover:border-white/20'}`}
                          style={{ background: selected ? undefined : 'var(--surface-2)' }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={selected ? { backgroundColor: config.color } : { background: 'var(--surface-4)' }}>
                            <PlatformIcon platform={p} />
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-white text-sm">{config.label}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => setStep('preview')}
                      className="px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest text-white"
                      style={{ background: 'var(--surface-3)' }}>Back</button>
                    <button onClick={handlePublish} disabled={!selectedPlatforms.length}
                      className="flex-1 py-4 rounded-2xl font-black text-sm uppercase shadow-2xl transition-all text-white disabled:opacity-40"
                      style={{ background: 'var(--accent)' }}>
                      Publish to {selectedPlatforms.length} channels
                    </button>
                  </div>
                </div>
              )}

              {step === 'publishing' && (
                <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
                  <Loader2 className="animate-spin" size={56} style={{ color: 'var(--accent)' }} />
                  <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Publishing...</h3>
                </div>
              )}

              {step === 'done' && (
                <div className="flex flex-col gap-6">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/30">
                    <CheckCircle2 className="text-emerald-500" size={40} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-display font-bold text-white mb-1 uppercase">Published!</h3>
                  </div>
                  <button onClick={onClose}
                    className="w-full py-4 rounded-2xl font-black uppercase text-white transition-all hover:opacity-80"
                    style={{ background: 'var(--surface-3)' }}>Close</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}