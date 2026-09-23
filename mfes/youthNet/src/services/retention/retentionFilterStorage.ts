import { PlacementCenter } from '../placements/PlacementCenterService';
import { PlacementBatch } from '../placements/PlacementBatchService';

// Persists the Retention page's own filter selections (SDBV, Center, Batch,
// Status, Search) across a browser refresh. Same sessionStorage convention
// as placementsFilterStorage.ts (survive an F5, not follow the Coordinator
// into an unrelated future session) — kept as a separate key/module so the
// two pages' filters never collide or leak into each other.
const STORAGE_KEY = 'retention_filters';

export interface RetentionPersistedFilters {
  sdbv?: { state?: string; district?: string; block?: string };
  sdbvFormData?: Record<string, any>;
  center?: PlacementCenter | null;
  batch?: PlacementBatch | null;
  status?: string;
  search?: string;
}

export const loadRetentionFilters = (): RetentionPersistedFilters => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveRetentionFilters = (patch: Partial<RetentionPersistedFilters>): void => {
  if (typeof window === 'undefined') return;
  try {
    const current = loadRetentionFilters();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {
    // Ignore storage errors — filters simply won't persist.
  }
};
