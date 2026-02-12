'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Film, LayoutGrid, Clock, CheckCircle2, Layers, RotateCcw } from 'lucide-react';
import JobCard from '@/components/JobCard';
import ImageReviewModal from '@/components/ImageReviewModal';
import HistoryPanel from '@/components/HistoryPanel';
import type { AcastingJob, ImageStyle, CustomOverlayStyle } from '@/lib/types';

type Tab = 'new' | 'history';

interface AnnotatedJob extends AcastingJob {
  processedStatus: string | null;
}

interface PendingSkip {
  jobId: string;
  title: string;
  timeoutId: ReturnType<typeof setTimeout>;
  secondsLeft: number;
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<AnnotatedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('new');
  const [selectedJob, setSelectedJob] = useState<AnnotatedJob | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [currentStyle, setCurrentStyle] = useState<ImageStyle>('dark');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'done'>('all');
  const [pendingSkip, setPendingSkip] = useState<PendingSkip | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (e) {
      console.error('[fetchJobs]', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleGenerate = async (
    job: AnnotatedJob,
    style: ImageStyle = 'dark',
    customStyle?: CustomOverlayStyle
  ) => {
    setSelectedJob(job);
    setCurrentStyle(style);
    setGenerating(true);
    setGeneratedImage(null);
    setGenerateError(null);

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
          originalImage: job.imageUrl,
          style,
          customStyle,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setGenerateError(data.error || `HTTP ${res.status}`);
        return;
      }

      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setJobs(prev => prev.map(j =>
          String(j.id) === String(job.id) ? { ...j, processedStatus: 'generated' } : j
        ));
      } else {
        setGenerateError('No image URL received from server.');
      }
    } catch (e) {
      setGenerateError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setGenerating(false);
    }
  };

  const handlePublished = (jobId: string, _platforms: string[]) => {
    setJobs(prev => prev.map(j =>
      String(j.id) === jobId ? { ...j, processedStatus: 'published' } : j
    ));
    setSelectedJob(null);
    setGeneratedImage(null);
    setGenerateError(null);
  };

  /** Start a 5-second countdown before actually skipping */
  const handleSkip = (jobId: string) => {
    const job = jobs.find(j => String(j.id) === jobId);
    if (!job) return;

    // Optimistically mark as skipped in UI immediately
    setJobs(prev => prev.map(j =>
      String(j.id) === jobId ? { ...j, processedStatus: 'skipped' } : j
    ));

    // Clear any previous pending skip
    if (pendingSkip) {
      clearTimeout(pendingSkip.timeoutId);
      if (countdownRef.current) clearInterval(countdownRef.current);
      // Commit the previous skip immediately
      fetch(`/api/history?jobId=${pendingSkip.jobId}`, { method: 'DELETE' });
    }

    const DELAY = 5;

    const timeoutId = setTimeout(async () => {
      // Actually commit the skip to DB
      await fetch(`/api/history?jobId=${jobId}`, { method: 'DELETE' });
      if (countdownRef.current) clearInterval(countdownRef.current);
      setPendingSkip(null);
    }, DELAY * 1000);

    const newPending: PendingSkip = {
      jobId,
      title: job.title,
      timeoutId,
      secondsLeft: DELAY,
    };
    setPendingSkip(newPending);

    // Countdown ticker
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setPendingSkip(prev => {
        if (!prev) return null;
        const next = prev.secondsLeft - 1;
        if (next <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return null;
        }
        return { ...prev, secondsLeft: next };
      });
    }, 1000);
  };

  /** Cancel the pending skip and restore the card */
  const handleUndoSkip = () => {
    if (!pendingSkip) return;
    clearTimeout(pendingSkip.timeoutId);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Restore card to original state
    setJobs(prev => prev.map(j =>
      String(j.id) === pendingSkip.jobId ? { ...j, processedStatus: null } : j
    ));
    setPendingSkip(null);
  };

  const filteredJobs = jobs.filter(j => {
    if (filter === 'new')  return !j.processedStatus || j.processedStatus === 'generated';
    if (filter === 'done') return j.processedStatus === 'published' || j.processedStatus === 'skipped';
    return true;
  });

  const newCount  = jobs.filter(j => !j.processedStatus || j.processedStatus === 'generated').length;
  const doneCount = jobs.filter(j => j.processedStatus === 'published').length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      {/* Header */}
      <header className="border-b border-white/5 sticky top-0 z-40 backdrop-blur-xl"
        style={{ background: 'rgba(8,8,16,0.85)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}>
              <Film size={16} className="text-white" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Acasting <span style={{ color: 'var(--accent-light)' }}>Social</span>
            </span>
          </div>

          <nav className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'var(--surface-2)' }}>
            {(['new', 'history'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  tab === t ? 'text-white shadow-lg' : 'text-white/40 hover:text-white/70'
                }`}
                style={tab === t ? { background: 'var(--accent)' } : {}}>
                {t === 'new' ? 'Jobs' : 'Published'}
              </button>
            ))}
          </nav>

          <button onClick={fetchJobs} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95"
            style={{ background: 'var(--surface-3)', color: 'var(--accent-light)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === 'new' ? (
          <>
            {/* Stats */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-6">
                <div className="text-white/40 text-sm font-mono flex items-center gap-2">
                  <Layers size={14} />
                  <span>{jobs.length} total jobs</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: 'var(--accent-light)' }}>
                  <Clock size={14} />
                  <span className="text-sm font-mono">{newCount} new</span>
                </div>
                <div className="text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  <span className="text-sm font-mono">{doneCount} published</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(['all', 'new', 'done'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      filter === f ? 'text-white' : 'text-white/30 hover:text-white/60'
                    }`}
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
                  <div key={i} className="rounded-2xl skeleton h-64"
                    style={{ background: 'var(--surface-2)', animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-white/20">
                <LayoutGrid size={48} className="mb-4 opacity-30" />
                <p className="font-display text-xl">No jobs found</p>
                <p className="text-sm mt-2">Click Refresh to load the latest listings</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredJobs.map((job, i) => (
                  <JobCard key={job.id} job={job} index={i}
                    onGenerate={style => handleGenerate(job, style)}
                    onSkip={() => handleSkip(String(job.id))} />
                ))}
              </div>
            )}
          </>
        ) : (
          <HistoryPanel />
        )}
      </main>

      {/* ── Undo Skip Toast ── */}
      {pendingSkip && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3.5 rounded-2xl shadow-2xl"
          style={{
            background: 'var(--surface-3)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(16px)',
            animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* Countdown ring */}
          <div className="relative w-8 h-8 flex-shrink-0">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
              <circle
                cx="16" cy="16" r="13" fill="none"
                stroke="#7C3AED" strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 13}`}
                strokeDashoffset={`${2 * Math.PI * 13 * (1 - pendingSkip.secondsLeft / 5)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.9s linear' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
              {pendingSkip.secondsLeft}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-white text-sm font-medium">Job skipped</span>
            <span className="text-white/40 text-xs truncate max-w-[200px]">
              {pendingSkip.title}
            </span>
          </div>

          <button
            onClick={handleUndoSkip}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
            style={{ background: 'rgba(124,58,237,0.25)', color: 'var(--accent-light)', border: '1px solid rgba(124,58,237,0.4)' }}
          >
            <RotateCcw size={13} />
            Undo
          </button>
        </div>
      )}

      {/* Image Review Modal */}
      {selectedJob && (
        <ImageReviewModal
          job={selectedJob}
          imageUrl={generatedImage}
          generateError={generateError}
          currentStyle={currentStyle}
          generating={generating}
          onRegenerate={(style, customStyle) => handleGenerate(selectedJob, style, customStyle)}
          onPublished={platforms => handlePublished(String(selectedJob.id), platforms)}
          onClose={() => {
            setSelectedJob(null);
            setGeneratedImage(null);
            setGenerateError(null);
          }}
        />
      )}
    </div>
  );
}