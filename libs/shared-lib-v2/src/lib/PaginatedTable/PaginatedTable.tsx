import React, { ReactNode, useEffect, useState } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from '@mui/material';

export interface PaginatedTableColumn<T = any> {
  key?: string;
  // Several row keys joined with a space (e.g. first/middle/last name).
  keys?: string[];
  label: ReactNode;
  render?: (row: T) => ReactNode;
  // Applied to both the header and body cells of this column.
  minWidth?: number | string;
}

export interface PaginatedTableAction<T = any> {
  icon: ReactNode;
  callback: (row: T) => void;
  // Per-row visibility; the action shows on every row when omitted.
  show?: (row: T) => boolean;
  title?: string;
  disabled?: boolean;
}

export interface PaginatedTableProps<T = any> {
  count: number;
  // Rows of the current page only — slicing / fetching a page is the caller's
  // job, so this works for both server- and client-side pagination.
  data: T[];
  columns: PaginatedTableColumn<T>[];
  actions?: PaginatedTableAction<T>[];
  actionsLabel?: ReactNode;
  rowsPerPageOptions?: number[];
  defaultPage?: number;
  defaultRowsPerPage?: number;
  onPageChange?: (page: number, rowsPerPage: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  getRowKey?: (row: T, index: number) => React.Key;
}

// Shared port of admin-app-repo's components/PaginatedTable — same layout
// (compact cells, Actions column first, joined icon-button group, MUI
// TablePagination footer), minus its admin-only academic-year store check:
// callers decide which actions to pass / show instead.
const PaginatedTable = <T,>({
  count,
  data,
  columns,
  actions = [],
  actionsLabel = 'Actions',
  rowsPerPageOptions = [5, 10, 15],
  defaultPage = 0,
  defaultRowsPerPage = 5,
  onPageChange,
  onRowsPerPageChange,
  getRowKey,
}: PaginatedTableProps<T>) => {
  const [page, setPage] = useState(defaultPage);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  useEffect(() => {
    setPage(defaultPage);
  }, [defaultPage]);

  useEffect(() => {
    setRowsPerPage(defaultRowsPerPage);
  }, [defaultRowsPerPage]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
    onPageChange?.(newPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    onRowsPerPageChange?.(newRowsPerPage);
  };

  const columnKey = (col: PaginatedTableColumn<T>, index: number) =>
    col.key || col.keys?.join('-') || index;

  return (
    <Paper>
      <TableContainer>
        <Table
          size="small"
          sx={{
            '& .MuiTableCell-root': {
              padding: '6px 8px',
            },
          }}
        >
          <TableHead>
            <TableRow>
              {actions.length > 0 && <TableCell>{actionsLabel}</TableCell>}
              {columns.map((col, index) => (
                <TableCell key={columnKey(col, index)} sx={{ minWidth: col.minWidth }}>
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.map((row: any, rowIndex) => (
              <TableRow key={getRowKey ? getRowKey(row, rowIndex) : rowIndex}>
                {actions.length > 0 && (
                  <TableCell>
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 0,
                        alignItems: 'center',
                        '& .MuiIconButton-root': {
                          width: 28,
                          height: 28,
                          p: 0,
                          m: 0,
                          border: '1px solid #e0e0e0',
                          borderRadius: 1,
                        },
                        '& .MuiIconButton-root + .MuiIconButton-root': {
                          ml: '-1px',
                        },
                        '& .MuiIconButton-root img, & .MuiIconButton-root svg': {
                          width: 16,
                          height: 16,
                        },
                      }}
                    >
                      {actions
                        .filter((action) => (action.show ? action.show(row) : true))
                        .map((action) => (
                          <IconButton
                            size="small"
                            // Position in the unfiltered list stays stable when
                            // `show` hides other actions on this row.
                            key={action.title ?? actions.indexOf(action)}
                            title={action.title}
                            disabled={action.disabled}
                            onClick={() => action.callback(row)}
                          >
                            {action.icon}
                          </IconButton>
                        ))}
                    </Box>
                  </TableCell>
                )}
                {columns.map((col, index) => (
                  <TableCell key={columnKey(col, index)} sx={{ minWidth: col.minWidth }}>
                    {col.render
                      ? col.render(row)
                      : Array.isArray(col.keys)
                      ? col.keys.map((key) => row[key] ?? '').join(' ')
                      : col.key
                      ? row[col.key] ?? ''
                      : ''}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={count}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default PaginatedTable;
