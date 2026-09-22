import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import DynamicForm from '@shared-lib-v2/DynamicForm/components/DynamicForm';
import Header from '../components/Header';
import BackHeader from '../components/youthNet/BackHeader';
import withRole from '../components/withRole';
import { TENANT_DATA } from '../utils/app.config';
import { getLoggedInUserRole } from '../utils/helper';
import { YOUTHNET_USER_ROLE } from '../components/youthNet/tempConfigs';
import { getCoordinatorDomains } from '../services/placements/PlacementTaxonomyService';
import { getPlacementForm, PlacementFormBundle } from '../services/placements/PlacementFormService';
import { PlacementBatch } from '../services/placements/PlacementBatchService';
import { PlacementCenter, SdbvFilters } from '../services/placements/PlacementCenterService';
import {
  loadPlacementsFilters,
  savePlacementsFilters,
} from '../services/placements/placementsFilterStorage';
import {
  PlacementSearchSchema,
  PlacementSearchUISchema,
} from '../constant/Forms/PlacementSearchSchema';
import CenterBatchSelector from '../components/placements/CenterBatchSelector';
import PlacementLearnerTable from '../components/placements/PlacementLearnerTable';

// Placements page for the Placement Retention Coordinator. Structure
// mirrors l2-interested-queue.tsx / my-teaching-center/index.tsx: role gate,
// Header + BackHeader, an SDBV DynamicForm filter bar (Centers only — never
// Learners, per spec), then a Center/Batch picker, then the learner table.
// Kept deliberately separate from the Retention flow (not built yet) so
// Retention can be added later without touching this page.
const PlacementsPage = () => {
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (getLoggedInUserRole() !== YOUTHNET_USER_ROLE.PLACEMENT_RETENTION_COORDINATOR) {
      router.replace('/');
    }
  }, []);

  // Restored once per mount (not on every render) so a page refresh brings
  // back the Coordinator's SDBV/Center/Batch selection instead of dropping
  // them — see placementsFilterStorage.
  const [persistedFilters] = useState(() => loadPlacementsFilters());

  const [domains, setDomains] = useState<string[]>([]);
  const [sdbv, setSdbv] = useState<SdbvFilters>(persistedFilters.sdbv || {});
  const [selectedCenter, setSelectedCenter] = useState<PlacementCenter | null>(
    persistedFilters.center || null
  );
  const [selectedBatch, setSelectedBatch] = useState<PlacementBatch | null>(
    persistedFilters.batch || null
  );
  const [placementForm, setPlacementForm] = useState<PlacementFormBundle | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    getCoordinatorDomains(userId).then(setDomains);
    getPlacementForm().then(setPlacementForm);
  }, []);

  const handleSdbvSubmit = (formData: any) => {
    const nextSdbv = {
      state: formData?.state?.[0],
      district: formData?.district?.[0],
      block: formData?.block?.[0],
    };
    setSdbv(nextSdbv);
    savePlacementsFilters({ sdbv: nextSdbv, sdbvFormData: formData });
  };

  const handleCenterSelected = (center: PlacementCenter | null) => {
    setSelectedCenter(center);
    savePlacementsFilters({ center });
  };

  const handleBatchSelected = (batch: PlacementBatch | null) => {
    setSelectedBatch(batch);
    savePlacementsFilters({ batch });
  };

  return (
    <>
      <Box>
        <Header />
      </Box>
      <Box ml={2}>
        <BackHeader
          headingOne={t('PLACEMENTS.PAGE_TITLE')}
          headingTwo={t('PLACEMENTS.PAGE_SUBTITLE')}
        />
      </Box>

      <Box display="flex" flexDirection="column" gap={3} sx={{ px: 2, mb: 4 }}>
        {/* One bordered panel for both filter rows — real padding, not a
            flex `gap`, keeps them visually separated regardless of
            DynamicForm's own internal Grid spacing/negative-margin
            behavior (the outlined Center/Batch labels were overlapping the
            SDBV row's bottom border when the two sat directly in a `gap`
            column with no padding between them). */}
        <Box
          sx={{
            border: '1px solid #eee',
            borderRadius: 2,
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {/* DynamicForm hardcodes a Grid item xs={12} md={4} lg={3} per
              field whenever isCallSubmitInHandle is true (same quirk
              l2-interested-queue.tsx's side panel works around) — at lg
              that's only 3/12 columns per field, leaving the State/
              District/Block row using just 75% of the row width with a
              blank strip on the right. Overriding .MuiGrid-item to an equal
              flex split here (call-site only, not touching the shared
              component) makes the row's fields fill 100% of the width
              instead, evenly, regardless of field count. */}
          <Box
            mb={3}
            sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 2,
            }}
          >
            <DynamicForm
              schema={PlacementSearchSchema}
              uiSchema={{
                ...PlacementSearchUISchema,
                'ui:submitButtonOptions': { norender: true },
              }}
              SubmitaFunction={handleSdbvSubmit}
              isCallSubmitInHandle={true}
              // Restored District/Block need DynamicForm's own dependent-API
              // re-fetch to populate their option lists from the restored
              // State/District — isReassign is what triggers that (see
              // DynamicForm's renderPrefilledForm effect).
              isReassign={!!persistedFilters.sdbvFormData}
              prefilledFormData={persistedFilters.sdbvFormData || {}}
              type="placements-center-search"
            />
          </Box>

          <CenterBatchSelector
            domains={domains}
            sdbv={sdbv}
            initialCenter={selectedCenter}
            initialBatch={selectedBatch}
            onCenterSelected={handleCenterSelected}
            onBatchSelected={handleBatchSelected}
          />
        </Box>

        {selectedBatch && (
          <PlacementLearnerTable
            batchCohortId={selectedBatch.cohortId}
            placementForm={placementForm}
          />
        )}
      </Box>
    </>
  );
};

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default withRole(TENANT_DATA.YOUTHNET)(PlacementsPage);
