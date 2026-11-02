import React, { useEffect, useMemo, useState } from 'react';
import { Box, Chip, IconButton, TextField, MenuItem, Tooltip } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { useTranslation } from 'next-i18next';
import { format } from 'date-fns';
import CommonDataTable from '@shared-lib-v2/lib/Table/CommonDataTable';
import Loader from '@shared-lib-v2/DynamicForm/components/Loader';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import LearnerSearchBar from '../myTeachingCenter/LearnerSearchBar';
import {
  getBatchLearners,
  getLearnerDisplayName,
} from '../../services/myTeachingCenter/LearnerListService';
import { PlacementFormBundle } from '../../services/placements/PlacementFormService';
import {
  getFreshRetentionFormData,
  RetentionFormBundle,
} from '../../services/retention/RetentionFormService';
import {
  computeMilestoneTargetDate,
  formatPlacementDate,
  getPlacementMilestoneViews,
} from '../../services/retention/RetentionMilestones';
import {
  getActivePlacement,
  getPlacementById,
  getRetentionMilestone,
  PlacementRecord,
  PlacementRetentionData,
  readLearnerPlacementRetentionData,
} from '../../services/placementRetention/PlacementRetentionDataService';
import { withKnownApiOptionValues } from '../../services/placementRetention/formSchemaUtils';
import {
  RETENTION_LEARNER_STATUSES,
  RETENTION_MILESTONES,
  RETENTION_STATUS_LABEL_KEYS,
  RetentionLearnerStatus,
  RetentionMilestoneKey,
} from '../../services/retention/retention.config';
import {
  loadRetentionFilters,
  saveRetentionFilters,
} from '../../services/retention/retentionFilterStorage';
import RetentionFollowUpBox from './RetentionFollowUpBox';
import RetentionModal from './RetentionModal';
import PlacementHistoryModal from '../placementRetention/PlacementHistoryModal';

const PAGE_SIZE = 10;

interface RetentionLearnerTableProps {
  batchCohortId: string;
  // Needed to migrate learners still on the old per-field Placement storage
  // and to render placement details in the history modal.
  placementForm: PlacementFormBundle | null;
  retentionForm: RetentionFormBundle | null;
}

