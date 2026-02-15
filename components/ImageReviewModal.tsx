'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, Check, RotateCcw, Send, Loader2, ExternalLink,
  Facebook, Instagram, Linkedin, AlertCircle, CheckCircle2,
  ImageOff, Download, Copy, Eye, Sliders, FileText,
} from 'lucide-react';
import type {
  AcastingJob, ImageStyle, Platform, PublishResult,
  CustomOverlayStyle,
} from '@/lib/types';
import {
  STYLE_LABELS, PLATFORM_CONFIG,
  DEFAULT_CUSTOM_STYLE, FONT_OPTIONS,
} from '@/lib/types';
import { buildCaption } from '@/lib/caption';

interface AnnotatedJob extends AcastingJob {
  processedStatus: string | null;
}

interface Props {
  job: AnnotatedJob;
  imageUrl: string | null;
  generateError: string | null;
  currentStyle: ImageStyle;
  generating: boolean;
  onRegenerate: (style: ImageStyle, customStyle?: CustomOverlayStyle) => void;
  onPublished: (platforms: string[]) => void;
  onClose: () => void;
}

type Step = 'preview' | 'platforms' | 'publishing' | 'done';
type SideTab = 'style' | 'caption' | 'share';

const TikTokIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.37a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.8z"/>
  </svg>
);

const PlatformIcon = ({ platform }: { platform: Platform }) => {
  switch (platform) {
    case 'facebook':  return <Facebook size={15} />;
    case 'instagram': return <Instagram size={15} />;
    case 'linkedin':  return <Linkedin size={15} />;
    case 'tiktok':    return <TikTokIcon />;
  }
};

function hexInput(value: string, onChange: (v: string) => void, label: string) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-white/40 text-xs">{label}</label>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg border border-white/10 overflow-hidden flex-shrink-0">
          <input
            type="color"
            value={`#${value}`}
            onChange={e => onChange(e.target.value.replace('#', ''))}
            className="w-10 h-10 -m-1 cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value.replace('#', '').toUpperCase().slice(0, 6))}
          className="flex-1 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
          style={{ background: 'var(--surface-4)', border: '1px solid rgba(255,255,255,0.08)' }}
          maxLength={6}
        />
      </div>
    </div>
  );
}

