import { registrableDomain } from './authority.js';

const BLOCK_PAGE_PATTERN = /(?:checking your browser|just a moment|access denied|verify you are human|captcha|cf-chl|cloudflare ray id|unusual traffic|bot detection|request blocked)/i;

export function buildHomepageCandidates(inputUrl) {
  const initial = inputUrl instanceof URL ? new URL(inputUrl.href) : new URL(inputUrl);
  initial.hash = '';
  const candidates = [initial.href];
  const baseDomain = registrableDomain(initial.hostname);
  const isApex = initial.hostname === baseDomain;
  const isWww = initial.hostname === `www.${baseDomain}`;
  if (isApex || isWww) {
    const alternate = new URL(initial.href);
    alternate.hostname = isWww ? baseDomain : `www.${baseDomain}`;
    if (!candidates.includes(alternate.href)) candidates.push(alternate.href);
  }
  return candidates;
}

export function looksLikeProtectionPage({ status = 0, title = '', text = '', html = '' } = {}) {
  const combined = `${title}\n${text}\n${html}`.slice(0, 50_000);
  const protectedStatus = [401, 403, 429, 503].includes(Number(status));
  return BLOCK_PAGE_PATTERN.test(combined) || (protectedStatus && String(text || '').trim().length < 800);
}
