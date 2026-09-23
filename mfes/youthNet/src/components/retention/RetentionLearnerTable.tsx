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
  getMilestoneEntry,
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
      const completed = isMilestoneCompleted(retentionForm.schema, row, milestone.key);
      const state = getFollowUpState(targetDate, completed);
      const submittedAt = completed
        ? getMilestoneEntry(retentionForm.schema, row, milestone.key)?.submittedAt
        : undefined;

      return (
        <RetentionFollowUpBox
          targetDate={targetDate}
          state={state}
          completedDate={submittedAt ? new Date(submittedAt) : null}
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

  const modalMilestoneDef = followUpModal
    ? RETENTION_MILESTONES.find((m) => m.key === followUpModal.milestoneKey)
    : null;

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

      <RetentionModal
        open={followUpModal !== null}
        onClose={() => setFollowUpModal(null)}
        membershipId={followUpModal?.row?.cohortMembershipId ?? null}
        learnerName={followUpModal ? getLearnerDisplayName(followUpModal.row) : undefined}
        learnerRow={followUpModal?.row}
        milestoneKey={followUpModal?.milestoneKey ?? null}
        milestoneLabel={modalMilestoneDef ? t(modalMilestoneDef.labelKey) : undefined}
        isCompleted={!!followUpModal?.isCompleted}
        form={retentionForm}
        onSaved={refreshCurrentPage}
      />
    </Box>
  );
};

export default RetentionLearnerTable;
