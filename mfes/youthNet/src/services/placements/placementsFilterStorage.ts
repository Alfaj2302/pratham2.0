import { PlacementCenter } from './PlacementCenterService';
import { PlacementBatch } from './PlacementBatchService';

// Persists the Placements page's own filter selections (SDBV, Center,
// Batch, Status, Search) across a browser refresh. sessionStorage (not
// localStorage) — filters should survive an F5, not follow the Coordinator
// into an unrelated future session.
const STORAGE_KEY = 'placements_filters';

export interface PlacementsPersistedFilters {
  sdbv?: { state?: string; district?: string; block?: string };
  // Raw DynamicForm formData for the SDBV filter bar (state/district/block
  // arrays) — kept separately from `sdbv` above so the filter bar itself can
  // visually restore its selections, not just the derived query values.
  sdbvFormData?: Record<string, any>;
  center?: PlacementCenter | null;
  batch?: PlacementBatch | null;
  status?: string;
  search?: string;
}

export const loadPlacementsFilters = (): PlacementsPersistedFilters => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const savePlacementsFilters = (patch: Partial<PlacementsPersistedFilters>): void => {
  if (typeof window === 'undefined') return;
  try {
    const current = loadPlacementsFilters();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {
    // Ignore storage errors (e.g. private browsing with storage disabled) —
    // filters simply won't persist, nothing else should break.
  }
};
