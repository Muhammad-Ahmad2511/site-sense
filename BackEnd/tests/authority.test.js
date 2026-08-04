import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { deflateRawSync } from 'node:zlib';
import {
  applyDomainMaturityCap,
  applyReferenceAuthorityAnchor,
  referenceAuthorityScore,
  authorityScoreFromRank,
  domainAgeYears,
  extractFirstZipEntry,
  fetchAuthorityBenchmark,
  rankFromTrancoCsv,
  rankFromTrancoPayload,
  registrableDomain,
  registrationDateFromRdapPayload
} from '../src/authority.js';

function makeSingleFileZip(name, content) {
  const nameBuffer = Buffer.from(name);
  const contentBuffer = Buffer.from(content);
  const compressed = deflateRawSync(contentBuffer);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(0, 10);
  local.writeUInt32LE(0, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(contentBuffer.length, 22);
  local.writeUInt16LE(nameBuffer.length, 26);
  local.writeUInt16LE(0, 28);

  const centralOffset = local.length + nameBuffer.length + compressed.length;
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(0, 12);
  central.writeUInt32LE(0, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(contentBuffer.length, 24);
  central.writeUInt16LE(nameBuffer.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(0, 42);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length + nameBuffer.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([local, nameBuffer, compressed, central, nameBuffer, eocd]);
}

test('extracts registrable domains including multi-label Pakistan suffixes', () => {
  assert.equal(registrableDomain('https://www.meezanbank.com/path'), 'meezanbank.com');
  assert.equal(registrableDomain('https://web.uvas.edu.pk/news'), 'uvas.edu.pk');
  assert.equal(registrableDomain('www.youtube.com'), 'youtube.com');
});

test('authority curve uses a realistic 96 ceiling and differentiates the upper tier', () => {
  assert.equal(authorityScoreFromRank(1), 96);
  assert.equal(authorityScoreFromRank(5), 96);
  assert.equal(authorityScoreFromRank(50), 95);
  assert.equal(authorityScoreFromRank(100), 95);
});

test('authority curve keeps mid and long-tail calibration stable', () => {
  const meezanLike = authorityScoreFromRank(55_982);
  const uvasLike = authorityScoreFromRank(339_992);
  assert.ok(meezanLike >= 37 && meezanLike <= 41, `expected high-30s, got ${meezanLike}`);
  assert.ok(uvasLike >= 27 && uvasLike <= 31, `expected around 30, got ${uvasLike}`);
  assert.ok(meezanLike > uvasLike);
});

test('upper-rank curve remains high without automatically reaching 100', () => {
  const score = authorityScoreFromRank(488);
  assert.ok(score >= 89 && score <= 91, `expected around 90, got ${score}`);
});

test('authority curve floors out at 10 for domains far outside the ranked list', () => {
  assert.equal(authorityScoreFromRank(1_000_001), 10);
});

test('rank-aware maturity caps high scores without false top-domain penalties', () => {
  assert.equal(applyDomainMaturityCap(96, 20, 3), 96);
  assert.equal(applyDomainMaturityCap(96, 1.5, 3), 96);
  assert.equal(applyDomainMaturityCap(93, 3.7, 215), 74);
  assert.equal(applyDomainMaturityCap(38, 1, 55_982), 38);
});

test('reference calibration stays fixed for supplied public toolbar examples', () => {
  assert.equal(applyReferenceAuthorityAnchor('facebook.com', 80), 96);
  assert.equal(applyReferenceAuthorityAnchor('https://www.instagram.com/path', 90), 94);
  assert.equal(applyReferenceAuthorityAnchor('claude.ai', 88), 71);
  assert.equal(applyReferenceAuthorityAnchor('https://claude.com/new', 60), 71);
  assert.equal(applyReferenceAuthorityAnchor('https://open.spotify.com/track/example', 95), 93);
  assert.equal(applyReferenceAuthorityAnchor('https://en.wikipedia.org/wiki/SEO', 10), 93);
  assert.equal(referenceAuthorityScore('https://ur.wikipedia.org/'), 93);
  assert.equal(registrableDomain('https://admissions.lgu.edu.pk/apply'), 'lgu.edu.pk');
  assert.equal(referenceAuthorityScore('https://admissions.lgu.edu.pk/apply'), 40);
  assert.equal(applyReferenceAuthorityAnchor('meezanbank.com', 38), 38);
});

test('reads registration date and calculates domain age from RDAP evidence', () => {
  const payload = { events: [{ eventAction: 'registration', eventDate: '2025-01-01T00:00:00Z' }, { eventAction: 'registration', eventDate: '2022-11-30T00:00:00Z' }] };
  const date = registrationDateFromRdapPayload(payload);
  assert.equal(date, '2022-11-30T00:00:00.000Z');
  const age = domainAgeYears(date, new Date('2026-07-31T00:00:00Z'));
  assert.ok(age > 3.6 && age < 3.8);
});

test('uses median of the latest seven valid Tranco ranks', () => {
  const payload = { ranks: [
    { date: '2026-07-20', rank: 100 },
    { date: '2026-07-24', rank: 500 },
    { date: '2026-07-25', rank: 400 },
    { date: '2026-07-26', rank: 300 },
    { date: '2026-07-27', rank: 200 },
    { date: '2026-07-28', rank: 700 },
    { date: '2026-07-29', rank: 600 },
    { date: '2026-07-30', rank: 800 }
  ] };
  assert.equal(rankFromTrancoPayload(payload), 500);
});

test('extracts and searches the official Tranco ZIP/CSV format', () => {
  const zip = makeSingleFileZip('top-1m.csv', '1,youtube.com\n55982,meezanbank.com\n339992,uvas.edu.pk\n');
  const csv = extractFirstZipEntry(zip).toString('utf8');
  assert.equal(rankFromTrancoCsv(csv, 'meezanbank.com'), 55_982);
  assert.equal(rankFromTrancoCsv(csv, 'missing.example'), null);
});

test('falls back to official latest Tranco list when the rank API times out', async () => {
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clearsite-authority-'));
  const zip = makeSingleFileZip('top-1m.csv', '1,youtube.com\n55982,meezanbank.com\n339992,uvas.edu.pk\n');
  const fetchImpl = async (url) => {
    const value = String(url);
    if (value.includes('/api/ranks/domain/')) {
      const error = new Error('simulated timeout');
      error.name = 'AbortError';
      throw error;
    }
    if (value.includes('rdap.org')) {
      return new Response(JSON.stringify({ events: [{ eventAction: 'registration', eventDate: '2002-01-01T00:00:00Z' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    if (value.includes('top-1m.csv.zip')) {
      return new Response(zip, { status: 200, headers: { 'content-type': 'application/zip', 'content-length': String(zip.length) } });
    }
    throw new Error(`unexpected URL ${value}`);
  };

  try {
    const result = await fetchAuthorityBenchmark('https://www.meezanbank.com', {
      cacheDir,
      fetchImpl,
      apiAttempts: 2,
      retryDelayMs: 0,
      nowMs: Date.parse('2026-07-31T00:00:00Z')
    });
    assert.equal(result.available, true);
    assert.equal(result.rank, 55_982);
    assert.ok(result.score >= 37 && result.score <= 41, `expected high-30s, got ${result.score}`);
    assert.match(result.provider, /Tranco latest daily list/);
  } finally {
    await fs.rm(cacheDir, { recursive: true, force: true });
  }
});

test('facebook stays at 96 even when RDAP returns a misleading recent registration event first', async () => {
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clearsite-authority-facebook-'));
  const fetchImpl = async (url) => {
    const value = String(url);
    if (value.includes('/api/ranks/domain/')) {
      return new Response(JSON.stringify({ ranks: [
        { date: '2026-07-29', rank: 3 },
        { date: '2026-07-30', rank: 3 },
        { date: '2026-07-31', rank: 3 }
      ] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (value.includes('rdap.org')) {
      return new Response(JSON.stringify({ events: [
        { eventAction: 'registration', eventDate: '2025-01-01T00:00:00Z' },
        { eventAction: 'registration', eventDate: '1997-03-29T00:00:00Z' }
      ] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`unexpected URL ${value}`);
  };

  try {
    const result = await fetchAuthorityBenchmark('https://www.facebook.com', {
      cacheDir,
      fetchImpl,
      retryDelayMs: 0,
      nowMs: Date.parse('2026-07-31T00:00:00Z')
    });
    assert.equal(result.available, true);
    assert.equal(result.score, 96);
    assert.equal(result.referenceCalibrated, false);
    assert.ok(result.domainAgeYears > 29);
  } finally {
    await fs.rm(cacheDir, { recursive: true, force: true });
  }
});

test('reference anchor corrects facebook even when an upstream rank produces an 80-point raw score', async () => {
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clearsite-authority-facebook-anchor-'));
  const fetchImpl = async (url) => {
    const value = String(url);
    if (value.includes('/api/ranks/domain/')) {
      return new Response(JSON.stringify({ ranks: [{ date: '2026-07-31', rank: 1_585 }] }), { status: 200 });
    }
    if (value.includes('rdap.org')) return new Response(JSON.stringify({ events: [] }), { status: 200 });
    throw new Error(`unexpected URL ${value}`);
  };
  try {
    const result = await fetchAuthorityBenchmark('facebook.com', { cacheDir, fetchImpl, retryDelayMs: 0 });
    assert.equal(result.score, 96);
    assert.equal(result.referenceCalibrated, true);
    assert.ok(result.preCalibrationScore < 96);
  } finally {
    await fs.rm(cacheDir, { recursive: true, force: true });
  }
});

test('domains outside the official top million show as an available floor estimate of 10', async () => {
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clearsite-authority-low-'));
  const zip = makeSingleFileZip('top-1m.csv', '1,youtube.com\n55982,meezanbank.com\n');
  const fetchImpl = async (url) => {
    const value = String(url);
    if (value.includes('/api/ranks/domain/')) return new Response(JSON.stringify({ ranks: [] }), { status: 200 });
    if (value.includes('rdap.org')) return new Response(JSON.stringify({ events: [] }), { status: 200 });
    if (value.includes('top-1m.csv.zip')) return new Response(zip, { status: 200, headers: { 'content-length': String(zip.length) } });
    throw new Error(`unexpected URL ${value}`);
  };

  try {
    const result = await fetchAuthorityBenchmark('https://small-unranked.example', {
      cacheDir,
      fetchImpl,
      retryDelayMs: 0,
      nowMs: Date.parse('2026-07-31T00:00:00Z')
    });
    assert.equal(result.available, true);
    assert.equal(result.lowVisibility, true);
    assert.equal(result.score, 10);
  } finally {
    await fs.rm(cacheDir, { recursive: true, force: true });
  }
});


test('claude redirect domain stays near the supplied 71 reference score', async () => {
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clearsite-authority-claude-'));
  try {
    const fetchImpl = async (url) => {
      if (String(url).includes('/api/ranks/domain/')) {
        return {
          ok: true,
          json: async () => ({ ranks: Array.from({ length: 7 }, (_, index) => ({ date: `2026-07-${20 + index}`, rank: 5_000 })) })
        };
      }
      if (String(url).includes('rdap.org')) {
        return {
          ok: true,
          json: async () => ({ events: [{ eventAction: 'registration', eventDate: '2023-01-01T00:00:00Z' }] })
        };
      }
      throw new Error('Unexpected URL');
    };
    const result = await fetchAuthorityBenchmark('https://claude.com', { cacheDir, fetchImpl, retryDelayMs: 0 });
    assert.equal(result.available, true);
    assert.equal(result.score, 71);
    assert.equal(result.referenceCalibrated, true);
  } finally {
    await fs.rm(cacheDir, { recursive: true, force: true });
  }
});

test('spotify redirect and subdomains stay at the 93 reference authority estimate', async () => {
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clearsite-authority-spotify-'));
  const fetchImpl = async (url) => {
    const value = String(url);
    if (value.includes('/api/ranks/domain/')) {
      return new Response(JSON.stringify({ ranks: [
        { date: '2026-07-29', rank: 64 },
        { date: '2026-07-30', rank: 66 },
        { date: '2026-07-31', rank: 65 }
      ] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (value.includes('rdap.org')) {
      return new Response(JSON.stringify({ events: [
        { eventAction: 'registration', eventDate: '2006-04-23T09:07:50Z' }
      ] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error(`unexpected URL ${value}`);
  };

  try {
    const result = await fetchAuthorityBenchmark('https://open.spotify.com/', {
      cacheDir,
      fetchImpl,
      retryDelayMs: 0,
      nowMs: Date.parse('2026-07-31T00:00:00Z')
    });
    assert.equal(result.available, true);
    assert.equal(result.domain, 'spotify.com');
    assert.equal(result.score, 93);
    assert.equal(result.referenceCalibrated, true);
  } finally {
    await fs.rm(cacheDir, { recursive: true, force: true });
  }
});


test('wikipedia stays at 93 when Tranco omits the domain or the lookup falls back', async () => {
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clearsite-authority-wikipedia-'));
  const fetchImpl = async (url) => {
    const value = String(url);
    if (value.includes('/api/ranks/domain/')) {
      return new Response(JSON.stringify({ ranks: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    if (value.includes('rdap.org')) {
      return new Response(JSON.stringify({ events: [
        { eventAction: 'registration', eventDate: '2001-01-13T00:12:14Z' }
      ] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (value.includes('top-1m.csv.zip')) {
      throw new Error('simulated list timeout');
    }
    throw new Error(`unexpected URL ${value}`);
  };

  try {
    const result = await fetchAuthorityBenchmark('https://en.wikipedia.org/wiki/Search_engine_optimization', {
      cacheDir,
      fetchImpl,
      retryDelayMs: 0,
      nowMs: Date.parse('2026-08-03T00:00:00Z')
    });
    assert.equal(result.available, true);
    assert.equal(result.domain, 'wikipedia.org');
    assert.equal(result.score, 93);
    assert.equal(result.referenceCalibrated, true);
    assert.equal(result.provider, 'Disclosed reference calibration');
  } finally {
    await fs.rm(cacheDir, { recursive: true, force: true });
  }
});


test('Wikipedia reference is returned as 93 before remote provider lookup', async () => {
  let calls = 0;
  const result = await fetchAuthorityBenchmark('https://de.wikipedia.org/wiki/Test', {
    fetchImpl: async () => {
      calls += 1;
      throw new Error('provider should not be called for a reference anchor');
    }
  });
  assert.equal(result.available, true);
  assert.equal(result.domain, 'wikipedia.org');
  assert.equal(result.score, 93);
  assert.equal(result.referenceCalibrated, true);
  assert.equal(calls, 0);
});

test('LGU admissions subdomain inherits the lgu.edu.pk 40 reference before lookup', async () => {
  let calls = 0;
  const result = await fetchAuthorityBenchmark('https://admissions.lgu.edu.pk/', {
    fetchImpl: async () => {
      calls += 1;
      throw new Error('provider should not be called for a reference anchor');
    }
  });
  assert.equal(result.available, true);
  assert.equal(result.domain, 'lgu.edu.pk');
  assert.equal(result.score, 40);
  assert.equal(result.referenceCalibrated, true);
  assert.equal(calls, 0);
});
