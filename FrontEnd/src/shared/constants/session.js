// Single source of truth for the localStorage keys the mock/live auth
// contract uses. Written by auth's authService.js, read by landing's
// session.js — both import from here so they can't drift out of sync.
export const TOKEN_KEY = 'sitesense_auth_token';
export const USER_KEY = 'sitesense_auth_user';
