import React, { useEffect, useState } from 'react';
import { Box, Chip, IconButton, TextField, MenuItem, Tooltip } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useTranslation } from 'next-i18next';
import CommonDataTable from '@shared-lib-v2/lib/Table/CommonDataTable';
import Loader from '@shared-lib-v2/DynamicForm/components/Loader';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import LearnerSearchBar from '../myTeachingCenter/LearnerSearchBar';
import {
  getBatchLearners,
  getLearnerStatus,
  getLearnerDisplayName,
} from '../../services/myTeachingCenter/LearnerListService';
import {
  PLACEMENT_LEARNER_STATUSES,
  PLACEMENT_STATUS_LABEL_KEYS,
  PLACEMENT_TABLE_EXCLUDED_FIELDS,
} from '../../services/placements/placements.config';
import {
  buildUpdatePlacementSchema,
  extractPlacementFormData,
  formatPlacementValueForDisplay,
  getPlacementFieldOrder,
  PlacementFormBundle,
} from '../../services/placements/PlacementFormService';
import {
  loadPlacementsFilters,
  savePlacementsFilters,
} from '../../services/placements/placementsFilterStorage';
import { LearnerProgressStatus } from '../../utils/Interfaces';
import PlacementModal from './PlacementModal';
import DeletePlacementModal from './DeletePlacementModal';

const PAGE_SIZE = 10;

interface PlacementLearnerTableProps {
  batchCohortId: string;
  placementForm: PlacementFormBundle | null;
}

