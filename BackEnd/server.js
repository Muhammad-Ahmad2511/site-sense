import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { auditWebsite } from './src/auditor.js';
import { generateGroundedExplanation, isAiConfigured } from './src/ai.js';
import { resolveCrawlSelection } from './src/crawl-options.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], fontSrc: ["'self'"],
      objectSrc: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

let activeAudit = false;
const jobs = new Map();
const recentRequests = new Map();

function allowRequest(ip) {
  const now = Date.now();
  const previous = (recentRequests.get(ip) || []).filter((time) => now - time < 60_000);
  if (previous.length >= 6) return false;
  previous.push(now); recentRequests.set(ip, previous); return true;
}

function cleanJobs() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of jobs) if (job.updatedAt < cutoff) jobs.delete(id);
}
setInterval(cleanJobs, 10 * 60 * 1000).unref();

app.get('/api/status', (_req, res) => res.json({
  ok: true,
  aiConfigured: isAiConfigured(),
  activeAudit,
  maxCrawlPages: Math.max(1, Number(process.env.MAX_CRAWL_PAGES || 120)),
  authorityLookupEnabled: String(process.env.AUTHORITY_LOOKUP_ENABLED || 'true').toLowerCase() !== 'false'
}));

app.post('/api/audit/start', async (req, res) => {
  if (!allowRequest(req.ip || 'unknown')) return res.status(429).json({ error: 'Too many audit requests. Please wait one minute and retry.' });
  if (activeAudit) return res.status(429).json({ error: 'Another audit is currently running. Please retry shortly.' });
  const { url } = req.body || {};
  const crawlSelection = resolveCrawlSelection(
    { crawlScope: 'whole' },
    Math.max(1, Number(process.env.MAX_CRAWL_PAGES || 120))
  );
  const id = crypto.randomUUID();
  const job = { id, status: 'queued', progress: { stage: 'queued', message: 'Audit queued.', percent: 0 }, result: null, error: null, updatedAt: Date.now() };
  jobs.set(id, job); activeAudit = true;
  res.status(202).json({ jobId: id });

  try {
    job.status = 'running';
    job.result = await auditWebsite(url, (progress) => {
      job.progress = progress; job.updatedAt = Date.now();
      console.log(`[audit ${id}] ${progress.stage}: ${progress.message}`);
    }, crawlSelection);
    job.status = 'complete'; job.progress = { stage: 'complete', message: 'Audit complete.', percent: 100, pagesReviewed: job.result.pages.length, findingsFound: job.result.findings.length };
  } catch (error) {
    console.error(error);
    job.status = 'failed'; job.error = error?.message || 'The audit could not be completed.';
  } finally {
    job.updatedAt = Date.now(); activeAudit = false;
  }
});

app.get('/api/audit/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Audit job was not found or has expired.' });
  return res.json({ status: job.status, progress: job.progress, result: job.status === 'complete' ? job.result : undefined, error: job.error });
});

app.post('/api/ai-summary', async (req, res) => {
  if (!isAiConfigured()) return res.status(503).json({ error: 'AI explanations are not configured.' });
  const audit = req.body?.audit;
  if (!audit || !Array.isArray(audit.findings) || !audit.scores) return res.status(400).json({ error: 'A completed audit is required.' });
  if (audit.findings.length > 250) return res.status(400).json({ error: 'The audit contains too many findings for one explanation request.' });
  try {
    const explanation = await generateGroundedExplanation(audit);
    return res.json({ explanation, source: 'ai', editable: true });
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: 'The AI explanation failed. The verified audit results remain available.' });
  }
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  return next();
});

app.listen(port, () => {
  console.log(`Website audit tool running at http://localhost:${port}`);
});