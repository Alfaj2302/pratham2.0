// @ts-nocheck
// import React, { useState, useEffect } from 'react';
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   TablePagination,
//   Paper,
//   IconButton,
// } from '@mui/material';

// const PaginatedTable = ({
//   count,
//   data,
//   columns,
//   actions,
//   rowsPerPageOptions = [5, 10, 15],
//   defaultPage = 0,
//   defaultRowsPerPage = 5,
//   onPageChange,
//   onRowsPerPageChange,
// }) => {
//   const [page, setPage] = useState(defaultPage);
//   const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

//   console.log('data', data);

//   useEffect(() => {
//     setPage(defaultPage);
//   }, [defaultPage]);

//   useEffect(() => {
//     setRowsPerPage(defaultRowsPerPage);
//   }, [defaultRowsPerPage]);

//   const handleChangePage = (event, newPage) => {
//     setPage(newPage);
//     if (onPageChange) onPageChange(newPage);
//   };

//   const handleChangeRowsPerPage = (event) => {
//     const newRowsPerPage = parseInt(event.target.value, 10);
//     setRowsPerPage(newRowsPerPage);
//     setPage(0);
//     if (onRowsPerPageChange) onRowsPerPageChange(newRowsPerPage);
//   };

//   const paginatedData = data;

//   return (
//     <Paper>
//       <TableContainer>
//         <Table>
//           <TableHead>
//             <TableRow>
//               {columns.map((col) => (
//                 <TableCell key={col.key}>{col.label}</TableCell>
//               ))}
//               <TableCell>Actions</TableCell>
//             </TableRow>
//           </TableHead>
//           <TableBody>
//             {paginatedData.map((row, index) => (
//               <TableRow key={index}>
//                 {columns.map((col) => (
//                   <TableCell
//                     key={col.key}
//                     style={col.getStyle ? col.getStyle(row) : {}}
//                   >
//                     {col.render ? col.render(row) : row[col.key] || '-'}
//                   </TableCell>
//                 ))}
//                 <TableCell>
//                   {actions.map((action, idx) => (
//                     <IconButton key={idx} onClick={() => action.callback(row)}>
//                       {action.icon}
//                     </IconButton>
//                   ))}
//                 </TableCell>
//               </TableRow>
//             ))}
//           </TableBody>
//         </Table>
//       </TableContainer>
//       <TablePagination
//         rowsPerPageOptions={rowsPerPageOptions}
//         component="div"
//         count={count}
//         rowsPerPage={rowsPerPage}
//         page={page}
//         onPageChange={handleChangePage}
//         onRowsPerPageChange={handleChangeRowsPerPage}
//       />
//     </Paper>
//   );
// };

// export default PaginatedTable;

import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Box,
} from '@mui/material';
import useStore from '@/store/store';
import { getVisibleTableActions } from '@/utils/filterTableActionsForAcademicYear';

const PaginatedTable = ({
  count,
  data,
  columns,
  actions = [],
  rowsPerPageOptions = [5, 10, 15],
  defaultPage = 0,
  defaultRowsPerPage = 5,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const [page, setPage] = useState(defaultPage);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const isActiveYear = useStore((state) => state.isActiveYearSelected);
  const visibleActions = useMemo(
    () => getVisibleTableActions(actions, isActiveYear),
    [actions, isActiveYear]
  );

  useEffect(() => {
    setPage(defaultPage);
  }, [defaultPage]);

  useEffect(() => {
    setRowsPerPage(defaultRowsPerPage);
  }, [defaultRowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    if (onPageChange) onPageChange(newPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    if (onRowsPerPageChange) onRowsPerPageChange(newRowsPerPage);
  };

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
              {visibleActions.length > 0 && <TableCell>Actions</TableCell>}
              {columns?.map((col) => (
                <TableCell
                  key={col.key || col.keys?.join('-')}
                  sx={{ minWidth: col.minWidth }}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data &&
              data?.map((row, index) => (
                <TableRow key={index}>
                  {visibleActions.length > 0 && (
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
                          '& .MuiIconButton-root img, & .MuiIconButton-root svg':
                            {
                              width: 16,
                              height: 16,
                            },
                        }}
                      >
                        {visibleActions
                          .filter((action) =>
                            typeof action.show === 'function'
                              ? action.show(row)
                              : true
                          )
                          .map((action, idx) => (
                            <IconButton
                              size="small"
                              key={idx}
                              onClick={() => action.callback(row)}
                            >
                              {action.icon}
                            </IconButton>
                          ))}
                      </Box>
                    </TableCell>
                  )}
                  {columns?.map((col) => (
                    <TableCell
                      key={col.key || col.keys?.join('-')}
                      sx={{ minWidth: col.minWidth }}
                    >
                      {/* ✅ Keep custom render logic if provided */}
                      {col.render
                        ? col.render(row)
                        : Array.isArray(col.keys)
                        ? col.keys.map((key) => row[key] ?? '').join(' ')
                        : row[col.key] ?? ''}
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
