import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHomepageCandidates, looksLikeProtectionPage } from '../src/resilient-navigation.js';

test('homepage retry includes www and non-www variants', () => {
  assert.deepEqual(buildHomepageCandidates('https://olx.com.pk/'), [
    'https://olx.com.pk/',
    'https://www.olx.com.pk/'
  ]);
  assert.deepEqual(buildHomepageCandidates('https://www.example.com/path'), [
    'https://www.example.com/path',
    'https://example.com/path'
  ]);
  assert.deepEqual(buildHomepageCandidates('https://open.spotify.com/'), [
    'https://open.spotify.com/'
  ]);
});

test('anti-bot and CAPTCHA pages are detected instead of scored as real content', () => {
  assert.equal(looksLikeProtectionPage({ status: 403, title: 'Just a moment...', text: 'Checking your browser before accessing the site.' }), true);
  assert.equal(looksLikeProtectionPage({ status: 429, title: 'Verify you are human', text: 'CAPTCHA' }), true);
  assert.equal(looksLikeProtectionPage({ status: 200, title: 'OLX Pakistan', text: 'Buy and sell cars, mobiles and property across Pakistan. '.repeat(30) }), false);
});

test('short protected HTTP responses are treated as blocked', () => {
  assert.equal(looksLikeProtectionPage({ status: 403, title: 'Forbidden', text: 'Request blocked' }), true);
  assert.equal(looksLikeProtectionPage({ status: 200, title: 'Spotify', text: 'Music and podcasts for everyone.' }), false);
});
