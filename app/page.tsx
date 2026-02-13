'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Film, LayoutGrid, Clock, CheckCircle2, Layers } from 'lucide-react';
import JobCard from '@/components/JobCard';
import ImageReviewModal from '@/components/ImageReviewModal';
import HistoryPanel from '@/components/HistoryPanel';
import type { AnnotatedJob, ImageStyle, CustomImageSettings } from '@/lib/types';

type Tab = 'new' | 'history';

export default function Dashboard() {
  const [jobs, setJobs] = useState<AnnotatedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('new');
  const [selectedJob, setSelectedJob] = useState<AnnotatedJob | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [currentStyle, setCurrentStyle] = useState<ImageStyle>('cinematic');
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'new' | 'done'>('all');

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleGenerate = async (job: AnnotatedJob, style: ImageStyle = 'cinematic', custom?: CustomImageSettings) => {
    setSelectedJob(job);
    setCurrentStyle(style);
    setGenerating(true);
    
    // RIMOSSO: setGeneratedImage(null); 
    // Manteniamo l'URL se presente per evitare il messaggio "Select a style to preview"

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id, 
          title: job.title, 
          salary: job.salary, 
          city: job.city,
          expiryDate: job.expiryDate, 
          slugOrId: job.slugOrId, 
          category: job.category,
          description: job.description, 
          originalImage: job.imageUrl, // URL estratto da acasting.se
          style,
          customSettings: custom
        }),
      });

      const data = await res.json();
      
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl); // Aggiorna l'immagine nel modal
        setJobs((prev) => prev.map((j) => String(j.id) === String(job.id) ? { ...j, processedStatus: 'generated' } : j));
      } else {
        console.error("API did not return imageUrl:", data);
      }
    } catch (e) {
      console.error("Generate error:", e);
    } finally { 
      setGenerating(false); 
    }
  };

  const handlePublished = (jobId: string, platforms: string[]) => {
    setJobs((prev) => prev.map((j) => String(j.id) === jobId ? { ...j, processedStatus: 'published' } : j));
    setSelectedJob(null);
    setGeneratedImage(null);
  };

  const handleSkip = async (jobId: string) => {
    await fetch(`/api/history?jobId=${jobId}`, { method: 'DELETE' });
    setJobs((prev) => prev.map((j) => String(j.id) === jobId ? { ...j, processedStatus: 'skipped' } : j));
  };

  const handleRestore = async (jobId: string) => {
    try {
      const res = await fetch(`/api/history?jobId=${jobId}`, { method: 'PATCH' });
      if (res.ok) {
        setJobs((prev) => 
          prev.map((j) => String(j.id) === jobId ? { ...j, processedStatus: 'pending' } : j)
        );
      }
    } catch (e) {
      console.error("Error restoring job:", e);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (filter === 'new') return !j.processedStatus || j.processedStatus === 'pending' || j.processedStatus === 'generated';
    if (filter === 'done') return j.processedStatus === 'published' || j.processedStatus === 'skipped';
    return true;
  });

  const newCount = jobs.filter((j) => !j.processedStatus || j.processedStatus === 'pending' || j.processedStatus === 'generated').length;
  const doneCount = jobs.filter((j) => j.processedStatus === 'published').length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <header className="border-b border-white/5 sticky top-0 z-40 backdrop-blur-xl" style={{ background: 'rgba(8,8,16,0.85)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}>
              <Film size={16} className="text-white" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Acasting <span style={{ color: 'var(--accent-light)' }}>Social</span>
            </span>
          </div>

          <nav className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'var(--surface-2)' }}>
            {(['new', 'history'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${tab === t ? 'text-white shadow-lg' : 'text-white/40 hover:text-white/70'}`}
                style={tab === t ? { background: 'var(--accent)' } : {}}>
                {t === 'new' ? 'Listings' : 'Published'}
              </button>
            ))}
          </nav>

          <button onClick={fetchJobs} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: 'var(--surface-3)', color: 'var(--accent-light)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === 'new' ? (
          <>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-6">
                <div className="text-white/40 text-sm font-mono flex items-center gap-2">
                  <Layers size={14} /><span>{jobs.length} total listings</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: 'var(--accent-light)' }}>
                  <Clock size={14} /><span className="text-sm font-mono">{newCount} items</span>
                </div>
                <div className="text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 size={14} /><span className="text-sm font-mono">{doneCount} published</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(['all', 'new', 'done'] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filter === f ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                    style={filter === f
                      ? { background: 'var(--surface-4)', border: '1px solid rgba(124,58,237,0.5)' }
                      : { background: 'var(--surface-2)', border: '1px solid transparent' }}>
                    {f === 'all' ? 'All' : f === 'new' ? 'To process' : 'Completed'}
                  </button>
                ))}
              </div>
            </div>

            {loading && !jobs.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl skeleton h-64" style={{ background: 'var(--surface-2)', animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-white/20">
                <LayoutGrid size={48} className="mb-4 opacity-30" />
                <p className="font-display text-xl">No listings found</p>
                <p className="text-sm mt-2">Click Refresh to load the latest listings</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredJobs.map((job, i) => (
                  <JobCard key={job.id} job={job} index={i}
                    onGenerate={(style: ImageStyle, custom?: CustomImageSettings) => handleGenerate(job, style, custom)}
                    onSkip={() => handleSkip(String(job.id))}
                    onRestore={() => handleRestore(String(job.id))} />
                ))}
              </div>
            )}
          </>
        ) : (
          <HistoryPanel />
        )}
      </main>

      {selectedJob && (
        <ImageReviewModal
          job={selectedJob} imageUrl={generatedImage} currentStyle={currentStyle}
          generating={generating}
          onRegenerate={(style, custom) => handleGenerate(selectedJob, style, custom)}
          onPublished={(platforms) => handlePublished(String(selectedJob.id), platforms)}
          onClose={() => { setSelectedJob(null); setGeneratedImage(null); }} />
      )}
    </div>
  );
}