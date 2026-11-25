import * as React from 'react';
import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Box,
  Typography,
} from '@mui/material';
import { CommonPagination } from '../Pagination/CommonPagination';

export interface CommonDataTableColumn<T = any> {
  key: string;
  label: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  minWidth?: number | string;
}

export interface CommonDataTableProps<T = any> {
  columns: CommonDataTableColumn<T>[];
  rows: T[];
  selectable?: boolean;
  getRowId?: (row: T) => string;
  selectedIds?: Set<string>;
  onToggleRow?: (id: string, checked: boolean) => void;
  onToggleAll?: (ids: string[], checked: boolean) => void;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  emptyMessage?: React.ReactNode;
}

// Generic paginated table: plain rows/columns + optional checkbox-selection
// column, using CommonPagination for the pager. No app-specific business
// logic — purely structural, unlike PtmComponents/DataTable.tsx which has
// PTM-specific status filtering baked in.
export function CommonDataTable<T = any>({
  columns,
  rows,
  selectable = false,
  getRowId,
  selectedIds,
  onToggleRow,
  onToggleAll,
  page,
  pageSize,
  totalCount,
  onPageChange,
  loading = false,
  emptyMessage = 'No records found',
}: CommonDataTableProps<T>) {
  const rowIds = useMemo(
    () => (selectable && getRowId ? rows.map((row) => getRowId(row)) : []),
    [selectable, getRowId, rows]
  );
  const allSelected =
    selectable && rowIds.length > 0 && rowIds.every((id) => selectedIds?.has(id));
  const someSelected = selectable && rowIds.some((id) => selectedIds?.has(id));
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={someSelected && !allSelected}
                    checked={allSelected}
                    onChange={(e) => onToggleAll?.(rowIds, e.target.checked)}
                  />
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell key={col.key} sx={{ minWidth: col.minWidth }}>
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)}>
                  <Box display="flex" justifyContent="center" alignItems="center" py={3}>
                    <Typography color="text.secondary">{emptyMessage}</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
            {rows.map((row, index) => {
              const rowId = getRowId ? getRowId(row) : String(index);
              return (
                <TableRow key={rowId}>
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={!!selectedIds?.has(rowId)}
                        onChange={(e) => onToggleRow?.(rowId, e.target.checked)}
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render ? col.render(row) : (row as any)[col.key] ?? ''}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Box display="flex" justifyContent="flex-end" p={1.5}>
        <CommonPagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
      </Box>
    </Paper>
  );
}

export default CommonDataTable;
