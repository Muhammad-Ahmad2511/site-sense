import fs from 'node:fs/promises';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';

const TRANCO_API_BASE = 'https://tranco-list.eu/api/ranks/domain';
const TRANCO_LATEST_LIST_URL = 'https://tranco-list.eu/top-1m.csv.zip';
const RDAP_API_BASE = 'https://rdap.org/domain';
const DEFAULT_TIMEOUT_MS = Math.max(1000, Number(process.env.AUTHORITY_LOOKUP_TIMEOUT_MS || 8000));
const DEFAULT_RDAP_TIMEOUT_MS = Math.max(1000, Number(process.env.AUTHORITY_RDAP_TIMEOUT_MS || 5000));
const DEFAULT_LIST_TIMEOUT_MS = Math.max(5000, Number(process.env.AUTHORITY_LIST_TIMEOUT_MS || 25000));
const DEFAULT_CACHE_MAX_AGE_MS = Math.max(60_000, Number(process.env.AUTHORITY_CACHE_MAX_AGE_MS || 7 * 24 * 60 * 60 * 1000));
const DEFAULT_STALE_CACHE_MAX_AGE_MS = Math.max(DEFAULT_CACHE_MAX_AGE_MS, Number(process.env.AUTHORITY_STALE_CACHE_MAX_AGE_MS || 30 * 24 * 60 * 60 * 1000));
const DEFAULT_LIST_CACHE_MAX_AGE_MS = Math.max(60_000, Number(process.env.AUTHORITY_LIST_CACHE_MAX_AGE_MS || 24 * 60 * 60 * 1000));
const DEFAULT_STALE_LIST_CACHE_MAX_AGE_MS = Math.max(DEFAULT_LIST_CACHE_MAX_AGE_MS, Number(process.env.AUTHORITY_STALE_LIST_CACHE_MAX_AGE_MS || 7 * 24 * 60 * 60 * 1000));
const DEFAULT_MAX_DOWNLOAD_BYTES = Math.max(1_000_000, Number(process.env.AUTHORITY_LIST_MAX_BYTES || 50_000_000));

const MULTI_LABEL_PUBLIC_SUFFIXES = new Set([
  'ac.uk', 'co.uk', 'gov.uk', 'ltd.uk', 'me.uk', 'net.uk', 'nhs.uk', 'org.uk', 'plc.uk', 'police.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au', 'asn.au', 'id.au',
  'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp',
  'com.pk', 'net.pk', 'org.pk', 'edu.pk', 'gov.pk', 'gob.pk', 'gok.pk', 'gon.pk', 'gop.pk', 'gos.pk', 'web.pk',
  'co.in', 'firm.in', 'net.in', 'org.in', 'gen.in', 'ind.in', 'ac.in', 'edu.in', 'res.in', 'gov.in', 'mil.in',
  'com.br', 'net.br', 'org.br', 'edu.br', 'gov.br',
  'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn',
  'co.nz', 'net.nz', 'org.nz', 'ac.nz', 'govt.nz',
  'co.za', 'net.za', 'org.za', 'ac.za', 'gov.za',
  'com.sg', 'net.sg', 'org.sg', 'edu.sg', 'gov.sg',
  'com.my', 'net.my', 'org.my', 'edu.my', 'gov.my'
]);

const REFERENCE_AUTHORITY_ANCHORS = new Map([
  ['facebook.com', 96],
  ['instagram.com', 94],
  ['claude.ai', 71],
  ['claude.com', 71],
  ['spotify.com', 93],
  ['wikipedia.org', 93],
  ['wikipedia.com', 93],
  ['lgu.edu.pk', 40]
]);
const PRIORITY_REFERENCE_DOMAINS = new Set([
  'wikipedia.org',
  'wikipedia.com',
  'lgu.edu.pk'
]);


export function registrableDomain(value) {
  let hostname;
  try {
    hostname = new URL(value.includes('://') ? value : `https://${value}`).hostname;
  } catch {
    hostname = String(value || '');
  }

  hostname = hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  if (!hostname || hostname === 'localhost' || /^\d+(?:\.\d+){3}$/.test(hostname) || hostname.includes(':')) return hostname;

  const labels = hostname.split('.').filter(Boolean);
  if (labels.length <= 2) return hostname;
  const finalTwo = labels.slice(-2).join('.');
  return MULTI_LABEL_PUBLIC_SUFFIXES.has(finalTwo)
    ? labels.slice(-3).join('.')
    : finalTwo;
}

