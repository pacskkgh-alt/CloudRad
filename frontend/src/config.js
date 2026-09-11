/**
 * CloudRad Frontend — Centralized Configuration
 *
 * This is the SINGLE SOURCE OF TRUTH for all environment-aware URLs,
 * token helpers, and utility functions used across all pages.
 * Always import from '../config' (not '../api').
 */

// ─── API URLs ────────────────────────────────────────────────────────────────
/** Returns the backend REST API base URL. */
export function getApiUrl() {
  if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://127.0.0.1:8000';
  return 'https://api.165-227-89-199.nip.io';
}

/** Returns the PACS/Orthanc DICOMweb base URL. */
export function getPacsUrl() {
  return import.meta.env.VITE_PACS_URL || 'https://pacs.165-227-89-199.nip.io';
}

/** Returns the WebSocket base URL (ws:// or wss://). */
export function getWsUrl() {
  const api = getApiUrl();
  return api.replace(/^http/, 'ws');
}

// ─── Auth Token ───────────────────────────────────────────────────────────────
/** Returns the stored JWT access token. */
export function getAuthToken() {
  return (
    localStorage.getItem('cloudrad_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('cloudrad_token') ||
    sessionStorage.getItem('token') ||
    ''
  );
}

/** Returns the stored JWT refresh token. */
export function getRefreshToken() {
  return (
    localStorage.getItem('cloudrad_refresh_token') ||
    sessionStorage.getItem('cloudrad_refresh_token') ||
    ''
  );
}

/** Persists tokens after login / token refresh. */
export function saveTokens(accessToken, refreshToken) {
  localStorage.setItem('cloudrad_token', accessToken);
  if (refreshToken) localStorage.setItem('cloudrad_refresh_token', refreshToken);
}

/** Clears all auth tokens (logout). */
export function clearTokens() {
  ['cloudrad_token', 'cloudrad_refresh_token', 'token', 'access_token'].forEach(k => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}

/** Returns Authorization headers for authenticated API calls. */
export function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Auto Token Refresh ───────────────────────────────────────────────────────
/**
 * Wraps a fetch/axios call, automatically refreshing the access token
 * if a 401 response is received (once), then retrying the original call.
 * @param {() => Promise} requestFn - async function that performs the API call
 * @param {import('axios').AxiosInstance} axiosInstance - optional axios instance
 */
export async function withAutoRefresh(requestFn) {
  try {
    return await requestFn();
  } catch (err) {
    if (err?.response?.status === 401) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw err;

      try {
        const { default: axios } = await import('axios');
        const refreshRes = await axios.post(`${getApiUrl()}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });
        saveTokens(refreshRes.data.access_token, null); // keep old refresh token
        return await requestFn(); // retry with new token
      } catch (refreshErr) {
        clearTokens();
        window.location.href = '/login';
        throw refreshErr;
      }
    }
    throw err;
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
/** Computes relative time string from an ISO date string. */
export function relativeTime(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);

  if (diffSec < 60) return 'الآن';
  if (diffMin < 60) return `${diffMin}د`;
  if (diffHr  < 24) return `${diffHr}س`;
  if (diffDay <  7) return `${diffDay}ي`;
  return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Returns a color class for a given modality. */
export function getModalityColor(modality) {
  const m = (modality || '').toUpperCase();
  if (m === 'CT')                          return 'bg-blue-100 text-blue-700 border-blue-200';
  if (m === 'MR' || m === 'MRI')           return 'bg-purple-100 text-purple-700 border-purple-200';
  if (m.startsWith('X') || m === 'CR' || m === 'DX') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (m === 'US')                          return 'bg-teal-100 text-teal-700 border-teal-200';
  if (m === 'NM' || m === 'PT')            return 'bg-rose-100 text-rose-700 border-rose-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}
