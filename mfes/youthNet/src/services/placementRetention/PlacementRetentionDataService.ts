import { RETENTION_MILESTONES } from '../retention/retention.config';
import {
  LEGACY_RETENTION_MILESTONE_FIELD_IDS,
  PLACEMENT_DATE_FIELD_KEY,
  PLACEMENT_PROPERTY_FIELD_KEY,
  PLACEMENT_RETENTION_DATA_VERSION,
  PLACEMENT_RETENTION_FIELD_ID,
  PlacementRecordStatus,
} from './placementRetention.config';

// Single owner of the Placement + Retention JSON structure stored in
// PLACEMENT_RETENTION_FIELD_ID. Every function here is pure: it takes the
// current data and returns a new copy with one change applied, never
// mutating its input and never dropping anything it wasn't asked to change.
// Both the Placements and Retention flows go through these helpers (via
// PlacementRetentionRepository.savePlacementRetentionData for writes), so
// there is exactly one implementation of "add/update a placement" and
// "add/update a milestone".
//
// Form answers are kept verbatim under each record's own `formData`, rather
// than spread onto the record itself, so a form field can never collide with
// (and silently overwrite) one of this structure's own keys like `status`,
// `month` or `placementId`. The few top-level convenience fields
// (companyName, placementDate) are derived copies, re-derived on every
// update.

export interface RetentionMilestoneRecord {
  month: number;
  createdAt: string | null;
  createdBy: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  formData: Record<string, any>;
}

export interface PlacementRecord {
  placementId: string;
  companyName: string | null;
  placementDate: string | null;
  status: PlacementRecordStatus;
  exitDate: string | null;
  createdAt: string | null;
  createdBy: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  formData: Record<string, any>;
  milestones: RetentionMilestoneRecord[];
}

export interface PlacementRetentionData {
  version: number;
  activePlacementId: string | null;
  placements: PlacementRecord[];
  // Set once, when this JSON was first built from the pre-JSON per-field
  // storage (see buildDataFromLegacyFields) — kept as an audit trail.
  migratedFromLegacyAt?: string;
}

export interface Actor {
  userId: string | null;
  at: string; // ISO timestamp
}

export const SUPPORTED_RETENTION_MONTHS: number[] = RETENTION_MILESTONES.map((m) => m.months);

export const getCurrentActor = (): Actor => ({
  userId: typeof window !== 'undefined' ? localStorage.getItem('userId') : null,
  at: new Date().toISOString(),
});

const todayIsoDate = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const createEmptyPlacementRetentionData = (): PlacementRetentionData => ({
  version: PLACEMENT_RETENTION_DATA_VERSION,
  activePlacementId: null,
  placements: [],
});

// --- Parsing -------------------------------------------------------------

