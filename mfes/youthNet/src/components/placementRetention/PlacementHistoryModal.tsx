import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Divider,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'next-i18next';
import SimpleModal from '@shared-lib-v2/lib/SimpleModal/SimpleModal';
import {
  formatPlacementValueForDisplay,
  getPlacementFieldLabel,
  getPlacementFieldOrder,
  PlacementFormBundle,
} from '../../services/placements/PlacementFormService';
import { PLACEMENT_TABLE_EXCLUDED_FIELDS } from '../../services/placements/placements.config';
import {
  getPlacementsNewestFirst,
  PlacementRecord,
  PlacementRetentionData,
} from '../../services/placementRetention/PlacementRetentionDataService';
import {
  formatPlacementDate,
  getPlacementMilestoneViews,
} from '../../services/retention/RetentionMilestones';
import { RetentionMilestoneKey } from '../../services/retention/retention.config';
import RetentionFollowUpBox from '../retention/RetentionFollowUpBox';

interface PlacementHistoryModalProps {
  onClose: () => void;
  learnerName?: string;
  data: PlacementRetentionData;
  placementForm: PlacementFormBundle;
  // Retention page: makes milestone boxes clickable. A previous (resigned)
  // placement's milestones can only be viewed, never newly filled in.
  onOpenMilestone?: (placementId: string, milestoneKey: RetentionMilestoneKey, isCompleted: boolean) => void;
  // Placement to re-open expanded when returning from one of its follow-ups.
  // Every placement starts collapsed otherwise.
  defaultExpandedPlacementId?: string;
}

// Every placement a learner has had, newest first, one Accordion each —
// placement details plus that placement's own Retention follow-ups. Shared
// by the Placements and Retention pages. Same "mounted only while open"
// pattern as PlacementModal/RetentionModal.
const PlacementHistoryModal: React.FC<PlacementHistoryModalProps> = ({
  onClose,
  learnerName,
  data,
  placementForm,
  onOpenMilestone,
  defaultExpandedPlacementId,
}) => {
  const { t } = useTranslation();
  const placements = getPlacementsNewestFirst(data);
  const fieldKeys = getPlacementFieldOrder(placementForm).filter(
    (key) => !PLACEMENT_TABLE_EXCLUDED_FIELDS.includes(key)
  );

  // Label/value rows share one two-column grid per placement, so every value
  // starts at the same x position however long its label is.
  const detailGridSx = {
    display: 'grid',
    gridTemplateColumns: 'minmax(110px, 42%) 1fr',
    columnGap: 2,
    rowGap: 1.25,
    alignItems: 'start',
  };

  const sectionTitleSx = {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    color: 'text.secondary',
    mb: 1.25,
  };

  const renderPlacement = (placement: PlacementRecord) => {
    const isActive = placement.status === 'active';
    const dateRange = isActive
      ? formatPlacementDate(placement.placementDate)
      : `${formatPlacementDate(placement.placementDate)} – ${formatPlacementDate(placement.exitDate)}`;

    return (
      <Accordion
        key={placement.placementId}
        // All collapsed on open; only a placement being returned to (after
        // closing one of its Retention follow-ups) re-opens expanded.
        defaultExpanded={!!defaultExpandedPlacementId && placement.placementId === defaultExpandedPlacementId}
        disableGutters
        elevation={0}
        sx={{
          mb: 1.5,
          border: '1px solid',
          borderColor: isActive ? 'success.light' : 'divider',
          borderRadius: '8px !important',
          overflow: 'hidden',
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            px: 2,
            backgroundColor: isActive ? 'rgba(46, 125, 50, 0.06)' : 'transparent',
            '& .MuiAccordionSummary-content': { my: 1.25, minWidth: 0 },
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5} width="100%" minWidth={0} pr={1}>
            <Box flex={1} minWidth={0}>
              <Typography variant="subtitle2" noWrap title={placement.companyName || ''}>
                {placement.companyName || '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dateRange}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={t(isActive ? 'PLACEMENTS.PLACEMENT_STATUS_ACTIVE' : 'PLACEMENTS.PLACEMENT_STATUS_RESIGNED')}
              color={isActive ? 'success' : 'default'}
              variant={isActive ? 'filled' : 'outlined'}
              sx={{ flexShrink: 0 }}
            />
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ px: 2, pt: 2, pb: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography sx={sectionTitleSx}>{t('PLACEMENTS.PLACEMENT_DETAILS')}</Typography>
          <Box sx={detailGridSx}>
            {fieldKeys.map((key) => (
              <React.Fragment key={key}>
                <Typography variant="body2" color="text.secondary">
                  {getPlacementFieldLabel(placementForm.schema, key, t)}
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                  {formatPlacementValueForDisplay(placementForm.schema, key, placement.formData?.[key], t)}
                </Typography>
              </React.Fragment>
            ))}
            {!isActive && (
              <>
                <Typography variant="body2" color="text.secondary">
                  {t('PLACEMENTS.EXIT_DATE')}
                </Typography>
                <Typography variant="body2">{formatPlacementDate(placement.exitDate)}</Typography>
              </>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography sx={sectionTitleSx}>{t('PLACEMENTS.RETENTION_FOLLOW_UPS')}</Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 1.25,
              // RetentionFollowUpBox has its own minWidth — stretch it to the
              // grid cell instead so every box lines up.
              '& .follow-up-cell > div': { minWidth: 0, width: '100%', boxSizing: 'border-box' },
            }}
          >
            {getPlacementMilestoneViews(placement).map((view) => {
              const isCompleted = view.state === 'completed';
              const canOpen = !!onOpenMilestone && (isCompleted || (isActive && view.state === 'due'));
              return (
                <Box key={view.key} className="follow-up-cell">
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t(view.labelKey)}
                  </Typography>
                  {isActive || isCompleted ? (
                    <RetentionFollowUpBox
                      targetDate={view.targetDate}
                      state={view.state}
                      onClick={
                        canOpen
                          ? () => onOpenMilestone?.(placement.placementId, view.key, isCompleted)
                          : undefined
                      }
                    />
                  ) : (
                    <Box
                      sx={{
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 0.75,
                      }}
                    >
                      <Typography variant="caption" color="text.disabled">
                        {t('RETENTION.STATE_NOT_RECORDED')}
                      </Typography>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>

        </AccordionDetails>
      </Accordion>
    );
  };

  // No scroll container of our own: SimpleModal's body already scrolls
  // (maxHeight 60vh), and nesting a second one gave two scrollbars.
  return (
    <SimpleModal
      open
      onClose={onClose}
      showFooter={true}
      modalTitle={t('PLACEMENTS.PLACEMENT_HISTORY')}
      secondaryText={t('COMMON.CLOSE')}
      secondaryActionHandler={onClose}
    >
      <Box display="flex" alignItems="baseline" justifyContent="space-between" gap={1} mb={1.5}>
        <Typography variant="subtitle2" noWrap>
          {learnerName || ''}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
          {t('PLACEMENTS.PLACEMENT_COUNT', { count: placements.length })}
        </Typography>
      </Box>
      {placements.length ? (
        placements.map(renderPlacement)
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('PLACEMENTS.NO_PLACEMENTS')}
        </Typography>
      )}
    </SimpleModal>
  );
};

export default PlacementHistoryModal;