export default function ImageReviewModal({
  job, imageUrl, generateError, currentStyle, generating,
  onRegenerate, onPublished, onClose,
}: Props) {
  const [step, setStep] = useState<Step>('preview');
  const [sideTab, setSideTab] = useState<SideTab>('style');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'facebook']);
  const [customCaption, setCustomCaption] = useState('');
  const [publishResults, setPublishResults] = useState<PublishResult[]>([]);
  const [imgLoadError, setImgLoadError] = useState(false);
  const [customStyle, setCustomStyle] = useState<CustomOverlayStyle>({ ...DEFAULT_CUSTOM_STYLE });
  const [copiedCaption, setCopiedCaption] = useState<Platform | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { setImgLoadError(false); }, [imageUrl]);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const updateCustom = (key: keyof CustomOverlayStyle, value: string | number) => {
    setCustomStyle(prev => ({ ...prev, [key]: value }));
  };

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const handleApplyCustom = () => {
    onRegenerate('custom', customStyle);
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `acasting-${job.slugOrId || job.id}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  const getCaptionForPlatform = useCallback((platform: Platform) => {
    return buildCaption(job, platform);
  }, [job]);

  const copyCaption = async (platform: Platform) => {
    const text = customCaption || getCaptionForPlatform(platform);
    await navigator.clipboard.writeText(text);
    setCopiedCaption(platform);
    setTimeout(() => setCopiedCaption(null), 2000);
  };

  const handlePublish = async () => {
    if (!selectedPlatforms.length) return;
    setStep('publishing');
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: String(job.id),
          platforms: selectedPlatforms,
          customCaption: customCaption || undefined,
        }),
      });
      const data = await res.json();
      setPublishResults(data.results || []);
      setStep('done');
      const ok = (data.results as PublishResult[]).filter(r => r.success).map(r => r.platform);
      if (ok.length > 0) onPublished(ok);
    } catch (e) {
      console.error('[publish]', e);
      setStep('preview');
    }
  };

  const canApprove = !!imageUrl && !generating && !generateError && !imgLoadError;

  // ── Image panel ────────────────────────────────────────────────────────────
  const renderImage = () => {
    if (generating) return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 skeleton">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-light)' }} />
        <span className="text-white/60 text-sm">Generating image...</span>
        <span className="text-white/30 text-xs">10–20 seconds</span>
      </div>
    );

    if (generateError) return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-red-400 text-sm font-medium">Generation error</p>
        <p className="text-white/40 text-xs break-all leading-relaxed">{generateError}</p>
        <button onClick={() => onRegenerate(currentStyle)}
          className="mt-2 px-4 py-2 rounded-xl text-xs font-medium hover:opacity-80"
          style={{ background: 'var(--surface-4)', color: 'var(--accent-light)' }}>
          Retry
        </button>
      </div>
    );

    if (imageUrl && !imgLoadError) return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={imageUrl} alt="Preview"
        className="absolute inset-0 w-full h-full object-cover"
        onError={() => setImgLoadError(true)} />
    );

    if (imgLoadError) return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
        <ImageOff size={28} style={{ color: 'var(--accent-light)' }} />
        <p className="text-white/50 text-sm">Image failed to load</p>
        <button onClick={() => onRegenerate(currentStyle)}
          className="mt-2 px-4 py-2 rounded-xl text-xs font-medium"
          style={{ background: 'var(--surface-4)', color: 'var(--accent-light)' }}>
          Retry
        </button>
      </div>
    );

    return (
      <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm px-4 text-center">
        Select a style to generate
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="relative w-full rounded-3xl overflow-hidden animate-slide-up"
        style={{
          background: 'var(--surface-1)',
          border: '1px solid rgba(255,255,255,0.06)',
          maxHeight: '92vh',
          maxWidth: '1100px',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h2 className="font-display font-bold text-white text-lg leading-tight line-clamp-1">
              {job.title}
            </h2>
            <p className="text-white/40 text-xs mt-0.5 font-mono">
              {job.city && `${job.city} · `}
              {job.salary && `${job.salary} kr`}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row overflow-y-auto"
          style={{ maxHeight: 'calc(92vh - 68px)' }}>

          {/* ── Left: Image ── */}
          <div className="md:w-[300px] flex-shrink-0 p-4 flex flex-col gap-3">
            <div className="relative rounded-2xl overflow-hidden bg-black"
              style={{ aspectRatio: '9/16', minHeight: '280px' }}>
              {renderImage()}
            </div>

            {/* Image actions */}
            {imageUrl && !imgLoadError && !generateError && (
              <div className="flex gap-2">
                <button onClick={handleDownload} disabled={downloading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors hover:opacity-80"
                  style={{ background: 'var(--surface-3)', color: 'var(--accent-light)' }}>
                  {downloading
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Download size={12} />
                  }
                  Download
                </button>
                <a href={imageUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs text-white/40 hover:text-white/70 transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

          {/* ── Right: Tabs ── */}
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto min-w-0">

            {step === 'preview' && (
              <>
                {/* Side tab nav */}
                <div className="flex gap-1 p-1 rounded-xl"
                  style={{ background: 'var(--surface-3)' }}>
                  {([
                    { key: 'style',   icon: Sliders,  label: 'Style' },
                    { key: 'caption', icon: FileText,  label: 'Caption' },
                    { key: 'share',   icon: Eye,       label: 'Preview & Share' },
                  ] as { key: SideTab; icon: typeof Sliders; label: string }[]).map(({ key, icon: Icon, label }) => (
                    <button key={key} onClick={() => setSideTab(key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                        sideTab === key ? 'text-white' : 'text-white/40 hover:text-white/70'
                      }`}
                      style={sideTab === key ? { background: 'var(--accent)' } : {}}>
                      <Icon size={12} />
                      {label}
                    </button>
                  ))}
                </div>

                {/* ── STYLE TAB ── */}
                {sideTab === 'style' && (
                  <div className="flex flex-col gap-4">
                    {/* Preset styles */}
                    <div>
                      <h3 className="text-white/50 text-xs font-mono uppercase tracking-wider mb-2">Presets</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {(['dark', 'purple', 'noir'] as ImageStyle[]).map(s => (
                          <button key={s} onClick={() => onRegenerate(s)} disabled={generating}
                            className={`px-3 py-2.5 rounded-xl text-left transition-all hover:opacity-90 disabled:opacity-50 ${
                              currentStyle === s && currentStyle !== 'custom' ? 'ring-2 ring-purple-500' : ''
                            }`}
                            style={{
                              background: currentStyle === s && currentStyle !== 'custom'
                                ? 'rgba(124,58,237,0.15)' : 'var(--surface-3)',
                              border: `1px solid ${currentStyle === s && currentStyle !== 'custom'
                                ? 'rgba(124,58,237,0.4)' : 'transparent'}`,
                            }}>
                            <div className="font-medium text-xs text-white">{STYLE_LABELS[s].label}</div>
                            <div className="text-xs text-white/40 mt-0.5">{STYLE_LABELS[s].desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom editor */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white/50 text-xs font-mono uppercase tracking-wider">
                          Custom Style
                        </h3>
                        <button onClick={handleApplyCustom} disabled={generating}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                          style={{ background: 'rgba(124,58,237,0.2)', color: 'var(--accent-light)' }}>
                          <Check size={11} />
                          Apply Custom
                        </button>
                      </div>

                      <div className="rounded-xl p-4 flex flex-col gap-4"
                        style={{ background: 'var(--surface-3)' }}>

                        {/* Brightness */}
                        <div>
                          <div className="flex justify-between mb-1">
                            <label className="text-white/40 text-xs">Overlay darkness</label>
                            <span className="text-white/60 text-xs font-mono">{customStyle.brightness}%</span>
                          </div>
                          <input type="range" min={-100} max={0} value={customStyle.brightness}
                            onChange={e => updateCustom('brightness', Number(e.target.value))}
                            className="w-full accent-purple-500" />
                        </div>

                        {/* Font */}
                        <div>
                          <label className="text-white/40 text-xs block mb-1">Font family</label>
                          <select value={customStyle.titleFontFamily}
                            onChange={e => updateCustom('titleFontFamily', e.target.value)}
                            className="w-full rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            style={{ background: 'var(--surface-4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {FONT_OPTIONS.map(f => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Font sizes */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="flex justify-between mb-1">
                              <label className="text-white/40 text-xs">Title size</label>
                              <span className="text-white/60 text-xs font-mono">{customStyle.titleFontSize}px</span>
                            </div>
                            <input type="range" min={24} max={80} value={customStyle.titleFontSize}
                              onChange={e => updateCustom('titleFontSize', Number(e.target.value))}
                              className="w-full accent-purple-500" />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <label className="text-white/40 text-xs">Body size</label>
                              <span className="text-white/60 text-xs font-mono">{customStyle.bodyFontSize}px</span>
                            </div>
                            <input type="range" min={20} max={60} value={customStyle.bodyFontSize}
                              onChange={e => updateCustom('bodyFontSize', Number(e.target.value))}
                              className="w-full accent-purple-500" />
                          </div>
                        </div>

                        {/* Vertical positions */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="flex justify-between mb-1">
                              <label className="text-white/40 text-xs">Title Y</label>
                              <span className="text-white/60 text-xs font-mono">{customStyle.titleY}</span>
                            </div>
                            <input type="range" min={-600} max={0} value={customStyle.titleY}
                              onChange={e => updateCustom('titleY', Number(e.target.value))}
                              className="w-full accent-purple-500" />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1">
                              <label className="text-white/40 text-xs">Body Y</label>
                              <span className="text-white/60 text-xs font-mono">{customStyle.bodyY}</span>
                            </div>
                            <input type="range" min={-200} max={400} value={customStyle.bodyY}
                              onChange={e => updateCustom('bodyY', Number(e.target.value))}
                              className="w-full accent-purple-500" />
                          </div>
                        </div>

                        {/* Colors */}
                        <div className="grid grid-cols-3 gap-3">
                          {hexInput(customStyle.titleColor,  v => updateCustom('titleColor', v),  'Title color')}
                          {hexInput(customStyle.bodyColor,   v => updateCustom('bodyColor', v),   'Body color')}
                          {hexInput(customStyle.accentColor, v => updateCustom('accentColor', v), 'Accent color')}
                        </div>
                      </div>
                    </div>

                    {/* Job data */}
                    <div className="rounded-xl p-4" style={{ background: 'var(--surface-3)' }}>
                      <h3 className="text-white/50 text-xs font-mono uppercase tracking-wider mb-3">Job Info</h3>
                      <dl className="space-y-2">
                        {[
                          ['Title',    job.title],
                          ['City',     job.city || '—'],
                          ['Salary',   job.salary ? `${job.salary} kr` : 'Not specified'],
                          ['Deadline', job.expiryDate ? job.expiryDate.split('T')[0] : 'Open'],
                          ['Category', job.category || '—'],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-4 text-xs">
                            <dt className="text-white/40 flex-shrink-0">{label}</dt>
                            <dd className="text-white/80 text-right truncate">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      <a href={`https://www.acasting.se/explore/jobs/${job.slugOrId}`}
                        target="_blank" rel="noopener noreferrer"
                        className="mt-3 flex items-center gap-1.5 text-xs"
                        style={{ color: 'var(--accent-light)' }}>
                        <ExternalLink size={11} /> View on Acasting.se
                      </a>
                    </div>
                  </div>
                )}

                {/* ── CAPTION TAB ── */}
                {sideTab === 'caption' && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-white/50 text-xs font-mono uppercase tracking-wider mb-2 block">
                        Custom caption (optional — overrides auto-generated)
                      </label>
                      <textarea value={customCaption} onChange={e => setCustomCaption(e.target.value)}
                        placeholder="Leave empty to use auto-generated captions per platform..."
                        rows={5}
                        className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                        style={{ background: 'var(--surface-3)', border: '1px solid rgba(255,255,255,0.06)' }} />
                    </div>

                    <div>
                      <h3 className="text-white/50 text-xs font-mono uppercase tracking-wider mb-3">
                        Auto-generated captions per platform
                      </h3>
                      <div className="flex flex-col gap-2">
                        {(['instagram', 'facebook', 'linkedin', 'tiktok'] as Platform[]).map(p => (
                          <div key={p} className="rounded-xl p-3"
                            style={{ background: 'var(--surface-3)', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded flex items-center justify-center text-white"
                                  style={{ background: PLATFORM_CONFIG[p].color }}>
                                  <PlatformIcon platform={p} />
                                </div>
                                <span className="text-xs font-medium text-white">{PLATFORM_CONFIG[p].label}</span>
                              </div>
                              <button onClick={() => copyCaption(p)}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors hover:opacity-80"
                                style={{ background: 'var(--surface-4)', color: copiedCaption === p ? '#10b981' : 'rgba(255,255,255,0.5)' }}>
                                {copiedCaption === p ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                                {copiedCaption === p ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                            <pre className="text-white/50 text-xs leading-relaxed whitespace-pre-wrap break-words max-h-28 overflow-y-auto">
                              {getCaptionForPlatform(p)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── SHARE TAB (Telegram-style preview) ── */}
                {sideTab === 'share' && (
                  <div className="flex flex-col gap-4">
                    <p className="text-white/40 text-xs">
                      Copy image + caption to manually publish on any platform not connected.
                    </p>

                    {/* Telegram-style card */}
                    <div className="rounded-2xl overflow-hidden"
                      style={{ background: 'var(--surface-3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {/* Preview image thumbnail */}
                      {imageUrl && !imgLoadError && (
                        <div className="relative w-full overflow-hidden" style={{ maxHeight: '200px' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageUrl} alt="Preview" className="w-full object-cover" />
                        </div>
                      )}

                      <div className="p-4 flex flex-col gap-3">
                        {/* Caption selector */}
                        <div className="flex gap-2 flex-wrap">
                          {(['instagram', 'facebook', 'linkedin', 'tiktok'] as Platform[]).map(p => (
                            <button key={p} onClick={() => copyCaption(p)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
                              style={{
                                background: copiedCaption === p ? `${PLATFORM_CONFIG[p].color}33` : 'var(--surface-4)',
                                border: `1px solid ${copiedCaption === p ? PLATFORM_CONFIG[p].color : 'transparent'}`,
                                color: copiedCaption === p ? PLATFORM_CONFIG[p].color : 'rgba(255,255,255,0.5)',
                              }}>
                              <PlatformIcon platform={p} />
                              {copiedCaption === p ? '✓ Copied' : `Copy ${PLATFORM_CONFIG[p].label} caption`}
                            </button>
                          ))}
                        </div>

                        {/* Caption preview */}
                        <div className="rounded-xl p-3" style={{ background: 'var(--surface-4)' }}>
                          <pre className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                            {customCaption || getCaptionForPlatform('instagram')}
                          </pre>
                        </div>

                        {/* Download button */}
                        <button onClick={handleDownload} disabled={downloading || !imageUrl}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40"
                          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))', color: 'white' }}>
                          {downloading
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Download size={14} />
                          }
                          Download image
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom actions — always visible */}
                <div className="flex gap-3 pt-2 mt-auto">
                  <button onClick={() => onRegenerate(currentStyle)} disabled={generating}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'var(--surface-3)', color: 'rgba(255,255,255,0.6)' }}>
                    <RotateCcw size={14} /> Regenerate
                  </button>
                  <button onClick={() => setStep('platforms')} disabled={!canApprove}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))', color: 'white' }}>
                    <Check size={14} /> Approve & Publish
                  </button>
                </div>
              </>
            )}

            {/* PLATFORMS */}
            {step === 'platforms' && (
              <>
                <div>
                  <h3 className="font-display font-bold text-white mb-1">Publish to</h3>
                  <p className="text-white/40 text-sm">Select one or more platforms</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(
                    ([platform, config]) => {
                      const selected = selectedPlatforms.includes(platform);
                      return (
                        <button key={platform} onClick={() => togglePlatform(platform)}
                          className="flex items-center gap-3 p-4 rounded-xl transition-all"
                          style={{
                            background: selected ? `${config.color}18` : 'var(--surface-3)',
                            border: `1px solid ${selected ? `${config.color}55` : 'transparent'}`,
                          }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                            style={{ background: selected ? config.color : 'var(--surface-4)' }}>
                            <PlatformIcon platform={platform} />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-sm text-white">{config.label}</div>
                            <div className={`text-xs mt-0.5 ${selected ? 'text-white/60' : 'text-white/30'}`}>
                              {selected ? 'Selected' : 'Click to add'}
                            </div>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>

                <div>
                  <label className="text-white/50 text-xs font-mono uppercase tracking-wider mb-2 block">
                    Custom caption (optional)
                  </label>
                  <textarea value={customCaption} onChange={e => setCustomCaption(e.target.value)}
                    placeholder="Leave empty for auto-generated captions..."
                    rows={4}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                    style={{ background: 'var(--surface-3)', border: '1px solid rgba(255,255,255,0.06)' }} />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep('preview')}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium"
                    style={{ background: 'var(--surface-3)', color: 'rgba(255,255,255,0.6)' }}>
                    Back
                  </button>
                  <button onClick={handlePublish} disabled={!selectedPlatforms.length}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))', color: 'white' }}>
                    <Send size={14} />
                    Publish to {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''}
                  </button>
                </div>
              </>
            )}

            {/* PUBLISHING */}
            {step === 'publishing' && (
              <div className="flex flex-col items-center justify-center gap-4 py-12">
                <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse-ring"
                  style={{ background: 'rgba(124,58,237,0.1)', border: '2px solid var(--accent)' }}>
                  <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
                </div>
                <h3 className="font-display font-bold text-white text-xl">Publishing...</h3>
                <div className="flex gap-3 flex-wrap justify-center">
                  {selectedPlatforms.map(p => (
                    <div key={p} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                      style={{ background: 'var(--surface-3)', color: 'rgba(255,255,255,0.5)' }}>
                      <PlatformIcon platform={p} />
                      {PLATFORM_CONFIG[p].label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DONE */}
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
                  {publishResults.map(result => (
                    <div key={result.platform} className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{ background: 'var(--surface-3)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                          style={{ background: PLATFORM_CONFIG[result.platform].color }}>
                          <PlatformIcon platform={result.platform} />
                        </div>
                        <span className="text-sm font-medium text-white">
                          {PLATFORM_CONFIG[result.platform].label}
                        </span>
                      </div>
                      {result.success
                        ? <div className="flex items-center gap-1.5 text-emerald-400 text-xs"><CheckCircle2 size={14} /> Published</div>
                        : <div className="flex items-center gap-1.5 text-red-400 text-xs" title={result.error}><AlertCircle size={14} /> Error</div>
                      }
                    </div>
                  ))}
                </div>

                <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-medium mt-2"
                  style={{ background: 'var(--surface-3)', color: 'rgba(255,255,255,0.7)' }}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
