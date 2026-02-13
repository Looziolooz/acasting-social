'use client';

import { useState, useEffect } from 'react';
import { X, Check, RotateCcw, Send, Loader2, ExternalLink, Facebook, Instagram, Linkedin, AlertCircle, CheckCircle2, Download, Copy, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import type { AcastingJob, ImageStyle, Platform, PublishResult } from '@/lib/types';
import { STYLE_LABELS, PLATFORM_CONFIG } from '@/lib/types';

interface AnnotatedJob extends AcastingJob { processedStatus: string | null; }

interface Props {
  job: AnnotatedJob; imageUrl: string | null; currentStyle: ImageStyle; generating: boolean;
  onRegenerate: (style: ImageStyle) => void; onPublished: (platforms: string[]) => void; onClose: () => void;
}

type Step = 'preview' | 'platforms' | 'publishing' | 'done';

export default function ImageReviewModal({ job, imageUrl, currentStyle, generating, onRegenerate, onPublished, onClose }: Props) {
  const [step, setStep] = useState<Step>('preview');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'facebook']);
  const [customCaption, setCustomCaption] = useState('');
  const [publishResults, setPublishResults] = useState<PublishResult[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [showCaptionPreview, setShowCaptionPreview] = useState(false);

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
    a.download = `casting-${job.title.slice(0, 15)}.jpg`;
    a.click();
  };

  const copyCaption = () => {
    navigator.clipboard.writeText(customCaption || "Caption non generata");
    alert("Caption copiata per Telegram/Social!");
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
      if (data.success) onPublished(selectedPlatforms);
    } finally { setPublishing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-surface-1 rounded-3xl overflow-hidden shadow-2xl border border-white/5 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-display font-bold text-white truncate">{job.title}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex flex-col md:flex-row overflow-y-auto">
          {/* Preview Image & Telegram Preview */}
          <div className="md:w-[360px] p-6 bg-black/20 flex flex-col gap-4">
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black shadow-inner">
              {generating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="animate-spin text-accent" />
                  <span className="text-xs text-white/50">Rendering HD...</span>
                </div>
              ) : imageUrl ? (
                <Image src={imageUrl} alt="Final" fill className="object-cover" unoptimized />
              ) : null}
            </div>

            {/* DOWNLOAD & COPY SECTION */}
            <div className="flex flex-col gap-2">
               <button onClick={downloadImage} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-3 text-white text-xs font-bold hover:bg-surface-4 transition-all">
                 <Download size={14} /> Scarica Immagine HD
               </button>
               <button onClick={() => setShowCaptionPreview(!showCaptionPreview)} className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-white/70 text-xs hover:bg-white/5">
                 <MessageSquare size={14} /> {showCaptionPreview ? 'Nascondi Caption' : 'Mostra Caption'}
               </button>
            </div>

            {showCaptionPreview && (
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex flex-col gap-2">
                <div className="text-[10px] text-white/40 uppercase font-mono">Anteprima Testo</div>
                <div className="text-[11px] text-white/80 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                  {customCaption || "Caricamento dettagli..."}
                </div>
                <button onClick={copyCaption} className="text-accent-light text-[10px] font-bold flex items-center gap-1 self-end mt-1">
                  <Copy size={10} /> Copia per Telegram
                </button>
              </div>
            )}
          </div>

          {/* Controls Panel */}
          <div className="flex-1 p-6 flex flex-col gap-6">
            {step === 'preview' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STYLE_LABELS).map(([styleKey, config]) => (
                    <button key={styleKey} onClick={() => onRegenerate(styleKey as ImageStyle)}
                      className={`p-3 rounded-xl text-left border transition-all ${currentStyle === styleKey ? 'border-accent bg-accent/10' : 'border-white/5 bg-surface-2'}`}>
                      <div className="text-sm font-bold text-white">{config.label}</div>
                      <div className="text-[10px] text-white/40">{config.desc}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setStep('platforms')} className="w-full py-4 rounded-2xl bg-accent text-white font-bold mt-auto shadow-lg hover:brightness-110">
                  Approvazione e Pubblicazione
                </button>
              </>
            )}
            {/* ... Altri step (platforms, done) rimangono simili ... */}
          </div>
        </div>
      </div>
    </div>
  );
}