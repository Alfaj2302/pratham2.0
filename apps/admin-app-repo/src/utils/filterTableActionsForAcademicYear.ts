/** Keeps filter-to-table spacing when Add/Map buttons are hidden for previous year. */
export const pageActionBarSx = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: 2,
  mt: 5,
} as const;

export const pageTableSectionSx = {
  mt: 2,
} as const;

/**
 * For previous (inactive) academic years, only read-only row actions are shown.
 * Tag actions with `readOnly: true` (e.g. View Batch on centers).
 */
export function getVisibleTableActions<T extends { readOnly?: boolean }>(
  actions: T[],
  isActiveYear: boolean | string | undefined
): T[] {
  if (isActiveYear) return actions;
  return actions.filter((action) => action.readOnly);
}
