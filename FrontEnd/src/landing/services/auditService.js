// Talks to the existing Express endpoints exactly as public/app.js did —
// same request/response shapes, same polling interval. No backend changes.
const POLL_INTERVAL_MS = 700;

export async function getStatus() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    return data;
  } catch {
    return { ok: false, aiConfigured: false };
  }
}

export async function startAudit(url) {
  const response = await fetch('/api/audit/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, crawlScope: 'whole' })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The audit could not be started.');
  return data.jobId;
}

export async function pollAuditJob(jobId, { onProgress, signal } = {}) {
  for (;;) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const response = await fetch(`/api/audit/${encodeURIComponent(jobId)}`, { cache: 'no-store', signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not read audit progress.');

    onProgress?.(data.progress || {}, data.status);

    if (data.status === 'failed') throw new Error(data.error || 'The audit failed.');
    if (data.status === 'complete') return data.result;
  }
}

export async function requestAiSummary(audit) {
  const response = await fetch('/api/ai-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audit })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The AI explanation failed.');
  return data.explanation;
}

export const STAGE_LABELS = {
  queued: 'Audit queued…',
  validation: 'Validating website…',
  browser: 'Starting browser…',
  homepage: 'Analysing homepage…',
  discovery: 'Discovering pages…',
  crawl: 'Crawling website…',
  evidence: 'Collecting evidence…',
  rules: 'Checking audit rules…',
  scoring: 'Calculating scores…',
  report: 'Building report…',
  complete: 'Audit complete'
};
