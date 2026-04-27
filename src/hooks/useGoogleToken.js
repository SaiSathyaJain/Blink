import { useState, useEffect, useRef, useCallback } from 'react';

const GOOGLE_CLIENT_ID = '76300083266-c4hr0fcnfi4jo6k69v8vtdnfsmaalguj.apps.googleusercontent.com';

function storageKey(scope) {
  return `blink_gtoken_${btoa(scope).slice(0, 16)}`;
}

function loadStored(scope) {
  try {
    const raw = sessionStorage.getItem(storageKey(scope));
    if (!raw) return null;
    const { token, expiresAt } = JSON.parse(raw);
    if (Date.now() >= expiresAt) { sessionStorage.removeItem(storageKey(scope)); return null; }
    return { token, expiresAt };
  } catch { return null; }
}

function saveStored(scope, token, expiresIn) {
  try {
    const expiresAt = Date.now() + (expiresIn - 60) * 1000;
    sessionStorage.setItem(storageKey(scope), JSON.stringify({ token, expiresAt }));
    return expiresAt;
  } catch { return 0; }
}

export function useGoogleToken(scope) {
  const stored = loadStored(scope);
  const [token, setToken] = useState(stored?.token || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const clientRef = useRef(null);
  const expiryTimer = useRef(null);

  const scheduleExpiry = useCallback((expiresAt) => {
    clearTimeout(expiryTimer.current);
    const ms = expiresAt - Date.now();
    if (ms > 0) {
      expiryTimer.current = setTimeout(() => {
        sessionStorage.removeItem(storageKey(scope));
        setToken(null);
      }, ms);
    }
  }, [scope]);

  useEffect(() => {
    if (stored) scheduleExpiry(stored.expiresAt);
    return () => clearTimeout(expiryTimer.current);
  }, []);

  const initClient = useCallback(() => {
    if (!window.google?.accounts?.oauth2) return;
    clientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope,
      callback: (resp) => {
        setLoading(false);
        if (resp.error) { setError(resp.error_description || resp.error); return; }
        const expiresAt = saveStored(scope, resp.access_token, resp.expires_in || 3600);
        scheduleExpiry(expiresAt);
        setToken(resp.access_token);
        setError('');
      },
    });
  }, [scope, scheduleExpiry]);

  useEffect(() => {
    if (window.google?.accounts?.oauth2) { initClient(); return; }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) { existing.addEventListener('load', initClient); return () => existing.removeEventListener('load', initClient); }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = initClient;
    document.body.appendChild(script);
  }, [initClient]);

  const requestToken = useCallback(() => {
    if (!clientRef.current) return;
    setLoading(true);
    setError('');
    clientRef.current.requestAccessToken();
  }, []);

  const revoke = useCallback(() => {
    if (token) window.google?.accounts?.oauth2?.revoke(token, () => {});
    sessionStorage.removeItem(storageKey(scope));
    clearTimeout(expiryTimer.current);
    setToken(null);
  }, [token, scope]);

  return { token, loading, error, requestToken, revoke };
}
