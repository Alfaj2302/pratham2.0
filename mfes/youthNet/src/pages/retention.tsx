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
import { getRetentionForm, RetentionFormBundle } from '../services/retention/RetentionFormService';
import { PlacementBatch } from '../services/placements/PlacementBatchService';
import { PlacementCenter, SdbvFilters } from '../services/placements/PlacementCenterService';
import {
  loadRetentionFilters,
  saveRetentionFilters,
} from '../services/retention/retentionFilterStorage';
import {
  PlacementSearchSchema,
  PlacementSearchUISchema,
} from '../constant/Forms/PlacementSearchSchema';
import CenterBatchSelector from '../components/placements/CenterBatchSelector';
import RetentionLearnerTable from '../components/retention/RetentionLearnerTable';

// Retention page for the Placement Retention Coordinator. Structure
// mirrors placements.tsx 1:1 (role gate, Header + BackHeader, SDBV filter
// bar, Center/Batch picker, then the learner table) — reusing the same
// SDBV schema, CenterBatchSelector, and domain/Center/Batch services as
// Placements, since none of them are actually Placement-specific despite
// their folder name; only the learner table and follow-up form are new.
const RetentionPage = () => {
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (getLoggedInUserRole() !== YOUTHNET_USER_ROLE.PLACEMENT_RETENTION_COORDINATOR) {
      router.replace('/');
    }
  }, []);

  const [persistedFilters] = useState(() => loadRetentionFilters());

  const [domains, setDomains] = useState<string[]>([]);
  const [sdbv, setSdbv] = useState<SdbvFilters>(persistedFilters.sdbv || {});
  const [selectedCenter, setSelectedCenter] = useState<PlacementCenter | null>(
    persistedFilters.center || null
  );
  const [selectedBatch, setSelectedBatch] = useState<PlacementBatch | null>(
    persistedFilters.batch || null
  );
  const [placementForm, setPlacementForm] = useState<PlacementFormBundle | null>(null);
  const [retentionForm, setRetentionForm] = useState<RetentionFormBundle | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    getCoordinatorDomains(userId).then(setDomains);
    getPlacementForm().then(setPlacementForm);
    getRetentionForm().then(setRetentionForm);
  }, []);

  const handleSdbvSubmit = (formData: any) => {
    const nextSdbv = {
      state: formData?.state?.[0],
      district: formData?.district?.[0],
      block: formData?.block?.[0],
    };
    setSdbv(nextSdbv);
    saveRetentionFilters({ sdbv: nextSdbv, sdbvFormData: formData });
  };

  const handleCenterSelected = (center: PlacementCenter | null) => {
    setSelectedCenter(center);
    saveRetentionFilters({ center });
  };

  const handleBatchSelected = (batch: PlacementBatch | null) => {
    setSelectedBatch(batch);
    saveRetentionFilters({ batch });
  };

  return (
    <>
      <Box>
        <Header />
      </Box>
      <Box ml={2}>
        <BackHeader
          headingOne={t('RETENTION.PAGE_TITLE')}
          headingTwo={t('RETENTION.PAGE_SUBTITLE')}
        />
      </Box>

      <Box display="flex" flexDirection="column" gap={3} sx={{ px: 2, mb: 4 }}>
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
              isReassign={!!persistedFilters.sdbvFormData}
              prefilledFormData={persistedFilters.sdbvFormData || {}}
              type="retention-center-search"
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
          <RetentionLearnerTable
            batchCohortId={selectedBatch.cohortId}
            placementForm={placementForm}
            retentionForm={retentionForm}
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

export default withRole(TENANT_DATA.YOUTHNET)(RetentionPage);