const PlacementLearnerTable: React.FC<PlacementLearnerTableProps> = ({
  batchCohortId,
  placementForm,
}) => {
  const { t } = useTranslation();

  // Restored once per mount so a page refresh doesn't drop the Status/
  // Search selections either — see placementsFilterStorage.
  const [persistedFilters] = useState(() => loadPlacementsFilters());

  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState(persistedFilters.search || '');
  const [statusFilter, setStatusFilter] = useState<LearnerProgressStatus | ''>(
    (persistedFilters.status as LearnerProgressStatus | '') || ''
  );
  const [rows, setRows] = useState<any[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const [placementModalRow, setPlacementModalRow] = useState<any | null>(null);
  const [deleteModalRow, setDeleteModalRow] = useState<any | null>(null);

  const fetchLearners = async (page: number) => {
    try {
      const { userDetails, totalCount: total } = await getBatchLearners({
        batchCohortId,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        name: searchTerm.trim() || undefined,
        status: statusFilter || undefined,
        defaultStatuses: PLACEMENT_LEARNER_STATUSES,
      });
      setRows(userDetails);
      setTotalCount(total);
    } catch (error) {
      console.error('Error fetching placement learners:', error);
      showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
      setRows([]);
      setTotalCount(0);
    }
  };

  useEffect(() => {
    setCurrentPage(0);
    fetchLearners(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchCohortId, statusFilter, searchTerm]);

  const refreshCurrentPage = () => fetchLearners(currentPage);

  // One column per Placement Form field, in the form's own field order —
  // driven entirely by whatever the backend form config actually returns,
  // never a hardcoded field list, so the table can't drift from the form.
  // state/district stay in the form itself (real job-location fields, and
  // district is the schema's only dependent-API field) but are excluded
  // here — they're not meant to be shown as table columns.
  const placementFieldColumns = placementForm
    ? getPlacementFieldOrder(placementForm)
        .filter((key) => !PLACEMENT_TABLE_EXCLUDED_FIELDS.includes(key))
        .map((key) => ({
          key: `placement_${key}`,
          label: t(placementForm.schema?.properties?.[key]?.title || key),
          render: (row: any) =>
            formatPlacementValueForDisplay(placementForm.schema, key, row, t),
        }))
    : [];

  const columns = [
    {
      key: 'learnerName',
      label: t('PLACEMENTS.LEARNER'),
      render: (row: any) => getLearnerDisplayName(row),
    },
    ...placementFieldColumns,
    {
      key: 'status',
      label: t('PLACEMENTS.STATUS'),
      render: (row: any) => {
        const status = getLearnerStatus(row);
        return status ? (
          <Chip
            size="small"
            label={t(PLACEMENT_STATUS_LABEL_KEYS[status])}
            color={status === 'placed' ? 'success' : 'default'}
          />
        ) : (
          '-'
        );
      },
    },
    {
      key: 'action',
      label: t('PLACEMENTS.ACTION'),
      render: (row: any) => {
        const isPlaced = getLearnerStatus(row) === 'placed';
        if (!isPlaced) {
          return (
            <Tooltip title={t('PLACEMENTS.PLACE_STUDENT')}>
              <IconButton size="small" color="primary" onClick={() => setPlacementModalRow(row)}>
                <AddCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        }
        return (
          <Box display="flex" gap={0.5}>
            <Tooltip title={t('PLACEMENTS.UPDATE_PLACEMENT')}>
              <IconButton size="small" onClick={() => setPlacementModalRow(row)}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('PLACEMENTS.DELETE_PLACEMENT')}>
              <IconButton size="small" color="error" onClick={() => setDeleteModalRow(row)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  return (
    <Box>
      <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} sx={{ mb: 2 }}>
        <Box sx={{ flex: 1, minWidth: 260 }}>
          <LearnerSearchBar
            onSearch={(value) => {
              setSearchTerm(value);
              savePlacementsFilters({ search: value });
            }}
            value={searchTerm}
            placeholder={t('PLACEMENTS.SEARCH_LEARNER')}
            fullWidth
          />
        </Box>
        <TextField
          select
          size="small"
          label={t('PLACEMENTS.STATUS')}
          value={statusFilter}
          onChange={(e) => {
            const value = e.target.value as LearnerProgressStatus | '';
            setStatusFilter(value);
            savePlacementsFilters({ status: value });
          }}
          sx={{ width: 180, mt: 2 }}
        >
          <MenuItem value="">{t('PLACEMENTS.ALL_STATUSES')}</MenuItem>
          {PLACEMENT_LEARNER_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {t(PLACEMENT_STATUS_LABEL_KEYS[status])}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {rows != null ? (
        <CommonDataTable
          columns={columns}
          rows={rows}
          page={currentPage + 1}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          onPageChange={(page: number) => {
            setCurrentPage(page - 1);
            fetchLearners(page - 1);
          }}
          emptyMessage={t('PLACEMENTS.NO_LEARNERS_FOUND')}
        />
      ) : (
        <Box display="flex" flexDirection="column" alignItems="center" sx={{ py: 4 }}>
          <Loader showBackdrop={false} loadingText={t('COMMON.LOADING')} />
        </Box>
      )}

      {/* Mounted only while a row is actually selected — not always-mounted
          with an `open` prop toggling visibility. DynamicForm has no
          unmount cleanup for its own async prefill chain, so a
          persistently-mounted modal let a superseded instance's delayed
          async resolution call back into live state and clobber the
          correct prefilled data (a race that depended on network timing —
          fine right after placing someone on a warm connection, broken
          after a full reload's cold one). Fully unmounting between opens
          means a stale instance's callback lands on a component that no
          longer exists, so React just drops it. */}
      {placementModalRow && placementForm && (() => {
        const isPlacementUpdate = getLearnerStatus(placementModalRow) === 'placed';
        // API-driven fields (domain, placementPoperty, ...) only show a
        // prefilled value once their fetched option list actually contains
        // it — a timing race against DynamicForm's own async option-fetch
        // that's proven unreliable. buildUpdatePlacementSchema sidesteps it
        // by injecting the learner's already-known values as guaranteed
        // options into a schema clone, so they resolve immediately
        // regardless of API timing. Only needed for Update (there's nothing
        // to prefill on a fresh Place Student).
        const formForModal = isPlacementUpdate
          ? { ...placementForm, schema: buildUpdatePlacementSchema(placementForm.schema, placementModalRow) }
          : placementForm;
        return (
          <PlacementModal
            onClose={() => setPlacementModalRow(null)}
            membershipId={placementModalRow.cohortMembershipId}
            learnerName={getLearnerDisplayName(placementModalRow)}
            isUpdate={isPlacementUpdate}
            // Only prefill for Update Placement (an already-placed learner)
            // — a learner who was un-placed still carries their old
            // Placement customFields on the backend (Delete Placement
            // reverts status without clearing them), so a fresh Place
            // Student must start blank rather than resurface stale data.
            initialFormData={
              isPlacementUpdate
                ? extractPlacementFormData(placementForm.schema, placementModalRow)
                : {}
            }
            form={formForModal}
            onSaved={refreshCurrentPage}
          />
        );
      })()}

      {deleteModalRow && placementForm && (
        <DeletePlacementModal
          onClose={() => setDeleteModalRow(null)}
          membershipId={deleteModalRow.cohortMembershipId}
          learnerName={getLearnerDisplayName(deleteModalRow)}
          schema={placementForm.schema}
          onDeleted={refreshCurrentPage}
        />
      )}
    </Box>
  );
};

export default PlacementLearnerTable;