// A customField's selectedValues[0] comes back as the backend's own
// JSON.stringify() of whatever was sent (see LearnerListService's
// updateCohortMemberStatus) — and a value sent pre-stringified would come
// back double-encoded. Unwrap up to a couple of string layers to the
// underlying object; anything else is "no value".
const unwrapJsonValue = (raw: any): any => {
  let value = raw;
  for (let i = 0; i < 3 && typeof value === 'string'; i++) {
    if (value === '') return undefined;
    try {
      value = JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  return value;
};

const isPlainObject = (value: any): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeMilestone = (raw: any): RetentionMilestoneRecord | null => {
  if (!isPlainObject(raw)) return null;
  const month = Number(raw.month);
  if (!SUPPORTED_RETENTION_MONTHS.includes(month)) return null;
  return {
    ...raw,
    month,
    createdAt: raw.createdAt ?? null,
    createdBy: raw.createdBy ?? null,
    formData: isPlainObject(raw.formData) ? raw.formData : {},
  };
};

const normalizePlacement = (raw: any): PlacementRecord | null => {
  if (!isPlainObject(raw) || typeof raw.placementId !== 'string' || !raw.placementId) return null;
  // Collapse any accidental duplicate month entries, keeping the last one.
  const byMonth = new Map<number, RetentionMilestoneRecord>();
  (Array.isArray(raw.milestones) ? raw.milestones : [])
    .map(normalizeMilestone)
    .forEach((m: RetentionMilestoneRecord | null) => {
      if (m) byMonth.set(m.month, m);
    });
  return {
    ...raw,
    placementId: raw.placementId,
    companyName: raw.companyName ?? null,
    placementDate: raw.placementDate ?? null,
    status: raw.status === 'active' ? 'active' : 'resigned',
    exitDate: raw.exitDate ?? null,
    createdAt: raw.createdAt ?? null,
    createdBy: raw.createdBy ?? null,
    formData: isPlainObject(raw.formData) ? raw.formData : {},
    milestones: Array.from(byMonth.values()).sort((a, b) => a.month - b.month),
  };
};

// Parses the unified field's raw value. Returns null when the value isn't
// the JSON structure at all (empty, invalid, or a legacy flat 1-month
// Retention answers object that happens to live in this same field) — the
// caller decides whether to fall back to legacy migration.
export const parsePlacementRetentionData = (raw: any): PlacementRetentionData | null => {
  const value = unwrapJsonValue(raw);
  if (!isPlainObject(value) || !Array.isArray(value.placements)) return null;

  const placements = value.placements.map(normalizePlacement).filter(Boolean) as PlacementRecord[];
  const data: PlacementRetentionData = {
    ...value,
    version: Number(value.version) || PLACEMENT_RETENTION_DATA_VERSION,
    activePlacementId: value.activePlacementId ?? null,
    placements,
  };
  return reconcileActivePlacement(data);
};

// Keeps activePlacementId and each record's `status` consistent with each
// other: activePlacementId wins when it points at a real placement;
// otherwise the newest record still marked active is used.
const reconcileActivePlacement = (data: PlacementRetentionData): PlacementRetentionData => {
  const pointed = data.placements.find((p) => p.placementId === data.activePlacementId);
  const activeId =
    pointed?.placementId ??
    [...data.placements].reverse().find((p) => p.status === 'active')?.placementId ??
    null;
  return {
    ...data,
    activePlacementId: activeId,
    placements: data.placements.map((p) =>
      p.placementId === activeId
        ? { ...p, status: 'active' }
        : p.status === 'active'
          ? { ...p, status: 'resigned' }
          : p
    ),
  };
};

// --- Legacy migration ------------------------------------------------------

const findCustomFieldRaw = (learnerRow: any, fieldId: string): any =>
  learnerRow?.customField?.find((field: any) => field.fieldId === fieldId)?.selectedValues?.[0];

// Old Placement storage: each Placement Form field in its own customField,
// keyed by that schema property's fieldId, value JSON-encoded once.
const readLegacyPlacementFormData = (placementSchema: any, learnerRow: any): Record<string, any> => {
  const formData: Record<string, any> = {};
  Object.entries(placementSchema?.properties || {}).forEach(([key, property]: [string, any]) => {
    if (!property?.fieldId) return;
    const raw = findCustomFieldRaw(learnerRow, property.fieldId);
    if (raw === undefined || raw === null || raw === '') return;
    let value: any = raw;
    if (typeof raw === 'string') {
      try {
        value = JSON.parse(raw);
      } catch {
        value = raw;
      }
    }
    formData[key] = value;
  });
  return formData;
};

// Builds the JSON structure from the pre-JSON storage, so nothing a
// Coordinator already recorded is lost on the first write to the unified
// field. Not persisted by itself — the next successful Placement/Retention
// save writes it (with its own change applied on top). The legacy fields
// themselves are never deleted, so the original values also stay on the
// backend.
//
// The learner's own cohort-membership status decides whether that single
// legacy placement is still active; a learner who has since been un-placed
// keeps it as a resigned record rather than having it dropped.
export const buildDataFromLegacyFields = (
  learnerRow: any,
  placementSchema: any
): PlacementRetentionData => {
  const data = createEmptyPlacementRetentionData();
  const placementFormData = placementSchema ? readLegacyPlacementFormData(placementSchema, learnerRow) : {};

  const milestones: RetentionMilestoneRecord[] = [];
  Object.entries(LEGACY_RETENTION_MILESTONE_FIELD_IDS).forEach(([month, fieldId]) => {
    const value = unwrapJsonValue(findCustomFieldRaw(learnerRow, fieldId));
    // Skip anything that's already the new structure (only possible for the
    // shared 1-month field, and only if parsing it failed upstream).
    if (!isPlainObject(value) || Array.isArray(value.placements)) return;
    milestones.push({ month: Number(month), createdAt: null, createdBy: null, formData: value });
  });

  if (Object.keys(placementFormData).length === 0 && milestones.length === 0) return data;

  const isActive = ['placed', 'retention_complete'].includes(learnerRow?.status);
  const placementId = generatePlacementId(placementFormData, []);
  return {
    ...data,
    migratedFromLegacyAt: new Date().toISOString(),
    activePlacementId: isActive ? placementId : null,
    placements: [
      {
        ...derivePlacementSummary(placementFormData),
        placementId,
        status: isActive ? 'active' : 'resigned',
        exitDate: null,
        createdAt: null,
        createdBy: null,
        formData: placementFormData,
        milestones: milestones.sort((a, b) => a.month - b.month),
      },
    ],
  };
};

// The one entry point for reading a learner's Placement + Retention data off
// a cohortmember/list row: the unified JSON if present, otherwise the legacy
// fields migrated in memory. Always returns a valid structure.
export const readLearnerPlacementRetentionData = (
  learnerRow: any,
  placementSchema: any
): PlacementRetentionData =>
  parsePlacementRetentionData(findCustomFieldRaw(learnerRow, PLACEMENT_RETENTION_FIELD_ID)) ??
  buildDataFromLegacyFields(learnerRow, placementSchema);

// --- Placement lookups -------------------------------------------------------

export const getPlacementById = (
  data: PlacementRetentionData,
  placementId: string | null | undefined
): PlacementRecord | undefined =>
  placementId ? data.placements.find((p) => p.placementId === placementId) : undefined;

export const getActivePlacement = (data: PlacementRetentionData): PlacementRecord | undefined =>
  getPlacementById(data, data.activePlacementId);

// Newest first — the order the history accordion shows them in.
export const getPlacementsNewestFirst = (data: PlacementRetentionData): PlacementRecord[] =>
  [...data.placements].reverse();

// --- Placement ID ----------------------------------------------------------

const normalizeIdPart = (value: any): string =>
  String(Array.isArray(value) ? value[0] ?? '' : value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// placementId = "plc_" + Placement Property + Date of Placement, normalized
// (e.g. "ABC Technologies" + "2026-10-08" → "plc_abc-technologies_2026-10-08").
// Generated once at creation and never recomputed, so editing the property or
// date later doesn't change it. A numeric suffix keeps it unique if the same
// property + date is ever placed twice.
export const generatePlacementId = (formData: Record<string, any>, existingIds: string[]): string => {
  const property = normalizeIdPart(formData?.[PLACEMENT_PROPERTY_FIELD_KEY]) || 'placement';
  const date = normalizeIdPart(formData?.[PLACEMENT_DATE_FIELD_KEY]) || normalizeIdPart(todayIsoDate());
  const base = `plc_${property}_${date}`;
  let id = base;
  for (let n = 2; existingIds.includes(id); n++) id = `${base}_${n}`;
  return id;
};

const derivePlacementSummary = (formData: Record<string, any>) => {
  const property = formData?.[PLACEMENT_PROPERTY_FIELD_KEY];
  const date = formData?.[PLACEMENT_DATE_FIELD_KEY];
  return {
    companyName: (Array.isArray(property) ? property[0] : property) ?? null,
    placementDate: (Array.isArray(date) ? date[0] : date) ?? null,
  };
};

// --- Placement mutations ----------------------------------------------------

const mapPlacement = (
  data: PlacementRetentionData,
  placementId: string,
  update: (placement: PlacementRecord) => PlacementRecord
): PlacementRetentionData => {
  if (!getPlacementById(data, placementId)) {
    throw new Error(`Placement ${placementId} not found`);
  }
  return {
    ...data,
    placements: data.placements.map((p) => (p.placementId === placementId ? update(p) : p)),
  };
};

export const resignPlacement = (
  data: PlacementRetentionData,
  placementId: string,
  actor: Actor,
  exitDate: string = todayIsoDate()
): PlacementRetentionData => {
  const next = mapPlacement(data, placementId, (p) => ({
    ...p,
    status: 'resigned',
    exitDate: p.exitDate ?? exitDate,
    updatedAt: actor.at,
    updatedBy: actor.userId,
  }));
  return next.activePlacementId === placementId ? { ...next, activePlacementId: null } : next;
};

export const setActivePlacement = (
  data: PlacementRetentionData,
  placementId: string
): PlacementRetentionData =>
  reconcileActivePlacement({ ...mapPlacement(data, placementId, (p) => p), activePlacementId: placementId });

// New placement (Place Student / Place Again): any currently active
// placement is resigned first, then the new one is appended as active with
// empty Retention milestones. Every earlier placement is carried over as-is.
export const createPlacement = (
  data: PlacementRetentionData,
  formData: Record<string, any>,
  actor: Actor
): { data: PlacementRetentionData; placementId: string } => {
  let next = data;
  const active = getActivePlacement(next);
  if (active) next = resignPlacement(next, active.placementId, actor);

  const placementId = generatePlacementId(
    formData,
    next.placements.map((p) => p.placementId)
  );
  next = {
    ...next,
    placements: [
      ...next.placements,
      {
        ...derivePlacementSummary(formData),
        placementId,
        status: 'active',
        exitDate: null,
        createdAt: actor.at,
        createdBy: actor.userId,
        formData: deepClone(formData),
        milestones: [],
      },
    ],
  };
  return { data: setActivePlacement(next, placementId), placementId };
};

// Update Placement: replaces only that placement's form answers (and the
// fields derived from them). placementId, status, exitDate and milestones
// are left untouched.
export const updatePlacement = (
  data: PlacementRetentionData,
  placementId: string,
  formData: Record<string, any>,
  actor: Actor
): PlacementRetentionData =>
  mapPlacement(data, placementId, (p) => ({
    ...p,
    ...derivePlacementSummary(formData),
    formData: deepClone(formData),
    updatedAt: actor.at,
    updatedBy: actor.userId,
  }));

// Delete Placement: removes only that one placement record (and its own
// milestones). If it was the active placement and others remain, the latest
// remaining one (most recently created — the same order the history uses)
// is made active again and its exit date cleared, so the learner is never
// left with placements but no active one.
export const removePlacement = (
  data: PlacementRetentionData,
  placementId: string,
  actor: Actor
): PlacementRetentionData => {
  if (!getPlacementById(data, placementId)) throw new Error(`Placement ${placementId} not found`);
  const wasActive = data.activePlacementId === placementId;
  const next: PlacementRetentionData = {
    ...data,
    activePlacementId: wasActive ? null : data.activePlacementId,
    placements: data.placements.filter((p) => p.placementId !== placementId),
  };
  const latest = next.placements[next.placements.length - 1];
  if (!wasActive || !latest) return next;

  return setActivePlacement(
    mapPlacement(next, latest.placementId, (p) => ({
      ...p,
      status: 'active',
      exitDate: null,
      updatedAt: actor.at,
      updatedBy: actor.userId,
    })),
    latest.placementId
  );
};

// The placement Delete Placement would re-activate, if any — lets the
// confirmation dialog say so before anything is deleted.
export const getPlacementRestoredOnDelete = (
  data: PlacementRetentionData,
  placementId: string
): PlacementRecord | undefined => {
  if (data.activePlacementId !== placementId) return undefined;
  const remaining = data.placements.filter((p) => p.placementId !== placementId);
  return remaining[remaining.length - 1];
};

// --- Retention milestones ---------------------------------------------------

export const getRetentionMilestone = (
  placement: PlacementRecord | undefined,
  month: number
): RetentionMilestoneRecord | undefined => placement?.milestones.find((m) => m.month === month);

export const isRetentionMilestoneCompleted = (
  placement: PlacementRecord | undefined,
  month: number
): boolean => !!getRetentionMilestone(placement, month);

export const isPlacementRetentionComplete = (placement: PlacementRecord | undefined): boolean =>
  !!placement && SUPPORTED_RETENTION_MONTHS.every((month) => isRetentionMilestoneCompleted(placement, month));

// Adds the milestone for `month` to that placement, or — if one already
// exists — updates it in place (keeping its original createdAt/createdBy),
// so a month is never duplicated. Every other milestone and placement is
// left untouched.
export const upsertRetentionMilestone = (
  data: PlacementRetentionData,
  placementId: string,
  month: number,
  formData: Record<string, any>,
  actor: Actor
): PlacementRetentionData => {
  if (!SUPPORTED_RETENTION_MONTHS.includes(month)) {
    throw new Error(`Unsupported retention month ${month}`);
  }
  return mapPlacement(data, placementId, (p) => {
    const existing = getRetentionMilestone(p, month);
    const milestone: RetentionMilestoneRecord = existing
      ? { ...existing, formData: deepClone(formData), updatedAt: actor.at, updatedBy: actor.userId }
      : { month, createdAt: actor.at, createdBy: actor.userId, formData: deepClone(formData) };
    return {
      ...p,
      milestones: [...p.milestones.filter((m) => m.month !== month), milestone].sort(
        (a, b) => a.month - b.month
      ),
    };
  });
};

// --- Validation / serialization -------------------------------------------

export const validatePlacementRetentionData = (data: PlacementRetentionData): string[] => {
  const errors: string[] = [];
  const ids = data.placements.map((p) => p.placementId);
  if (new Set(ids).size !== ids.length) errors.push('Duplicate placementId');

  const active = data.placements.filter((p) => p.status === 'active');
  if (active.length > 1) errors.push('More than one active placement');
  if (data.activePlacementId && active[0]?.placementId !== data.activePlacementId) {
    errors.push('activePlacementId does not match the active placement');
  }
  if (!data.activePlacementId && active.length > 0) errors.push('Active placement without activePlacementId');

  data.placements.forEach((p) => {
    const months = p.milestones.map((m) => m.month);
    if (new Set(months).size !== months.length) errors.push(`Duplicate milestone month in ${p.placementId}`);
    if (months.some((m) => !SUPPORTED_RETENTION_MONTHS.includes(m))) {
      errors.push(`Unsupported milestone month in ${p.placementId}`);
    }
  });
  return errors;
};

// Final step before every write: validates, then returns a plain deep copy
// of the *complete* structure — every placement and milestone, not just
// the one that changed. Sent as a plain object (not pre-stringified): the
// backend does its own JSON.stringify() when persisting, see
// LearnerListService.updateCohortMemberStatus.
export const serializePlacementRetentionData = (data: PlacementRetentionData): PlacementRetentionData => {
  const errors = validatePlacementRetentionData(data);
  if (errors.length) throw new Error(`Invalid placement/retention data: ${errors.join('; ')}`);
  return deepClone({ ...data, version: PLACEMENT_RETENTION_DATA_VERSION });
};