const RetentionLearnerTable: React.FC<RetentionLearnerTableProps> = ({
  batchCohortId,
  placementForm,
  retentionForm,
}) => {
  const { t } = useTranslation();

  const [persistedFilters] = useState(() => loadRetentionFilters());

  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState(persistedFilters.search || '');
  const [statusFilter, setStatusFilter] = useState<RetentionLearnerStatus | ''>(
    (persistedFilters.status as RetentionLearnerStatus | '') || ''
  );
  const [rows, setRows] = useState<any[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const [followUpModal, setFollowUpModal] = useState<{
    row: any;
    placementId: string;
    milestoneKey: RetentionMilestoneKey;
    isCompleted: boolean;
    // Opened from the Placement History modal — closing the form goes back
    // to it instead of to the bare table.
    fromHistory?: boolean;
  } | null>(null);
  const [historyModal, setHistoryModal] = useState<{
    row: any;
    expandedPlacementId?: string;
  } | null>(null);

  const fetchLearners = async (page: number) => {
    try {
      const { userDetails, totalCount: total } = await getBatchLearners({
        batchCohortId,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        name: searchTerm.trim() || undefined,
        status: statusFilter || undefined,
        defaultStatuses: RETENTION_LEARNER_STATUSES,
      });
      setRows(userDetails);
      setTotalCount(total);
    } catch (error) {
      console.error('Error fetching retention learners:', error);
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

  const getPlacementLabel = (placement: PlacementRecord | undefined): string =>
    placement
      ? `${placement.companyName || '-'} · ${formatPlacementDate(placement.placementDate)}`
      : '';

  // The table's follow-up columns always track the learner's *current*
  // (active) placement; earlier placements' follow-ups are in the history
  // modal.
  const milestoneColumns = RETENTION_MILESTONES.map((milestone) => ({
    key: `milestone_${milestone.key}`,
    label: t(milestone.labelKey),
    minWidth: 200,
    render: (row: any) => {
      const active = getActivePlacement(getRowData(row));
      if (!active?.placementDate || !retentionForm?.schema) return '-';
      const view = getPlacementMilestoneViews(active).find((v) => v.key === milestone.key);
      if (!view) return '-';

      return (
        <RetentionFollowUpBox
          targetDate={view.targetDate}
          state={view.state}
          onClick={
            view.state !== 'upcoming'
              ? () =>
                  setFollowUpModal({
                    row,
                    placementId: active.placementId,
                    milestoneKey: milestone.key,
                    isCompleted: view.state === 'completed',
                  })
              : undefined
          }
        />
      );
    },
  }));

  // The learner's current placement's organization (with its placement
  // date underneath); earlier placements are in the history modal.
  const organizationColumn = {
    key: 'organizationName',
    label: t('PLACEMENTS.ORGANIZATION_NAME'),
    minWidth: 220,
    render: (row: any) => {
      const active = getActivePlacement(getRowData(row));
      return (
        <Box>
          <Box>{active?.companyName || '-'}</Box>
          {active && (
            <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>
              {formatPlacementDate(active.placementDate)}
            </Box>
          )}
        </Box>
      );
    },
  };

  const columns = [
    {
      key: 'action',
      label: t('PLACEMENTS.ACTION'),
      minWidth: 80,
      render: (row: any) =>
        getRowData(row).placements.length > 0 ? (
          <Tooltip title={t('PLACEMENTS.PLACEMENT_HISTORY')}>
            <IconButton size="small" onClick={() => setHistoryModal({ row })}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          '-'
        ),
    },
    {
      key: 'status',
      label: t('RETENTION.STATUS'),
      minWidth: 150,
      render: (row: any) => {
        const status = row?.status as RetentionLearnerStatus | undefined;
        return status && RETENTION_STATUS_LABEL_KEYS[status] ? (
          <Chip
            size="small"
            label={t(RETENTION_STATUS_LABEL_KEYS[status])}
            color={status === 'retention_complete' ? 'success' : 'default'}
          />
        ) : (
          '-'
        );
      },
    },
    {
      key: 'learnerName',
      label: t('RETENTION.LEARNER'),
      minWidth: 150,
      render: (row: any) => (
        <Box>
          <Box>{getLearnerDisplayName(row)}</Box>
          <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>
            {row?.username || row?.userId || '-'}
          </Box>
        </Box>
      ),
    },
    organizationColumn,
    ...milestoneColumns,
  ];

  return (
    <Box>
      <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} sx={{ mb: 2 }}>
        <Box sx={{ flex: 1, minWidth: 260 }}>
          <LearnerSearchBar
            onSearch={(value) => {
              setSearchTerm(value);
              saveRetentionFilters({ search: value });
            }}
            value={searchTerm}
            placeholder={t('RETENTION.SEARCH_LEARNER')}
            fullWidth
          />
        </Box>
        <TextField
          select
          size="small"
          label={t('RETENTION.STATUS')}
          value={statusFilter}
          onChange={(e) => {
            const value = e.target.value as RetentionLearnerStatus | '';
            setStatusFilter(value);
            saveRetentionFilters({ status: value });
          }}
          sx={{ width: 200, mt: 2 }}
        >
          <MenuItem value="">{t('RETENTION.ALL_STATUSES')}</MenuItem>
          {RETENTION_LEARNER_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {t(RETENTION_STATUS_LABEL_KEYS[status])}
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
          emptyMessage={t('RETENTION.NO_LEARNERS_FOUND')}
        />
      ) : (
        <Box display="flex" flexDirection="column" alignItems="center" sx={{ py: 4 }}>
          <Loader showBackdrop={false} loadingText={t('COMMON.LOADING')} />
        </Box>
      )}

      {/* Mounted only while a Follow-Up is actually selected — see
          RetentionModal's own comment (mirrors PlacementModal.tsx exactly)
          for why: a persistently-mounted modal toggling an `open` prop let
          a superseded DynamicForm instance's delayed async option-fetch
          clobber live state, a race that depended on network timing. */}
      {followUpModal && retentionForm && placementForm && (() => {
        const { row, placementId, milestoneKey, isCompleted, fromHistory } = followUpModal;
        const milestoneDef = RETENTION_MILESTONES.find((m) => m.key === milestoneKey);
        const placement = getPlacementById(getRowData(row), placementId);
        // Same target date that makes this Follow-Up Due (see
        // getPlacementMilestoneViews) — the earliest allowed Calling Date.
        const targetDate =
          placement?.placementDate && milestoneDef
            ? computeMilestoneTargetDate(placement.placementDate, milestoneDef.months)
            : null;
        const initialFormData = isCompleted
          ? getRetentionMilestone(placement, milestoneDef?.months ?? -1)?.formData || {}
          : getFreshRetentionFormData(retentionForm.schema, milestoneKey);
        // API-driven fields (domain) only show a prefilled value once their
        // fetched option list contains it — see withKnownApiOptionValues.
        // Only needed when viewing a Completed Follow-Up.
        const formForModal = isCompleted
          ? { ...retentionForm, schema: withKnownApiOptionValues(retentionForm.schema, initialFormData) }
          : retentionForm;
        return (
          <RetentionModal
            onClose={() => {
              setFollowUpModal(null);
              // History reads the row's data by cohortMembershipId, so after
              // a save it picks up the refreshed data once the refetch lands.
              if (fromHistory) setHistoryModal({ row, expandedPlacementId: placementId });
            }}
            batchCohortId={batchCohortId}
            learnerName={getLearnerDisplayName(row)}
            learnerRow={row}
            placementId={placementId}
            placementLabel={getPlacementLabel(placement)}
            placementSchema={placementForm.schema}
            milestoneKey={milestoneKey}
            milestoneLabel={milestoneDef ? t(milestoneDef.labelKey) : undefined}
            isCompleted={isCompleted}
            callingDateMin={targetDate ? format(targetDate, 'yyyy-MM-dd') : undefined}
            initialFormData={initialFormData}
            form={formForModal}
            onSaved={refreshCurrentPage}
          />
        );
      })()}

      {historyModal && placementForm && (
        <PlacementHistoryModal
          onClose={() => setHistoryModal(null)}
          learnerName={getLearnerDisplayName(historyModal.row)}
          data={getRowData(historyModal.row)}
          defaultExpandedPlacementId={historyModal.expandedPlacementId}
          placementForm={placementForm}
          onOpenMilestone={
            retentionForm
              ? (placementId, milestoneKey, isCompleted) => {
                  setFollowUpModal({
                    row: historyModal.row,
                    placementId,
                    milestoneKey,
                    isCompleted,
                    fromHistory: true,
                  });
                  setHistoryModal(null);
                }
              : undefined
          }
        />
      )}
    </Box>
  );
};

export default RetentionLearnerTable;