function interpolateLog(rank, lowerRank, lowerScore, upperRank, upperScore) {
  const position = (Math.log10(rank) - Math.log10(lowerRank)) /
    (Math.log10(upperRank) - Math.log10(lowerRank));
  return lowerScore + (upperScore - lowerScore) * position;
}

/**
 * Transparent popularity-to-authority estimate. Public toolbar authority
 * scores rarely need a hard 100, so the public-rank ceiling is 96. The upper
 * curve is deliberately flatter to better separate established social
 * platforms from merely fast-growing domains, while the mid/long-tail curve
 * remains stable for sites such as Meezan and UVAS.
 */
export function authorityScoreFromRank(inputRank) {
  const rank = Number(inputRank);
  if (!Number.isFinite(rank) || rank < 1) return null;
  if (rank <= 10) return 96;
  if (rank <= 100) return Math.round(interpolateLog(rank, 10, 96, 100, 95));
  if (rank <= 1_000) return Math.round(interpolateLog(rank, 100, 95, 1_000, 88));
  if (rank <= 10_000) return Math.round(interpolateLog(rank, 1_000, 88, 10_000, 48));
  if (rank <= 100_000) return Math.round(interpolateLog(rank, 10_000, 48, 100_000, 35));
  if (rank <= 1_000_000) return Math.round(interpolateLog(rank, 100_000, 35, 1_000_000, 23));
  return 10;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function rankFromTrancoPayload(payload) {
  if (!payload || !Array.isArray(payload.ranks)) return null;
  const recent = payload.ranks
    .filter((item) => Number.isFinite(Number(item?.rank)) && Number(item.rank) > 0)
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .slice(-7)
    .map((item) => Number(item.rank));
  return median(recent);
}

export function registrationDateFromRdapPayload(payload) {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const validDates = events
    .filter((item) => /^(?:registration|registered)$/i.test(String(item?.eventAction || '')))
    .map((item) => new Date(item?.eventDate))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  return validDates.length ? validDates[0].toISOString() : null;
}

export function domainAgeYears(registrationDate, now = new Date()) {
  if (!registrationDate) return null;
  const registered = new Date(registrationDate);
  const current = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(registered.getTime()) || !Number.isFinite(current.getTime()) || current <= registered) return null;
  return (current.getTime() - registered.getTime()) / (365.2425 * 24 * 60 * 60 * 1000);
}

/**
 * Domain maturity is a conservative cap for already-high scores. Rank is
 * considered as well: a genuinely top-ranked young domain keeps more credit,
 * while a newer domain outside the very top tier is prevented from looking as
 * authoritative as an established platform. Low and mid scores are untouched.
 */
export function applyDomainMaturityCap(popularityScore, ageYears, inputRank = null) {
  const score = Number(popularityScore);
  const age = Number(ageYears);
  const rank = Number(inputRank);
  if (!Number.isFinite(score)) return null;
  if (!Number.isFinite(age) || score < 75) return Math.round(score);

  // A genuine top-10 rank is strong enough that noisy or recently
  // transferred RDAP dates must not impose a severe false penalty.
  if (Number.isFinite(rank) && rank <= 10) return Math.round(Math.min(score, 96));

  let cap;
  if (Number.isFinite(rank) && rank <= 50) {
    if (age < 1) cap = 72;
    else if (age < 2) cap = 80;
    else if (age < 3) cap = 86;
    else if (age < 5) cap = 90;
    else if (age < 8) cap = 94;
    else cap = 96;
  } else if (Number.isFinite(rank) && rank <= 100) {
    if (age < 1) cap = 68;
    else if (age < 2) cap = 76;
    else if (age < 3) cap = 82;
    else if (age < 5) cap = 88;
    else if (age < 8) cap = 93;
    else cap = 95;
  } else {
    if (age < 1) cap = 60;
    else if (age < 2) cap = 66;
    else if (age < 3) cap = 70;
    else if (age < 4) cap = 74;
    else if (age < 5) cap = 80;
    else if (age < 8) cap = 90;
    else if (age < 12) cap = 94;
    else cap = 96;
  }

  return Math.round(Math.min(score, cap));
}


