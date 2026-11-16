import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Tooltip,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HistoryIcon from '@mui/icons-material/History';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
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
  formatPlacementValueForDisplay,
  getPlacementFieldLabel,
  getPlacementFieldOrder,
  PlacementFormBundle,
} from '../../services/placements/PlacementFormService';
import {
  getActivePlacement,
  getPlacementById,
  getPlacementRestoredOnDelete,
  PlacementRetentionData,
  readLearnerPlacementRetentionData,
} from '../../services/placementRetention/PlacementRetentionDataService';
import { withKnownApiOptionValues } from '../../services/placementRetention/formSchemaUtils';
import {
  loadPlacementsFilters,
  savePlacementsFilters,
} from '../../services/placements/placementsFilterStorage';
import { LearnerProgressStatus } from '../../utils/Interfaces';
import PlacementModal, { PlacementModalMode } from './PlacementModal';
import DeletePlacementModal from './DeletePlacementModal';
import PlacementHistoryModal from '../placementRetention/PlacementHistoryModal';

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

  const [placementModal, setPlacementModal] = useState<{
    row: any;
    mode: PlacementModalMode;
    placementId?: string;
  } | null>(null);
  const [deleteModalRow, setDeleteModalRow] = useState<any | null>(null);
  const [historyModalRow, setHistoryModalRow] = useState<any | null>(null);

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

  // Each row's Placement + Retention JSON, parsed once per fetch (and once
  // the Placement Form arrives, since legacy rows need its schema to migrate).
  const placementDataByMembership = useMemo(() => {
    const map = new Map<string, PlacementRetentionData>();
    (rows || []).forEach((row) =>
      map.set(
        String(row.cohortMembershipId),
        readLearnerPlacementRetentionData(row, placementForm?.schema)
      )
    );
    return map;
  }, [rows, placementForm]);

  const getRowData = (row: any): PlacementRetentionData =>
    placementDataByMembership.get(String(row.cohortMembershipId)) ??
    readLearnerPlacementRetentionData(row, placementForm?.schema);

  // One column per Placement Form field (showing the learner's *current*
  // placement — earlier ones are in the history modal), in the form's own field order —
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
          label: getPlacementFieldLabel(placementForm.schema, key, t),
          minWidth: 250,
          render: (row: any) =>
            formatPlacementValueForDisplay(
              placementForm.schema,
              key,
              getActivePlacement(getRowData(row))?.formData?.[key],
              t
            ),
        }))
    : [];

  const columns = [
    {
      key: 'action',
      label: t('PLACEMENTS.ACTION'),
      minWidth: 160,
      render: (row: any) => {
        const data = getRowData(row);
        const active = getActivePlacement(data);
        const hasHistory = data.placements.length > 0;
        return (
          <Box display="flex" gap={0.5}>
            {!active && (
              <Tooltip
                title={t(
                  hasHistory
                    ? 'PLACEMENTS.PLACE_AGAIN'
                    : 'PLACEMENTS.PLACE_STUDENT'
                )}
              >
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() =>
                    setPlacementModal({
                      row,
                      mode: hasHistory ? 'placeAgain' : 'create',
                    })
                  }
                >
                  <AddCircleOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {active && (
              <>
                <Tooltip title={t('PLACEMENTS.UPDATE_PLACEMENT')}>
                  <IconButton
                    size="small"
                    onClick={() =>
                      setPlacementModal({
                        row,
                        mode: 'update',
                        placementId: active.placementId,
                      })
                    }
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('PLACEMENTS.PLACE_AGAIN')}>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() =>
                      setPlacementModal({ row, mode: 'placeAgain' })
                    }
                  >
                    <PersonAddAlt1Icon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {hasHistory && (
              <Tooltip title={t('PLACEMENTS.PLACEMENT_HISTORY')}>
                <IconButton
                  size="small"
                  onClick={() => setHistoryModalRow(row)}
                >
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {active && (
              <Tooltip title={t('PLACEMENTS.DELETE_PLACEMENT')}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setDeleteModalRow(row)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
    {
      key: 'status',
      label: t('PLACEMENTS.STATUS'),
      minWidth: 150,
      render: (row: any) => {
        const status = getLearnerStatus(row);
        return status ? (
          <Chip
            size="small"
            label={t(PLACEMENT_STATUS_LABEL_KEYS[status])}
            color={
              status === 'placed' || status === 'retention_complete'
                ? 'success'
                : 'default'
            }
          />
        ) : (
          '-'
        );
      },
    },
    {
      key: 'learnerName',
      label: t('PLACEMENTS.LEARNER'),
      minWidth: 150,
      render: (row: any) => getLearnerDisplayName(row),
    },
    ...placementFieldColumns,
  ];

  return (
    <Box>
      <Box
        display="flex"
        flexWrap="wrap"
        alignItems="center"
        gap={2}
        sx={{ mb: 2 }}
      >
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
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          sx={{ py: 4 }}
        >
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
      {placementModal &&
        placementForm &&
        (() => {
          const { row, mode, placementId } = placementModal;
          // Update prefills that one placement's saved answers; Place Student
          // / Place Again always start from a blank form.
          const initialFormData =
            mode === 'update'
              ? getPlacementById(getRowData(row), placementId)?.formData || {}
              : {};
          // API-driven fields (domain, placementPoperty, ...) only show a
          // prefilled value once their fetched option list contains it — see
          // withKnownApiOptionValues. Nothing to prefill for a new placement.
          const formForModal =
            mode === 'update'
              ? {
                  ...placementForm,
                  schema: withKnownApiOptionValues(
                    placementForm.schema,
                    initialFormData
                  ),
                }
              : placementForm;
          return (
            <PlacementModal
              onClose={() => setPlacementModal(null)}
              batchCohortId={batchCohortId}
              learnerRow={row}
              learnerName={getLearnerDisplayName(row)}
              mode={mode}
              placementId={placementId}
              initialFormData={initialFormData}
              form={formForModal}
              placementSchema={placementForm.schema}
              onSaved={refreshCurrentPage}
            />
          );
        })()}

      {deleteModalRow &&
        placementForm &&
        (() => {
          const data = getRowData(deleteModalRow);
          const active = getActivePlacement(data);
          const restored = active && getPlacementRestoredOnDelete(data, active.placementId);
          return active ? (
            <DeletePlacementModal
              onClose={() => setDeleteModalRow(null)}
              batchCohortId={batchCohortId}
              learnerRow={deleteModalRow}
              learnerName={getLearnerDisplayName(deleteModalRow)}
              placementId={active.placementId}
              restoredPlacementName={restored ? restored.companyName : undefined}
              placementSchema={placementForm.schema}
              onDeleted={refreshCurrentPage}
            />
          ) : null;
        })()}

      {historyModalRow && placementForm && (
        <PlacementHistoryModal
          onClose={() => setHistoryModalRow(null)}
          learnerName={getLearnerDisplayName(historyModalRow)}
          data={getRowData(historyModalRow)}
          placementForm={placementForm}
        />
      )}
    </Box>
  );
};

export default PlacementLearnerTable;
