import { addMonths, isBefore, startOfDay } from 'date-fns';
import { RetentionFollowUpState, RetentionMilestoneKey } from './retention.config';

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

export interface RetentionMilestoneView {
  key: RetentionMilestoneKey;
  labelKey: string;
  targetDate: Date | null;
  state: RetentionFollowUpState;
}