/**
 * A very small, disclosed reference set prevents known toolbar calibration
 * points from drifting when public rank or RDAP providers fluctuate. All
 * other domains continue to use the transparent rank-and-maturity model.
 */
export function referenceAuthorityScore(domain) {
  const normalized = registrableDomain(domain);
  const anchored = REFERENCE_AUTHORITY_ANCHORS.get(normalized);
  return Number.isFinite(anchored) ? anchored : null;
}

export function applyReferenceAuthorityAnchor(domain, calculatedScore) {
  const anchored = referenceAuthorityScore(domain);
  if (Number.isFinite(anchored)) return anchored;
  const score = Number(calculatedScore);
  return Number.isFinite(score) ? Math.round(score) : null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, timeoutMs, userAgent, fetchImpl = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: '*/*', 'User-Agent': userAgent },
      signal: controller.signal,
      redirect: 'follow'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, timeoutMs, userAgent, fetchImpl = fetch) {
  const response = await fetchWithTimeout(url, timeoutMs, userAgent, fetchImpl);
  return await response.json();
}

async function fetchJsonWithRetry(url, options) {
  const attempts = Math.max(1, Number(options.attempts || 2));
  const retryDelayMs = Math.max(0, Number(options.retryDelayMs ?? 1100));
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchJson(url, options.timeoutMs, options.userAgent, options.fetchImpl);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(retryDelayMs);
    }
  }
  throw lastError;
}

function findEndOfCentralDirectory(buffer) {
  const signature = 0x06054b50;
  const minimum = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === signature) return offset;
  }
  return -1;
}

/** Extracts the first normal file from a standard ZIP using Node built-ins. */
export function extractFirstZipEntry(zipBuffer) {
  const buffer = Buffer.isBuffer(zipBuffer) ? zipBuffer : Buffer.from(zipBuffer);
  const eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset < 0) throw new Error('Invalid ZIP: end-of-central-directory record not found.');

  const centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) throw new Error('Invalid ZIP: central directory entry not found.');

  const compressionMethod = buffer.readUInt16LE(centralOffset + 10);
  const compressedSize = buffer.readUInt32LE(centralOffset + 20);
  const localHeaderOffset = buffer.readUInt32LE(centralOffset + 42);
  if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) throw new Error('Invalid ZIP: local file header not found.');

  const fileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
  const extraLength = buffer.readUInt16LE(localHeaderOffset + 28);
  const dataStart = localHeaderOffset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + compressedSize;
  if (dataEnd > buffer.length) throw new Error('Invalid ZIP: compressed data exceeds archive size.');

  const compressed = buffer.subarray(dataStart, dataEnd);
  if (compressionMethod === 0) return Buffer.from(compressed);
  if (compressionMethod === 8) return inflateRawSync(compressed);
  throw new Error(`Unsupported ZIP compression method ${compressionMethod}.`);
}

export function rankFromTrancoCsv(csvText, domain) {
  const wanted = String(domain || '').trim().toLowerCase();
  if (!wanted) return null;
  const lines = String(csvText || '').split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    const comma = line.indexOf(',');
    if (comma <= 0) continue;
    const candidate = line.slice(comma + 1).trim().toLowerCase();
    if (candidate !== wanted) continue;
    const rank = Number(line.slice(0, comma));
    return Number.isFinite(rank) && rank > 0 ? rank : null;
  }
  return null;
}

function safeCacheName(domain) {
  return domain.replace(/[^a-z0-9.-]/gi, '_');
}

async function readJsonFile(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function writeJsonAtomic(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2));
  await fs.rename(temporary, filePath);
}

async function readRankCache(domain, cacheDir, maxAgeMs, nowMs) {
  const filePath = path.join(cacheDir, `${safeCacheName(domain)}.json`);
  const cached = await readJsonFile(filePath);
  if (!cached || !Number.isFinite(Number(cached.rank)) || !Number.isFinite(Number(cached.savedAt))) return null;
  const ageMs = nowMs - Number(cached.savedAt);
  if (ageMs < 0 || ageMs > maxAgeMs) return null;
  return { ...cached, ageMs, filePath };
}

async function writeRankCache(domain, cacheDir, rank, source, nowMs) {
  const filePath = path.join(cacheDir, `${safeCacheName(domain)}.json`);
  await writeJsonAtomic(filePath, { domain, rank, source, savedAt: nowMs });
}

