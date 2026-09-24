import React, { useEffect, useState } from 'react';
import { Box, Chip, TextField, MenuItem } from '@mui/material';
import { useTranslation } from 'next-i18next';
import CommonDataTable from '@shared-lib-v2/lib/Table/CommonDataTable';
import Loader from '@shared-lib-v2/DynamicForm/components/Loader';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import LearnerSearchBar from '../myTeachingCenter/LearnerSearchBar';
import {
  getBatchLearners,
  getLearnerDisplayName,
} from '../../services/myTeachingCenter/LearnerListService';
import { getLearnerPlacementValue, PlacementFormBundle } from '../../services/placements/PlacementFormService';
import {
  buildRetentionSchemaWithKnownValues,
  extractRetentionFormData,
  getFreshRetentionFormData,
  isMilestoneCompleted,
  RetentionFormBundle,
} from '../../services/retention/RetentionFormService';
import { computeMilestoneTargetDate, getFollowUpState } from '../../services/retention/RetentionMilestones';
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

const PAGE_SIZE = 10;

interface RetentionLearnerTableProps {
  batchCohortId: string;
  // Needed to read a learner's Placement Date (dateOfJoining) — that field
  // belongs to the Placement Form, not the Retention Form, since Retention
  // milestones are calculated from it (see spec section 8).
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
    milestoneKey: RetentionMilestoneKey;
    isCompleted: boolean;
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

  const milestoneColumns = RETENTION_MILESTONES.map((milestone) => ({
    key: `milestone_${milestone.key}`,
    label: t(milestone.labelKey),
    render: (row: any) => {
      const placementDate =
        placementForm?.schema &&
        getLearnerPlacementValue(placementForm.schema, 'dateOfJoining', row);
      if (!placementDate || !retentionForm?.schema) return '-';

      const targetDate = computeMilestoneTargetDate(placementDate, milestone.months);
      const completed = isMilestoneCompleted(row, milestone.key);
      const state = getFollowUpState(targetDate, completed);

      return (
        <RetentionFollowUpBox
          targetDate={targetDate}
          state={state}
          onClick={
            state !== 'upcoming'
              ? () =>
                  setFollowUpModal({ row, milestoneKey: milestone.key, isCompleted: state === 'completed' })
              : undefined
          }
        />
      );
    },
  }));

  const columns = [
    {
      key: 'learnerName',
      label: t('RETENTION.LEARNER'),
      render: (row: any) => (
        <Box>
          <Box>{getLearnerDisplayName(row)}</Box>
          <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>
            {row?.username || row?.userId || '-'}
          </Box>
        </Box>
      ),
    },
    ...milestoneColumns,
    {
      key: 'status',
      label: t('RETENTION.STATUS'),
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
      {followUpModal && retentionForm && (() => {
        const { row, milestoneKey, isCompleted } = followUpModal;
        const milestoneDef = RETENTION_MILESTONES.find((m) => m.key === milestoneKey);
        const initialFormData = isCompleted
          ? extractRetentionFormData(row, milestoneKey)
          : getFreshRetentionFormData(retentionForm.schema, milestoneKey);
        // API-driven fields (domain) only show a prefilled value once their
        // fetched option list actually contains it — a timing race against
        // DynamicForm's own async option-fetch that's proven unreliable.
        // buildRetentionSchemaWithKnownValues sidesteps it by injecting the
        // already-known value as a guaranteed option into a schema clone,
        // so it resolves immediately regardless of API timing. Only needed
        // when viewing a Completed Follow-Up — a fresh one has nothing to
        // prefill yet.
        const formForModal = isCompleted
          ? { ...retentionForm, schema: buildRetentionSchemaWithKnownValues(retentionForm.schema, initialFormData) }
          : retentionForm;
        return (
          <RetentionModal
            onClose={() => setFollowUpModal(null)}
            membershipId={row.cohortMembershipId}
            learnerName={getLearnerDisplayName(row)}
            learnerRow={row}
            milestoneKey={milestoneKey}
            milestoneLabel={milestoneDef ? t(milestoneDef.labelKey) : undefined}
            isCompleted={isCompleted}
            initialFormData={initialFormData}
            form={formForModal}
            onSaved={refreshCurrentPage}
          />
        );
      })()}
    </Box>
  );
};

export default RetentionLearnerTable;
