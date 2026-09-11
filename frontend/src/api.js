/**
 * CloudRad Frontend — Centralized API Configuration
 * Eliminates duplicated URL construction patterns across all pages.
 */

/** Returns the backend API base URL based on environment or hostname. */
export function getApiUrl() {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://127.0.0.1:8000';
  }
  return 'https://api.165-227-89-199.nip.io';
}

/** Returns the PACS/Orthanc viewer base URL. */
export function getPacsUrl() {
  return import.meta.env.VITE_PACS_URL || 'https://pacs.165-227-89-199.nip.io';
}

/** Returns the stored JWT authentication token. */
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

/** Returns Authorization headers for authenticated API calls. */
export function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Computes relative time string from an ISO date string. */
export function relativeTime(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Returns a color class for a given modality. */
export function getModalityColor(modality) {
  const m = (modality || '').toUpperCase();
  if (m === 'CT') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (m === 'MR' || m === 'MRI') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (m.startsWith('X') || m === 'CR' || m === 'DX') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (m === 'US') return 'bg-teal-100 text-teal-700 border-teal-200';
  if (m === 'NM' || m === 'PT') return 'bg-rose-100 text-rose-700 border-rose-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}