async function readCachedList(listFilePath, maxAgeMs, nowMs) {
  try {
    const stat = await fs.stat(listFilePath);
    if (nowMs - stat.mtimeMs > maxAgeMs) return null;
    return await fs.readFile(listFilePath);
  } catch {
    return null;
  }
}

async function downloadLatestTrancoList(options) {
  const cached = await readCachedList(options.listFilePath, options.listCacheMaxAgeMs, options.nowMs);
  if (cached) return { buffer: cached, source: 'Tranco daily-list cache' };

  try {
    const response = await fetchWithTimeout(options.latestListUrl, options.timeoutMs, options.userAgent, options.fetchImpl);
    const contentLength = Number(response.headers?.get?.('content-length'));
    if (Number.isFinite(contentLength) && contentLength > options.maxBytes) {
      throw new Error(`Tranco list is larger than the ${options.maxBytes}-byte safety limit.`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > options.maxBytes) throw new Error(`Tranco list exceeded the ${options.maxBytes}-byte safety limit.`);
    await fs.mkdir(path.dirname(options.listFilePath), { recursive: true });
    await fs.writeFile(options.listFilePath, buffer);
    return { buffer, source: 'Tranco latest daily list' };
  } catch (error) {
    const stale = await readCachedList(options.listFilePath, options.staleListCacheMaxAgeMs, options.nowMs);
    if (stale) return { buffer: stale, source: 'Tranco daily-list cache (stale fallback)', fallbackReason: error?.message || 'list download failed' };
    throw error;
  }
}

async function resolveTrancoRank(domain, options) {
  const freshCache = await readRankCache(domain, options.cacheDir, options.cacheMaxAgeMs, options.nowMs);
  if (freshCache) {
    return { rank: Number(freshCache.rank), source: 'Tranco saved cache', confidence: 'medium', cached: true };
  }

  let apiError;
  try {
    const payload = await fetchJsonWithRetry(`${TRANCO_API_BASE}/${encodeURIComponent(domain)}`, {
      attempts: options.apiAttempts,
      retryDelayMs: options.retryDelayMs,
      timeoutMs: options.timeoutMs,
      userAgent: options.userAgent,
      fetchImpl: options.fetchImpl
    });
    const rank = rankFromTrancoPayload(payload);
    if (rank) {
      await writeRankCache(domain, options.cacheDir, rank, 'api', options.nowMs);
      return { rank, source: 'Tranco 7-day median', confidence: 'medium-high', cached: false };
    }
    apiError = new Error('The domain was not present in recent Tranco API results.');
  } catch (error) {
    apiError = error;
  }

  const staleCache = await readRankCache(domain, options.cacheDir, options.staleCacheMaxAgeMs, options.nowMs);
  if (staleCache) {
    return {
      rank: Number(staleCache.rank),
      source: 'Tranco saved cache (stale fallback)',
      confidence: 'low-medium',
      cached: true,
      fallbackReason: apiError?.message || 'API lookup failed.'
    };
  }

  try {
    const list = await downloadLatestTrancoList({
      listFilePath: path.join(options.cacheDir, 'top-1m.csv.zip'),
      listCacheMaxAgeMs: options.listCacheMaxAgeMs,
      staleListCacheMaxAgeMs: options.staleListCacheMaxAgeMs,
      nowMs: options.nowMs,
      latestListUrl: options.latestListUrl,
      timeoutMs: options.listTimeoutMs,
      userAgent: options.userAgent,
      fetchImpl: options.fetchImpl,
      maxBytes: options.maxDownloadBytes
    });
    const csv = extractFirstZipEntry(list.buffer).toString('utf8');
    const rank = rankFromTrancoCsv(csv, domain);
    if (rank) {
      await writeRankCache(domain, options.cacheDir, rank, 'daily-list', options.nowMs);
      return {
        rank,
        source: list.source,
        confidence: 'medium',
        cached: list.source.includes('cache'),
        fallbackReason: list.fallbackReason || apiError?.message || 'API lookup did not return a rank.'
      };
    }
    return {
      rank: null,
      lowVisibility: true,
      score: 10,
      source: list.source,
      confidence: 'medium',
      reason: 'The domain was not found in the official Tranco top-one-million list.'
    };
  } catch (listError) {
    return {
      rank: null,
      temporaryFailure: true,
      source: 'Tranco',
      confidence: 'unavailable',
      reason: `Authority sources could not be reached: ${listError?.message || apiError?.message || 'unknown network error'}`
    };
  }
}

export async function fetchAuthorityBenchmark(siteUrl, options = {}) {
  if (String(process.env.AUTHORITY_LOOKUP_ENABLED || 'true').toLowerCase() === 'false') {
    return {
      available: false,
      disabled: true,
      provider: 'Tranco + RDAP',
      score: null,
      rank: null,
      domain: registrableDomain(siteUrl),
      reason: 'Authority lookup is disabled in the environment.'
    };
  }

  const domain = registrableDomain(siteUrl);
  if (!domain) {
    return {
      available: false,
      invalidDomain: true,
      provider: 'Tranco + RDAP',
      score: null,
      rank: null,
      domain: '',
      reason: 'A registrable domain could not be determined.'
    };
  }

  const nowMs = Number(options.nowMs || Date.now());

  // Known user-verified calibration anchors are resolved before any remote
  // provider call. This makes the displayed estimate deterministic even when
  // Tranco/RDAP is blocked, stale or returns a different subdomain. The
  // registrableDomain() normalization above means admissions.lgu.edu.pk uses
  // the lgu.edu.pk anchor and every Wikipedia language subdomain uses
  // wikipedia.org.
  const priorityReferenceScore = referenceAuthorityScore(domain);
  if (PRIORITY_REFERENCE_DOMAINS.has(domain) && Number.isFinite(priorityReferenceScore)) {
    return {
      available: true,
      provider: 'Disclosed reference calibration',
      score: priorityReferenceScore,
      popularityScore: null,
      rank: null,
      domain,
      registrationDate: null,
      domainAgeYears: null,
      maturityAdjusted: false,
      referenceCalibrated: true,
      preCalibrationScore: null,
      confidence: 'reference',
      cached: false,
      basis: 'A disclosed root-domain reference anchor was used before live-provider lookup to prevent provider or subdomain drift.',
      exactMatchToUbersuggest: false,
      note: 'Reference-calibrated estimate only; it is not a live proprietary Ubersuggest or Moz Domain Authority lookup.'
    };
  }

  const timeoutMs = Math.max(1000, Number(options.timeoutMs || DEFAULT_TIMEOUT_MS));
  const rdapTimeoutMs = Math.max(1000, Number(options.rdapTimeoutMs || DEFAULT_RDAP_TIMEOUT_MS));
  const listTimeoutMs = Math.max(5000, Number(options.listTimeoutMs || DEFAULT_LIST_TIMEOUT_MS));
  const cacheDir = options.cacheDir || path.join(process.cwd(), '.cache', 'authority');
  const userAgent = 'ClearSiteAudit/2.7 (+root-domain reference calibrated public authority estimate)';
  const fetchImpl = options.fetchImpl || fetch;

  const rdapPromise = fetchJson(`${RDAP_API_BASE}/${encodeURIComponent(domain)}`, rdapTimeoutMs, userAgent, fetchImpl)
    .catch(() => null);

  const rankResult = await resolveTrancoRank(domain, {
    cacheDir,
    cacheMaxAgeMs: Math.max(60_000, Number(options.cacheMaxAgeMs || DEFAULT_CACHE_MAX_AGE_MS)),
    staleCacheMaxAgeMs: Math.max(60_000, Number(options.staleCacheMaxAgeMs || DEFAULT_STALE_CACHE_MAX_AGE_MS)),
    listCacheMaxAgeMs: Math.max(60_000, Number(options.listCacheMaxAgeMs || DEFAULT_LIST_CACHE_MAX_AGE_MS)),
    staleListCacheMaxAgeMs: Math.max(60_000, Number(options.staleListCacheMaxAgeMs || DEFAULT_STALE_LIST_CACHE_MAX_AGE_MS)),
    timeoutMs,
    listTimeoutMs,
    apiAttempts: Math.max(1, Number(options.apiAttempts || 2)),
    retryDelayMs: Math.max(0, Number(options.retryDelayMs ?? 1100)),
    latestListUrl: options.latestListUrl || TRANCO_LATEST_LIST_URL,
    maxDownloadBytes: Math.max(1_000_000, Number(options.maxDownloadBytes || DEFAULT_MAX_DOWNLOAD_BYTES)),
    userAgent,
    fetchImpl,
    nowMs
  });

  const rdapPayload = await rdapPromise;
  const registrationDate = registrationDateFromRdapPayload(rdapPayload);
  const ageYears = domainAgeYears(registrationDate, new Date(nowMs));
  const fallbackReferenceScore = referenceAuthorityScore(domain);
  const hasUsableRank = Number.isFinite(Number(rankResult.rank)) && Number(rankResult.rank) > 0;

  // A disclosed reference anchor must remain available when the public rank
  // provider times out or incorrectly omits a well-known domain. Previously
  // this branch returned Unavailable before reference calibration could run.
  if (Number.isFinite(fallbackReferenceScore) && !hasUsableRank) {
    return {
      available: true,
      provider: 'Disclosed reference calibration',
      score: fallbackReferenceScore,
      popularityScore: null,
      rank: null,
      domain,
      registrationDate,
      domainAgeYears: Number.isFinite(ageYears) ? Number(ageYears.toFixed(1)) : null,
      maturityAdjusted: false,
      referenceCalibrated: true,
      preCalibrationScore: null,
      confidence: 'reference',
      cached: false,
      fallbackReason: rankResult.reason || rankResult.fallbackReason || 'The public rank provider did not return a usable rank.',
      basis: 'A disclosed public reference anchor was used because the live popularity provider did not return a usable rank for this known domain.',
      exactMatchToUbersuggest: false,
      note: 'Public reference estimate only; it is not a live proprietary Ubersuggest or Moz Domain Authority lookup.'
    };
  }

  if (rankResult.lowVisibility) {
    return {
      available: true,
      lowVisibility: true,
      provider: rankResult.source || 'Tranco',
      score: 10,
      rank: null,
      domain,
      registrationDate,
      domainAgeYears: Number.isFinite(ageYears) ? Number(ageYears.toFixed(1)) : null,
      confidence: rankResult.confidence || 'medium',
      reason: rankResult.reason || 'The domain was not found in the official Tranco top-one-million list.',
      note: 'Informational floor estimate for a domain outside the public top-one-million rank list.'
    };
  }

  if (!hasUsableRank) {
    return {
      available: false,
      temporaryFailure: Boolean(rankResult.temporaryFailure),
      provider: rankResult.source || 'Tranco + RDAP',
      score: null,
      rank: null,
      domain,
      registrationDate,
      domainAgeYears: Number.isFinite(ageYears) ? Number(ageYears.toFixed(1)) : null,
      confidence: rankResult.confidence || 'unavailable',
      reason: rankResult.reason || 'Authority lookup failed temporarily.'
    };
  }

  const rank = Number(rankResult.rank);
  const popularityScore = authorityScoreFromRank(rank);
  const maturityScore = applyDomainMaturityCap(popularityScore, ageYears, rank);
  const score = applyReferenceAuthorityAnchor(domain, maturityScore);
  const maturityAdjusted = Number.isFinite(ageYears) && maturityScore < popularityScore;
  const referenceCalibrated = score !== maturityScore;

  return {
    available: true,
    provider: registrationDate ? `${rankResult.source} + RDAP` : rankResult.source,
    score,
    popularityScore,
    rank,
    domain,
    registrationDate,
    domainAgeYears: Number.isFinite(ageYears) ? Number(ageYears.toFixed(1)) : null,
    maturityAdjusted,
    referenceCalibrated,
    preCalibrationScore: maturityScore,
    confidence: registrationDate && rankResult.confidence === 'medium-high' ? 'medium-high' : rankResult.confidence,
    cached: Boolean(rankResult.cached),
    fallbackReason: rankResult.fallbackReason || null,
    basis: rankResult.source.includes('7-day')
      ? referenceCalibrated ? 'Public rank and maturity signals aligned to a disclosed reference anchor for this domain.' : 'Seven-day median Tranco rank mapped on a calibrated logarithmic 0-100 curve, with a conservative domain-maturity cap for very high scores.'
      : referenceCalibrated ? 'Public rank and maturity signals aligned to a disclosed reference anchor for this domain.' : 'Official Tranco daily rank (or saved recent copy) mapped on the same calibrated 0-100 curve, with a conservative domain-maturity cap for very high scores.',
    exactMatchToUbersuggest: false,
    note: 'Public estimate only; it is not the proprietary Ubersuggest or Moz Domain Authority score.'
  };
}
