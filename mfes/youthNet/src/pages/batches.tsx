import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import CommonDataTable from '@shared-lib-v2/lib/Table/CommonDataTable';
import Loader from '@shared-lib-v2/DynamicForm/components/Loader';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import Header from '../components/Header';
import BackHeader from '../components/youthNet/BackHeader';
import withRole from '../components/withRole';
import { TENANT_DATA } from '../utils/app.config';
import { getLoggedInUserRole } from '../utils/helper';
import { YOUTHNET_USER_ROLE } from '../components/youthNet/tempConfigs';
import { getCohortList } from '../services/GetCohortList';

// Minimal starting point: a read-only list of the trainer's own
// batches/cohorts. No functional spec beyond "it's a menu item" was given
// yet — extend once the required actions/filters are scoped.
const BatchesPage = () => {
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (getLoggedInUserRole() !== YOUTHNET_USER_ROLE.INSTRUCTOR) {
      router.replace('/');
    }
  }, []);

  const [batches, setBatches] = useState<any[] | null>(null);

  useEffect(() => {
    const fetchBatches = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setBatches([]);
        return;
      }
      try {
        const response = await getCohortList(userId, true, true);
        // getCohortList() catches its own axios errors and returns the
        // error object rather than throwing — detect that explicitly
        // instead of silently treating a failed call as "zero batches".
        if (response?.isAxiosError || response instanceof Error) {
          throw response;
        }
        const list = (response?.result || []).filter(
          (cohort: any) => cohort.type === 'BATCH'
        );
        setBatches(list);
      } catch (error) {
        console.error('Error fetching batches:', error);
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        setBatches([]);
      }
    };
    fetchBatches();
  }, []);

  const columns = [
    {
      key: 'name',
      label: t('L2_QUEUE.BATCH_NAME'),
      render: (row: any) => row?.cohortName || row?.name || '-',
    },
    {
      key: 'status',
      label: t('L2_QUEUE.BATCH_STATUS'),
      render: (row: any) => (
        <Chip
          size="small"
          label={row?.cohortStatus || '-'}
          color={row?.cohortStatus?.toLowerCase() === 'active' ? 'success' : 'default'}
        />
      ),
    },
  ];

  return (
    <>
      <Box>
        <Header />
      </Box>
      <Box ml={2}>
        <BackHeader headingOne={t('L2_QUEUE.BATCHES_PAGE_TITLE')} />
      </Box>

      <Box sx={{ px: 2 }}>
        {batches != null ? (
          <CommonDataTable
            columns={columns}
            rows={batches}
            page={1}
            pageSize={Math.max(batches.length, 1)}
            totalCount={batches.length}
            onPageChange={() => {}}
            emptyMessage={t('L2_QUEUE.NO_BATCHES_FOUND')}
          />
        ) : (
          <Loader showBackdrop={false} loadingText={t('COMMON.LOADING')} />
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

export default withRole(TENANT_DATA.YOUTHNET)(BatchesPage);
