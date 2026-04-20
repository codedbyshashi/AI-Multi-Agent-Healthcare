const STORAGE_KEY = 'medisync-analysis-history';
const MAX_HISTORY_ITEMS = 20;

export function getAnalysisHistory() {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAnalysisHistory(entry) {
  if (typeof window === 'undefined' || !entry) return [];

  const existing = getAnalysisHistory();
  const next = [entry, ...existing].slice(0, MAX_HISTORY_ITEMS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearAnalysisHistory() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
