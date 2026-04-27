import { useState, useEffect, useRef, useCallback } from 'react';

const GOOGLE_CLIENT_ID = '76300083266-c4hr0fcnfi4jo6k69v8vtdnfsmaalguj.apps.googleusercontent.com';

export function useGoogleToken(scope) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const clientRef = useRef(null);

  const initClient = useCallback(() => {
    if (!window.google?.accounts?.oauth2) return;
    clientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope,
      callback: (resp) => {
        setLoading(false);
        if (resp.error) { setError(resp.error_description || resp.error); return; }
        setToken(resp.access_token);
        setError('');
        // auto-clear after expiry (default 1h)
        setTimeout(() => setToken(null), (resp.expires_in || 3600) * 1000 - 60000);
      },
    });
  }, [scope]);

  useEffect(() => {
    if (window.google?.accounts?.oauth2) { initClient(); return; }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) { existing.addEventListener('load', initClient); return; }
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
    if (token) window.google?.accounts?.oauth2?.revoke(token);
    setToken(null);
  }, [token]);

  return { token, loading, error, requestToken, revoke };
}
