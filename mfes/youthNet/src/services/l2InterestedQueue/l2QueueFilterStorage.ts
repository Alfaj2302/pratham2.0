// Persists the L2 Interested Queue's search-form selections (Status, SDBV,
// Name, Tagged Domain/Skill) across a browser refresh. Same sessionStorage
// convention as placementsFilterStorage — filters should survive an F5, not
// follow the user into an unrelated future session.
const STORAGE_KEY = 'l2_queue_filters';

export const loadL2QueueFilters = (): Record<string, any> | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveL2QueueFilters = (formData: Record<string, any>): void => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  } catch {
    // Ignore storage errors (e.g. private browsing with storage disabled) —
    // filters simply won't persist, nothing else should break.
  }
};

export const clearL2QueueFilters = (): void => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
};
