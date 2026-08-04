import { useCallback, useRef, useState } from 'react';
import { startAudit, pollAuditJob } from '../services/auditService';

// idle -> starting -> running -> complete | failed
export function useAuditRun({ onComplete } = {}) {
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const abortRef = useRef(null);

  const run = useCallback(
    async (url) => {
      if (phase === 'starting' || phase === 'running') return; // prevent duplicate submissions
      setError('');
      setResult(null);
      setProgress({ percent: 0 });
      setPhase('starting');

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const jobId = await startAudit(url);
        setPhase('running');
        const auditResult = await pollAuditJob(jobId, {
          signal: controller.signal,
          onProgress: (nextProgress) => setProgress(nextProgress)
        });
        setResult(auditResult);
        setPhase('complete');
        onComplete?.(auditResult);
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setError(err.message || 'The audit could not be completed.');
        setPhase('failed');
      }
    },
    [phase, onComplete]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPhase('idle');
    setProgress({});
    setResult(null);
    setError('');
  }, []);

  return {
    phase,
    progress,
    result,
    error,
    run,
    reset,
    isBusy: phase === 'starting' || phase === 'running'
  };
}
