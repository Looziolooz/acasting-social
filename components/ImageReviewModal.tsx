'use client';

import { useState, useEffect } from 'react';
import { 
  X, Check, Loader2, Download, Copy, MessageSquare, 
  Sliders, CheckCircle2, Facebook, Instagram, Linkedin, 
  AlertCircle, Send 
} from 'lucide-react';
import Image from 'next/image';
import type { AnnotatedJob, ImageStyle, Platform, PublishResult, CustomImageSettings } from '@/lib/types';
import { STYLE_LABELS, PLATFORM_CONFIG } from '@/lib/types';

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

const PlatformIcon = ({ platform }: { platform: Platform }) => {
  switch (platform) {
    case 'facebook': return <Facebook size={16} />;
    case 'instagram': return <Instagram size={16} />;
    case 'linkedin': return <Linkedin size={16} />;
    case 'tiktok': return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.37a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.8z"/></svg>;
  }
};

export default function ImageReviewModal({ job, imageUrl, currentStyle, generating, onRegenerate, onPublished, onClose }: Props) {
  const [step, setStep] = useState<Step>('preview');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'facebook']);
  const [publishResults, setPublishResults] = useState<PublishResult[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  
  const [customSet, setCustomSet] = useState<CustomImageSettings>({
    titleY: -250,
    brightness: -75,
    titleSize: 46
  });

  useEffect(() => { 
    document.body.style.overflow = 'hidden'; 
    return () => { document.body.style.overflow = ''; }; 
  }, []);

  const downloadImage = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `acasting-hd-${job.id}.jpg`;
      a.click();
    } catch (e) { console.error("Download failed", e); }
  };

  const copyCaption = () => {
    const text = `🎬 NY CASTING | ${job.title}\n\n📍 ${job.city || 'Sverige'}\n💰 Arvode: ${job.salary || 'Ej angivet'}\n📅 Ansök senast: ${job.expiryDate?.split('T')[0] || 'Löpande'}\n\n🔗 Ansök nu: https://www.acasting.se/explore/jobs/${job.slugOrId}`;
    navigator.clipboard.writeText(text);
    alert("Caption copied for Telegram/Manual post!");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-6xl bg-surface-1 rounded-[32px] overflow-hidden border border-white/10 flex flex-col max-h-[95vh] shadow-2xl animate-slide-up">
        
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
          <div>
            <h2 className="text-xl font-display font-bold text-white truncate">{job.title}</h2>
            <p className="text-white/40 text-xs mt-0.5 font-mono">{job.city} · {job.salary} kr</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/40 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel: Preview & Manual Export */}
          <div className="md:w-[420px] p-8 bg-black/40 flex flex-col gap-6 border-r border-white/5 overflow-y-auto">
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl bg-surface-0 border border-white/5">
              {generating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-accent" size={32} />
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">HD Rendering...</span>
                </div>
              ) : imageUrl ? (
                <Image src={imageUrl} alt="HD Preview" fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm font-display uppercase tracking-widest">Generate to preview</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
               <button onClick={downloadImage} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-3 text-white text-[11px] font-bold hover:bg-surface-4 transition-all">
                 <Download size={16} /> Save JPG
               </button>
               <button onClick={() => setShowCaption(!showCaption)} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-white/70 text-[11px] hover:bg-white/5 transition-all">
                 <MessageSquare size={16} /> Telegram
               </button>
            </div>

            {showCaption && (
              <div className="p-5 bg-black/60 rounded-2xl border border-white/5 animate-fade-in">
                <div className="flex items-center justify-between mb-3 text-[10px] text-white/30 font-bold uppercase tracking-wider">
                  <span>Manual Caption</span>
                  <button onClick={copyCaption} className="text-accent-light flex items-center gap-1 font-bold text-[10px]"><Copy size={12}/> Copy</button>
                </div>
                <div className="text-[12px] text-white/80 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">
                   🎬 NY CASTING | {job.title}{'\n\n'}📍 {job.city || 'Sverige'}{'\n'}💰 Arvode: {job.salary || 'Ej angivet'}{'\n'}📅 Ansök senast: {job.expiryDate?.split('T')[0] || 'Löpande'}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Controls */}
          <div className="flex-1 p-8 overflow-y-auto bg-surface-1">
            {step === 'preview' && (
              <div className="flex flex-col gap-8">
                <section>
                  <h3 className="text-xs font-bold text-white/40 uppercase mb-4 tracking-widest border-l-2 border-accent pl-3">Select Style</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(STYLE_LABELS).map(([styleKey, config]) => (
                      <button key={styleKey} onClick={() => onRegenerate(styleKey as ImageStyle)}
                        className={`p-5 rounded-2xl text-left border-2 transition-all ${currentStyle === styleKey ? 'border-accent bg-accent/10' : 'border-white/5 bg-surface-2 hover:bg-surface-3'}`}>
                        <div className="text-sm font-bold text-white">{config.label}</div>
                        <div className="text-[11px] text-white/40 mt-1">{config.desc}</div>
                      </button>
                    ))}
                  </div>
                </section>

                {currentStyle === 'custom' && (
                  <section className="p-6 rounded-2xl bg-accent/5 border border-accent/20 flex flex-col gap-6 animate-slide-up">
                    <div className="flex items-center gap-2 text-accent-light text-xs font-bold uppercase tracking-widest"><Sliders size={18}/> Manual HD Editor</div>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between text-[11px] text-white/50 mb-2 uppercase font-mono">Title Position (Y): <span className="text-accent-light font-bold">{customSet.titleY}px</span></div>
                        <input type="range" min="-500" max="0" value={customSet.titleY} onChange={(e) => setCustomSet({...customSet, titleY: parseInt(e.target.value)})} className="w-full h-1.5 bg-surface-4 rounded-lg appearance-none cursor-pointer accent-accent" />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/50 mb-2 uppercase font-mono">Font Size: <span className="text-accent-light font-bold">{customSet.titleSize}px</span></div>
                        <input type="range" min="20" max="100" value={customSet.titleSize} onChange={(e) => setCustomSet({...customSet, titleSize: parseInt(e.target.value)})} className="w-full h-1.5 bg-surface-4 rounded-lg appearance-none cursor-pointer accent-accent" />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-white/50 mb-2 uppercase font-mono">Brightness: <span className="text-accent-light font-bold">{customSet.brightness}</span></div>
                        <input type="range" min="-100" max="0" value={customSet.brightness} onChange={(e) => setCustomSet({...customSet, brightness: parseInt(e.target.value)})} className="w-full h-1.5 bg-surface-4 rounded-lg appearance-none cursor-pointer accent-accent" />
                      </div>
                    </div>
                    <button onClick={() => onRegenerate('custom', customSet)} className="w-full py-4 bg-accent text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98]">Apply HD Changes</button>
                  </section>
                )}

                <button onClick={() => setStep('platforms')} className="w-full py-5 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-widest mt-4 shadow-2xl flex items-center justify-center gap-2 hover:bg-white/90">
                  <Check size={18} /> Approve & Continue
                </button>
              </div>
            )}

            {step === 'platforms' && (
              <div className="flex flex-col gap-8 animate-fade-in">
                <div>
                  <h3 className="text-2xl font-display font-bold text-white mb-2 uppercase">Social Configuration</h3>
                  <p className="text-white/40 text-sm">Select platforms for auto-publishing.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(Object.entries(PLATFORM_CONFIG) as [Platform, any][]).map(([p, config]) => {
                    const selected = selectedPlatforms.includes(p);
                    return (
                      <button key={p} onClick={() => setSelectedPlatforms(prev => selected ? prev.filter(x => x !== p) : [...prev, p])}
                        className={`flex items-center gap-5 p-6 rounded-[24px] border-2 transition-all ${selected ? 'border-accent bg-accent/10' : 'border-white/5 bg-surface-2 hover:border-white/20'}`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center`} style={selected ? { backgroundColor: config.color } : { background: 'var(--surface-4)' }}>
                          <PlatformIcon platform={p} />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-white text-base">{config.label}</div>
                          <div className="text-[10px] text-white/30 uppercase">{selected ? 'Ready' : 'Click to add'}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setStep('preview')} className="px-8 py-4 rounded-2xl bg-surface-3 text-white font-bold text-xs uppercase tracking-widest">Back</button>
                  <button onClick={handlePublish} disabled={!selectedPlatforms.length} className="flex-1 py-5 rounded-2xl bg-accent text-white font-black text-sm uppercase shadow-2xl transition-all hover:scale-[1.02]">Publish to {selectedPlatforms.length} channels</button>
                </div>
              </div>
            )}

            {step === 'publishing' && (
              <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
                <Loader2 className="animate-spin text-accent" size={64} />
                <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">HD Sync in progress...</h3>
                <p className="text-white/40 max-w-xs text-sm">Optimizing image and sending data to your connected profiles.</p>
              </div>
            )}

            {step === 'done' && (
              <div className="flex flex-col gap-8 animate-slide-up">
                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/30">
                  <CheckCircle2 className="text-emerald-500" size={48} />
                </div>
                <div className="text-center">
                  <h3 className="text-3xl font-display font-bold text-white mb-2 uppercase">Success!</h3>
                  <p className="text-white/40 text-sm">Your HD ad is now live on selected channels.</p>
                </div>
                <div className="space-y-3">
                  {publishResults.map(r => (
                    <div key={r.platform} className="flex items-center justify-between p-5 bg-surface-2 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-surface-3"><PlatformIcon platform={r.platform} /></div>
                        <span className="text-sm font-bold text-white">{PLATFORM_CONFIG[r.platform].label}</span>
                      </div>
                      {r.success ? (
                        <span className="text-emerald-500 text-[10px] font-black uppercase flex items-center gap-1.5"><Check size={14}/> Success</span>
                      ) : (
                        <span className="text-red-500 text-[10px] font-black uppercase flex items-center gap-1.5"><AlertCircle size={14}/> Failed</span>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={onClose} className="w-full py-5 rounded-2xl bg-surface-3 text-white font-black uppercase hover:bg-surface-4 transition-all">Close Session</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}