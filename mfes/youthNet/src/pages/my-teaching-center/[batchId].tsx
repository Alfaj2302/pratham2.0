import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Loader from '@shared-lib-v2/DynamicForm/components/Loader';
import Header from '../../components/Header';
import BackHeader from '../../components/youthNet/BackHeader';
import withRole from '../../components/withRole';
import { TENANT_DATA } from '../../utils/app.config';
import { getLoggedInUserRole } from '../../utils/helper';
import { YOUTHNET_USER_ROLE } from '../../components/youthNet/tempConfigs';
import {
  getBatchById,
  getCenterName,
  getCohortTypeOfCenter,
} from '../../services/myTeachingCenter/BatchListService';
import BatchDetailsHeader from '../../components/myTeachingCenter/BatchDetailsHeader';
import LearnerListTable from '../../components/myTeachingCenter/LearnerListTable';
import CreateBatchModal from '../../components/myTeachingCenter/CreateBatchModal';
import { MyTeachingCenterBatch } from '../../utils/Interfaces';

// Batch Details — primary content is the Learner List directly, no
// intermediate tabs (spec item 5, deliberately diverging from
// scp-teacher-repo's tab=1/2/3 pattern).
const BatchDetailsPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const batchId = router.query.batchId as string | undefined;

  useEffect(() => {
    if (getLoggedInUserRole() !== YOUTHNET_USER_ROLE.INSTRUCTOR) {
      router.replace('/');
    }
  }, []);

  const [batch, setBatch] = useState<MyTeachingCenterBatch | null>(null);
  const [centerName, setCenterName] = useState<string | null>(null);
  const [headerLoaded, setHeaderLoaded] = useState(false);
  // Filled in by LearnerListTable's own fetch (see its onTotalCountChange)
  // instead of a second, duplicate cohortmember/list call here just for a
  // count.
  const [learnerCount, setLearnerCount] = useState<number | undefined>(undefined);
  const [editOpen, setEditOpen] = useState(false);
  // TYPE_OF_CENTER of the batch's Center — controls Type of Batch options
  // in the Edit form, same as Create (see my-teaching-center/index.tsx).
  const [centerType, setCenterType] = useState<string | null>(null);

  const loadBatch = async () => {
    if (!batchId) return;
    try {
      const batchData = await getBatchById(batchId);
      setBatch(batchData);
      // Separate Cohort Details call for the Center's own display name
      // (see BatchListService.getCenterName) — the batch record itself
      // only carries the Center's id (parentId), not its name.
      const [name, type] = batchData?.centerId
        ? await Promise.all([
            getCenterName(batchData.centerId),
            getCohortTypeOfCenter(batchData.centerId),
          ])
        : [null, null];
      setCenterName(name);
      setCenterType(type);
    } catch (error) {
      // Non-fatal: the Learner List only needs batchId from the URL, so
      // a failed header fetch still lets the page show the table rather
      // than blocking on it.
      console.error('Error loading batch details:', error);
      setBatch(null);
    } finally {
      setHeaderLoaded(true);
    }
  };

  useEffect(() => {
    loadBatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  return (
    <>
      <Box>
        <Header />
      </Box>
      <Box ml={2}>
        <BackHeader
          headingOne={t('MY_TEACHING_CENTER.BACK_TO_BATCHES')}
          showBackButton
          onBackClick={() => router.push('/my-teaching-center')}
        />
      </Box>

      <Box sx={{ px: 2, mb: 5 }}>
        {!batchId ? null : !headerLoaded ? (
          <Box display="flex" flexDirection="column" alignItems="center" sx={{ py: 4 }}>
            <Loader showBackdrop={false} loadingText={t('COMMON.LOADING')} />
          </Box>
        ) : (
          <>
            {batch && (
              <BatchDetailsHeader
                batch={{ ...batch, centerName: centerName ?? undefined, learnerCount }}
                onEditBatch={() => setEditOpen(true)}
              />
            )}
            <LearnerListTable
              batchCohortId={batchId}
              onTotalCountChange={setLearnerCount}
              assessmentIds={batch?.assessmentIds}
            />
            {batch && (
              <CreateBatchModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                centerId={batch.centerId ?? ''}
                centerType={centerType}
                // Not used in Edit mode - Domain/Skills are hidden there.
                trainerTaxonomy={{ domains: [], skills: [] }}
                editBatch={batch}
                onCreated={loadBatch}
              />
            )}
          </>
        )}
      </Box>
    </>
  );
};

export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' };
}

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default withRole(TENANT_DATA.YOUTHNET)(BatchDetailsPage);
