import { addMonths, format, isBefore, startOfDay } from 'date-fns';
import { RETENTION_MILESTONES, RetentionFollowUpState, RetentionMilestoneKey } from './retention.config';
import {
  isRetentionMilestoneCompleted,
  PlacementRecord,
} from '../placementRetention/PlacementRetentionDataService';

// Placement Date arrives as a plain 'YYYY-MM-DD' string (see
// PlacementFormService/CustomDateWidget). Parsed as a local date, not UTC,
// so "16 September 2026 + 1 month" lands on 16 October regardless of the
// Coordinator's timezone offset.
const parsePlacementDate = (placementDate: string): Date | null => {
  if (!placementDate) return null;
  const [year, month, day] = placementDate.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export const computeMilestoneTargetDate = (
  placementDate: string,
  months: number
): Date | null => {
  const base = parsePlacementDate(placementDate);
  if (!base) return null;
  return addMonths(base, months);
};

// Upcoming: target date hasn't arrived yet — box isn't actionable.
// Due: target date has arrived/passed and the follow-up isn't submitted yet
// — box is clickable, opens the (editable) Retention Form.
// Completed: already submitted — box is clickable, opens the same form in
// read-only mode.
export const getFollowUpState = (
  targetDate: Date | null,
  isCompleted: boolean
): RetentionFollowUpState => {
  if (isCompleted) return 'completed';
  if (!targetDate) return 'upcoming';
  const today = startOfDay(new Date());
  return isBefore(today, startOfDay(targetDate)) ? 'upcoming' : 'due';
};

// 'YYYY-MM-DD' → "20 Apr 2026" for display; '-' when missing/invalid.
export const formatPlacementDate = (placementDate: string | null | undefined): string => {
  const date = placementDate ? parsePlacementDate(placementDate) : null;
  return date ? format(date, 'dd MMM yyyy') : '-';
};

export interface RetentionMilestoneView {
  key: RetentionMilestoneKey;
  months: number;
  labelKey: string;
  targetDate: Date | null;
  state: RetentionFollowUpState;
}

// All six follow-ups for one placement — target dates from that placement's
// own Placement Date, completion from that placement's own milestones — so
// each placement's Retention history is computed independently.
export const getPlacementMilestoneViews = (
  placement: PlacementRecord | undefined
): RetentionMilestoneView[] =>
  RETENTION_MILESTONES.map((milestone) => {
    const targetDate = placement?.placementDate
      ? computeMilestoneTargetDate(placement.placementDate, milestone.months)
      : null;
    return {
      key: milestone.key,
      months: milestone.months,
      labelKey: milestone.labelKey,
      targetDate,
      state: getFollowUpState(targetDate, isRetentionMilestoneCompleted(placement, milestone.months)),
    };
  });
