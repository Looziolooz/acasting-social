'use client';

import { useState, useEffect } from 'react';
import { X, Check, RotateCcw, Send, Loader2, Download, Copy, MessageSquare, Sliders, AlertCircle, CheckCircle2, Facebook, Instagram, Linkedin } from 'lucide-react';
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
  const [publishResults, setPublishResults] = useState<PublishResult[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  const [customSet, setCustomSet] = useState<CustomImageSettings>({ titleY: -250, brightness: -75, titleSize: 46 });

  useEffect(() => { 
    document.body.style.overflow = 'hidden'; 
    return () => { document.body.style.overflow = ''; }; 
  }, []);

  const downloadImage = async () => {
    if (!imageUrl) return;
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acasting-${job.id}.jpg`;
    a.click();
  };

  const copyCaption = () => {
    const text = `🎬 NY CASTING | ${job.title}\n\n📍 ${job.city || 'Sverige'}\n💰 Arvode: ${job.salary || 'Ej angivet'}\n📅 Ansök senast: ${job.expiryDate || 'Löpande'}\n\n🔗 Ansök nu: https://www.acasting.se/explore/jobs/${job.slugOrId}`;
    navigator.clipboard.writeText(text);
    alert("Caption copiata per Telegram!");
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
    } catch (e) {
      console.error(e);
      setStep('preview');
    } finally { setPublishing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="relative w-full max-w-5xl bg-surface-1 rounded-[32px] overflow-hidden border border-white/10 flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
          <h2 className="text-xl font-display font-bold text-white truncate">{job.title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/40 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex flex-col md:flex-row overflow-hidden">
          {/* LATO SINISTRO: Anteprima Immagine e Telegram */}
          <div className="md:w-[400px] p-8 bg-black/40 flex flex-col gap-5 border-r border-white/5 overflow-y-auto">
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl bg-surface-0 border border-white/5">
              {generating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-accent" size={32} />
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">HD Rendering...</span>
                </div>
              ) : imageUrl ? (
                <Image src={imageUrl} alt="HD Preview" fill className="object-cover" unoptimized />
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
               <button onClick={downloadImage} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-3 text-white text-[11px] font-bold hover:bg-surface-4 transition-all">
                 <Download size={14} /> Salva JPG
               </button>
               <button onClick={() => setShowCaption(!showCaption)} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-white/70 text-[11px] hover:bg-white/5">
                 <MessageSquare size={14} /> {showCaption ? 'Chiudi' : 'Telegram'}
               </button>
            </div>

            {showCaption && (
              <div className="p-4 bg-black/60 rounded-2xl border border-white/5 animate-fade-in">
                <div className="flex items-center justify-between mb-3 text-[10px] text-white/30 font-bold uppercase tracking-wider">
                  <span>Anteprima Caption</span>
                  <button onClick={copyCaption} className="text-accent-light flex items-center gap-1 font-bold text-[10px]">
                    <Copy size={12}/> Copia
                  </button>
                </div>
                <div className="text-[12px] text-white/80 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto font-sans">
                   🎬 NY CASTING | {job.title}{'\n\n'}📍 {job.city || 'Sverige'}{'\n'}💰 Arvode: {job.salary || 'Ej angivet'}{'\n'}📅 Ansök senast: {job.expiryDate || 'Löpande'}
                </div>
              </div>
            )}
          </div>

          {/* LATO DESTRO: Controlli e Pubblicazione */}
          <div className="flex-1 p-8 overflow-y-auto bg-surface-1">
            {step === 'preview' && (
              <div className="flex flex-col gap-8">
                <section>
                  <h3 className="text-xs font-bold text-white/40 uppercase mb-4 tracking-widest">Scegli uno Stile HD</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(STYLE_LABELS).map(([styleKey, config]) => (
                      <button key={styleKey} onClick={() => onRegenerate(styleKey as ImageStyle)}
                        className={`p-4 rounded-2xl text-left border-2 transition-all ${currentStyle === styleKey ? 'border-accent bg-accent/10 shadow-lg shadow-accent/5' : 'border-white/5 bg-surface-2 hover:bg-surface-3'}`}>
                        <div className="text-sm font-bold text-white">{config.label}</div>
                        <div className="text-[10px] text-white/40 mt-1">{config.desc}</div>
                      </button>
                    ))}
                  </div>
                </section>

                {currentStyle === 'custom' && (
                  <section className="p-6 rounded-2xl bg-accent/5 border border-accent/20 flex flex-col gap-6 animate-slide-up">
                    <div className="flex items-center gap-2 text-accent-light text-xs font-bold uppercase"><Sliders size={16}/> Editor Personalizzato</div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-[10px] text-white/50 mb-2 uppercase font-mono">Posizione Titolo (Y): <span>{customSet.titleY}px</span></div>
                        <input type="range" min="-450" max="0" value={customSet.titleY} onChange={(e) => setCustomSet({...customSet, titleY: parseInt(e.target.value)})} className="w-full h-1.5 bg-surface-4 rounded-lg appearance-none cursor-pointer accent-accent" />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-white/50 mb-2 uppercase font-mono">Dimensione Font: <span>{customSet.titleSize}px</span></div>
                        <input type="range" min="30" max="80" value={customSet.titleSize} onChange={(e) => setCustomSet({...customSet, titleSize: parseInt(e.target.value)})} className="w-full h-1.5 bg-surface-4 rounded-lg appearance-none cursor-pointer accent-accent" />
                      </div>
                    </div>
                    <button onClick={() => onRegenerate('custom', customSet)} className="w-full py-3 bg-accent text-white rounded-xl text-xs font-bold shadow-xl hover:brightness-110 transition-all active:scale-[0.98]">
                      Applica Modifiche HD
                    </button>
                  </section>
                )}

                <button onClick={() => setStep('platforms')} className="w-full py-5 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-tighter mt-4 hover:bg-white/90 transition-all shadow-2xl">
                  Approva e Seleziona Social
                </button>
              </div>
            )}

            {step === 'platforms' && (
              <div className="flex flex-col gap-6 animate-fade-in">
                <h3 className="text-xl font-bold text-white">Dove vuoi pubblicare?</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(PLATFORM_CONFIG) as [Platform, any][]).map(([p, config]) => {
                    const selected = selectedPlatforms.includes(p);
                    return (
                      <button key={p} onClick={() => setSelectedPlatforms(prev => selected ? prev.filter(x => x !== p) : [...prev, p])}
                        className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${selected ? 'border-accent bg-accent/10' : 'border-white/5 bg-surface-2'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected ? 'bg-accent' : 'bg-surface-4'}`} style={selected ? { backgroundColor: config.color } : {}}>
                          <PlatformIcon platform={p} />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-white text-sm">{config.label}</div>
                          <div className="text-[10px] text-white/30">{selected ? 'Selezionato' : 'Tocca per aggiungere'}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setStep('preview')} className="px-6 py-4 rounded-xl bg-surface-3 text-white font-bold text-xs">Indietro</button>
                  <button onClick={handlePublish} disabled={!selectedPlatforms.length} className="flex-1 py-4 rounded-xl bg-accent text-white font-bold text-xs uppercase tracking-widest disabled:opacity-50">
                    Pubblica su {selectedPlatforms.length} piattaforme
                  </button>
                </div>
              </div>
            )}

            {step === 'publishing' && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-accent" size={48} />
                <h3 className="text-xl font-bold text-white">Pubblicazione in corso...</h3>
                <p className="text-white/40 text-sm">Stiamo inviando i file HD ai tuoi canali social.</p>
              </div>
            )}

            {step === 'done' && (
              <div className="flex flex-col gap-6 animate-slide-up">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/50">
                  <CheckCircle2 className="text-emerald-500" size={40} />
                </div>
                <h3 className="text-2xl font-bold text-white text-center">Lavoro completato!</h3>
                <div className="space-y-2">
                  {publishResults.map(r => (
                    <div key={r.platform} className="flex items-center justify-between p-4 bg-surface-2 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <PlatformIcon platform={r.platform} />
                        <span className="text-sm font-bold text-white">{PLATFORM_CONFIG[r.platform].label}</span>
                      </div>
                      {r.success ? <span className="text-emerald-500 text-xs font-bold">Inviato</span> : <span className="text-red-500 text-xs font-bold">Errore</span>}
                    </div>
                  ))}
                </div>
                <button onClick={onClose} className="w-full py-4 rounded-2xl bg-surface-3 text-white font-bold">Chiudi</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}