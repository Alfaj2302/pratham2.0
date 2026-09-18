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
} from '../../services/placements/placements.config';
import {
  extractPlacementFormData,
  formatPlacementValueForDisplay,
  getPlacementFieldOrder,
  PlacementFormBundle,
} from '../../services/placements/PlacementFormService';
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

  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LearnerProgressStatus | ''>('');
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
  const placementFieldColumns = placementForm
    ? getPlacementFieldOrder(placementForm).map((key) => ({
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
            onSearch={(value) => setSearchTerm(value)}
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
          onChange={(e) => setStatusFilter(e.target.value as LearnerProgressStatus | '')}
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

      <PlacementModal
        open={placementModalRow !== null}
        onClose={() => setPlacementModalRow(null)}
        membershipId={placementModalRow?.cohortMembershipId ?? null}
        learnerName={placementModalRow ? getLearnerDisplayName(placementModalRow) : undefined}
        isUpdate={!!placementModalRow && getLearnerStatus(placementModalRow) === 'placed'}
        // Only prefill for Update Placement (an already-placed learner) —
        // a learner who was un-placed still carries their old Placement
        // customFields on the backend (Delete Placement reverts status
        // without clearing them), so a fresh Place Student must start blank
        // rather than resurface that stale data.
        initialFormData={
          placementModalRow &&
          placementForm?.schema &&
          getLearnerStatus(placementModalRow) === 'placed'
            ? extractPlacementFormData(placementForm.schema, placementModalRow)
            : {}
        }
        form={placementForm}
        onSaved={refreshCurrentPage}
      />

      <DeletePlacementModal
        open={deleteModalRow !== null}
        onClose={() => setDeleteModalRow(null)}
        membershipId={deleteModalRow?.cohortMembershipId ?? null}
        learnerName={deleteModalRow ? getLearnerDisplayName(deleteModalRow) : undefined}
        onDeleted={refreshCurrentPage}
      />
    </Box>
  );
};

export default PlacementLearnerTable;
