'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, Check, Loader2, Download, Copy,
  Sliders, CheckCircle2, Facebook, Instagram, Linkedin,
  AlertCircle, Eye, Palette, ImageIcon,
  Clipboard, ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react';
import type {
  AnnotatedJob,
  ImageStyle,
  Platform,
  PublishResult,
  CustomImageSettings
} from '@/lib/types';
import {
  STYLE_LABELS,
  PLATFORM_CONFIG,
  AVAILABLE_FONTS,
  COLOR_PRESETS,
  DEFAULT_CUSTOM_SETTINGS,
  QUALITY_PRESETS
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
    case 'facebook':
      return <Facebook size={size} />;
    case 'instagram':
      return <Instagram size={size} />;
    case 'linkedin':
      return <Linkedin size={size} />;
    case 'tiktok':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.37a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.8z" />
        </svg>
      );
    default:
      return null;
  }
};

function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div>
      <div className="text-[10px] text-white/40 uppercase font-mono mb-2 tracking-wider">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c.value}
            onClick={() => onChange(c.value)}
            title={c.label}
            className={`w-7 h-7 rounded-lg border-2 transition-all ${
              value === c.value
                ? 'border-accent scale-110 shadow-lg'
                : 'border-white/10 hover:border-white/30'
            }`}
            style={{ background: c.hex }}
          />
        ))}
      </div>
    </div>
  );
}

function FontSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div>
      <div className="text-[10px] text-white/40 uppercase font-mono mb-2 tracking-wider">
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-accent/50"
        style={{ background: 'var(--surface-3)' }}
      >
        {AVAILABLE_FONTS.map((f) => (
          <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
            {f.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-white/40 mb-1.5 uppercase font-mono tracking-wider">
        <span>{label}</span>
        <span className="text-accent-light font-bold">
          {value}
          {unit || 'px'}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 bg-surface-4 rounded-lg appearance-none cursor-pointer accent-purple-500"
      />
    </div>
  );
}

export default function ImageReviewModal({
  job,
  imageUrl,
  currentStyle,
  generating,
  onRegenerate,
  onPublished,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>('preview');
  const [rightTab, setRightTab] = useState<RightTab>('style');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
    'instagram',
    'facebook',
  ]);
  const [publishResults, setPublishResults] = useState<PublishResult[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [loadingCaptions, setLoadingCaptions] = useState(false);
  const [customSet, setCustomSet] = useState<CustomImageSettings>({
    ...DEFAULT_CUSTOM_SETTINGS,
  });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const fetchCaptions = useCallback(async () => {
    setLoadingCaptions(true);
    try {
      const res = await fetch('/api/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job: {
            id: job.id,
            title: job.title,
            description: job.description,
            salary: job.salary,
            city: job.city,
            expiryDate: job.expiryDate,
            slugOrId: job.slugOrId,
            category: job.category,
            imageUrl: job.imageUrl,
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
    } catch (e) {
      console.error('Download failed', e);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCaption(key);
    setTimeout(() => setCopiedCaption(null), 2000);
  };

  const handlePublish = async () => {
    if (!selectedPlatforms.length) return;
    setPublishing(true);
    setStep('publishing');
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
    } catch (e) {
      setStep('preview');
    } finally {
      setPublishing(false);
    }
  };

  const updateCustom = (partial: Partial<CustomImageSettings>) => {
    setCustomSet((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-7xl rounded-[32px] overflow-hidden border border-white/10 flex flex-col max-h-[95vh] shadow-2xl"
        style={{ background: 'var(--surface-1)', animation: 'slideUp 0.3s ease both' }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-display font-bold text-white truncate">{job.title}</h2>
            <p className="text-white/40 text-xs mt-0.5 font-mono">
              {job.city} · {job.salary} kr
            </p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            {step === 'preview' && (
              <button
                onClick={() => setStep('platforms')}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-white/90 transition-all"
              >
                <Check size={14} /> Approve &amp; Publish
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/40 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row overflow-hidden flex-1">
          {/* LEFT: PREVIEW HD */}
          <div className="md:w-[400px] lg:w-[440px] p-6 bg-black/40 flex flex-col gap-4 border-r border-white/5 overflow-y-auto">
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-surface-0">
              {generating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                    HD Rendering...
                  </span>
                </div>
              ) : imageUrl ? (
                <img
                  src={imageUrl}
                  alt="HD Preview"
                  className="w-full h-full object-cover"
                  style={{
                    imageRendering: 'auto',
                    WebkitTransform: 'translateZ(0)',
                  }}
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm font-display uppercase tracking-widest text-center px-6">
                  Select a style to preview
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={downloadImageHD}
                disabled={!imageUrl || generating}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold transition-all disabled:opacity-30 hover:opacity-90"
                style={{ background: 'var(--surface-3)', color: 'white' }}
              >
                <Download size={14} /> Save HD
              </button>
              <button
                onClick={() => copyToClipboard(imageUrl || '', 'link')}
                disabled={!imageUrl || generating}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold transition-all disabled:opacity-30 hover:opacity-90"
                style={{ background: 'var(--surface-3)', color: 'white' }}
              >
                <ImageIcon size={14} /> {copiedCaption === 'link' ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* RIGHT: TABS */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--surface-1)' }}>
            {step === 'preview' && (
              <div className="flex border-b border-white/5 px-6">
                {(['style', 'captions', 'export'] as RightTab[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setRightTab(key)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                      rightTab === key
                        ? 'text-white border-accent'
                        : 'text-white/30 border-transparent hover:text-white/60'
                    }`}
                  >
                    {key === 'style' ? (
                      <Palette size={14} />
                    ) : key === 'captions' ? (
                      <Eye size={14} />
                    ) : (
                      <ExternalLink size={14} />
                    )}
                    {key}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB: STYLE */}
              {step === 'preview' && rightTab === 'style' && (
                <div className="flex flex-col gap-6">
                  {/* Preset Styles */}
                  <section>
                    <h3
                      className="text-[10px] font-bold text-white/30 uppercase mb-3 tracking-widest border-l-2 pl-3"
                      style={{ borderColor: 'var(--accent)' }}
                    >
                      Preset Styles
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(STYLE_LABELS).map(([styleKey, config]) => (
                        <button
                          key={styleKey}
                          onClick={() =>
                            onRegenerate(styleKey as ImageStyle, styleKey === 'custom' ? customSet : undefined)
                          }
                          className={`p-4 rounded-2xl text-left border-2 transition-all ${
                            currentStyle === styleKey
                              ? 'border-accent bg-accent/10'
                              : 'border-white/5 hover:border-white/15'
                          }`}
                          style={{ background: currentStyle === styleKey ? undefined : 'var(--surface-2)' }}
                        >
                          <div className="text-sm font-bold text-white">{config.label}</div>
                          <div className="text-[10px] text-white/40 mt-0.5">{config.desc}</div>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Custom Studio */}
                  {currentStyle === 'custom' && (
                    <section
                      className="rounded-2xl border border-accent/20 overflow-hidden"
                      style={{ background: 'rgba(124,58,237,0.04)' }}
                    >
                      <div
                        className="flex items-center gap-2 px-5 py-3 border-b border-accent/10"
                        style={{ color: 'var(--accent-light)' }}
                      >
                        <Sliders size={16} />{' '}
                        <span className="text-xs font-bold uppercase tracking-widest">
                          Custom Studio
                        </span>
                      </div>
                      <div className="p-5 space-y-5">
                        {/* 🆕 Quality Presets */}
                        <div>
                          <div className="text-[10px] text-white/40 uppercase font-mono mb-2 tracking-wider">
                            🎯 Quality Preset
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {QUALITY_PRESETS.map((preset) => (
                              <button
                                key={preset.label}
                                onClick={() => {
                                  updateCustom({
                                    outputQuality: preset.quality,
                                    outputFormat: preset.format,
                                    outputWidth: preset.width,
                                    outputHeight: preset.height,
                                  });
                                }}
                                className={`px-3 py-2.5 rounded-lg text-left border transition-all ${
                                  customSet.outputQuality === preset.quality &&
                                  customSet.outputWidth === preset.width
                                    ? 'border-accent bg-accent/10'
                                    : 'border-white/10 hover:border-white/20'
                                }`}
                                style={{ background: 'var(--surface-3)' }}
                              >
                                <div className="text-xs font-bold text-white">{preset.label}</div>
                                <div className="text-[9px] text-white/40 mt-0.5">{preset.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 🆕 Custom Quality Slider */}
                        <SliderControl
                          label="Custom Quality"
                          value={customSet.outputQuality ?? 95}
                          min={70}
                          max={100}
                          unit="%"
                          onChange={(v) => updateCustom({ outputQuality: v })}
                        />

                        {/* Font & Colors */}
                        <FontSelect
                          label="Title Font"
                          value={customSet.titleFont || 'Arial'}
                          onChange={(v) => updateCustom({ titleFont: v })}
                        />
                        <ColorPicker
                          label="Accent Color"
                          value={customSet.accentColor || '7C3AED'}
                          onChange={(v) => updateCustom({ accentColor: v })}
                        />
                        <SliderControl
                          label="Title Position (Y)"
                          value={customSet.titleY ?? -250}
                          min={-500}
                          max={0}
                          onChange={(v) => updateCustom({ titleY: v })}
                        />
                        <SliderControl
                          label="Brightness"
                          value={customSet.brightness ?? -75}
                          min={-100}
                          max={0}
                          unit=""
                          onChange={(v) => updateCustom({ brightness: v })}
                        />

                        <button
                          onClick={() => onRegenerate('custom', customSet)}
                          className="w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] text-white"
                          style={{ background: 'var(--accent)' }}
                        >
                          Apply Custom Settings
                        </button>
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* TAB: CAPTIONS */}
              {step === 'preview' && rightTab === 'captions' && (
                <div className="space-y-4">
                  {loadingCaptions ? (
                    <Loader2 className="animate-spin mx-auto text-accent" />
                  ) : (
                    (Object.entries(PLATFORM_CONFIG) as [Platform, any][]).map(([p, config]) => (
                      <div key={p} className="rounded-2xl p-4 border border-white/5 bg-surface-2">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <PlatformIcon platform={p} />
                            <span className="text-xs font-bold text-white uppercase">
                              {config.label}
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(captions[p] || '', p)}
                            className="text-[10px] text-accent-light uppercase font-bold"
                          >
                            {copiedCaption === p ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <pre className="text-xs text-white/70 whitespace-pre-wrap font-sans">
                          {captions[p] || '...'}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB: EXPORT */}
              {step === 'preview' && rightTab === 'export' && (
                <div className="space-y-4 text-white/70 text-sm">
                  <p>
                    Use the HD download button on the left or copy the direct Cloudinary link to
                    reuse this creative across platforms.
                  </p>
                  <div className="p-4 rounded-xl bg-surface-2 border border-white/5">
                    <div className="text-xs text-white/40 mb-2 uppercase font-mono">Current Quality Settings</div>
                    <div className="space-y-1 text-xs">
                      <div>Resolution: {customSet.outputWidth}x{customSet.outputHeight}</div>
                      <div>Quality: {customSet.outputQuality}%</div>
                      <div>Format: {customSet.outputFormat?.toUpperCase()}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP: PLATFORMS (placeholder) */}
              {step === 'platforms' && (
                <div className="space-y-4">
                  <p className="text-white/60 text-sm">Select platforms for publishing...</p>
                </div>
              )}

              {/* STEP: DONE */}
              {step === 'done' && (
                <div className="space-y-4 flex flex-col items-center justify-center text-center py-16">
                  <CheckCircle2 className="text-accent" size={40} />
                  <p className="text-white text-sm font-semibold">
                    Post published to selected platforms.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
