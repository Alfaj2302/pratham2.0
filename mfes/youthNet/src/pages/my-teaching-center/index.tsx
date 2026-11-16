import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Button, TextField, InputAdornment, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Clear, Search } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { showToastMessage } from '@shared-lib-v2/DynamicForm/components/Toastify';
import Header from '../../components/Header';
import BackHeader from '../../components/youthNet/BackHeader';
import NoDataFound from '../../components/common/NoDataFound';
import withRole from '../../components/withRole';
import { TENANT_DATA } from '../../utils/app.config';
import { getLoggedInUserRole } from '../../utils/helper';
import { YOUTHNET_USER_ROLE } from '../../components/youthNet/tempConfigs';
import { getTrainerTaxonomy } from '../../services/myTeachingCenter/TrainerTaxonomyService';
import { getMyTeachingCenterBatches, getCohortTypeOfCenter } from '../../services/myTeachingCenter/BatchListService';
import { getTrainerCenters, TrainerCenter } from '../../services/myTeachingCenter/TrainerCentersService';
import BatchList from '../../components/myTeachingCenter/BatchList';
import CreateBatchModal from '../../components/myTeachingCenter/CreateBatchModal';
import CenterSwitcher from '../../components/myTeachingCenter/CenterSwitcher';
import { MyTeachingCenterBatch, TrainerAssignedTaxonomy } from '../../utils/Interfaces';

// Persists the Trainer's last-picked Center across navigation/remounts (the
// page's own component state doesn't survive leaving and coming back to
// this route) — read back on load and preferred over defaulting to the
// first assigned Center, as long as it's still one of the Trainer's Centers.
const SELECTED_CENTER_STORAGE_KEY = 'myTeachingCenterSelectedCenterId';

// Same page layout/design as /scp-teacher-repo/centers?tab=1 (search +
// "Add New" button above a BatchList grid). The Trainer's own Domain/Skills
// (from their profile) scope which batches are fetched at all; a Trainer
// assigned to more than one Center additionally picks which Center's
// batches to view via the switcher in the title row (client-side filter —
// the batch search itself stays Domain/Skills-scoped, unchanged).
const MyTeachingCenterPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme<any>();

  useEffect(() => {
    if (getLoggedInUserRole() !== YOUTHNET_USER_ROLE.INSTRUCTOR) {
      router.replace('/');
    }
  }, []);

  const [taxonomy, setTaxonomy] = useState<TrainerAssignedTaxonomy>({ domains: [], skills: [] });
  const [batches, setBatches] = useState<MyTeachingCenterBatch[] | null>(null);
  const [centers, setCenters] = useState<TrainerCenter[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string>('');
  // TYPE_OF_CENTER off the selected Center's own Cohort Details — controls
  // which Type of Batch options CreateBatchModal offers.
  const [centerType, setCenterType] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const loadBatches = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setBatches([]);
      return;
    }
    try {
      const [trainerTaxonomy, trainerCenters] = await Promise.all([
        getTrainerTaxonomy(userId),
        getTrainerCenters(userId),
      ]);
      setTaxonomy(trainerTaxonomy);
      setCenters(trainerCenters);
      // Prefer the last-picked Center (persisted in localStorage) if it's
      // still one of the Trainer's Centers, else fall back to the first
      // one. Only applied when nothing is selected yet in this component
      // instance, so reloading batches after Create Batch doesn't reset the
      // Trainer's current in-page selection out from under them.
      setSelectedCenterId((prev) => {
        if (prev) return prev;
        const storedCenterId = localStorage.getItem(SELECTED_CENTER_STORAGE_KEY);
        const storedIsValid = storedCenterId && trainerCenters.some((c) => c.id === storedCenterId);
        return (storedIsValid ? storedCenterId : trainerCenters[0]?.id) || '';
      });
      const list = await getMyTeachingCenterBatches(trainerTaxonomy.domains, trainerTaxonomy.skills);
      setBatches(list);
    } catch (error) {
      console.error('Error loading My Teaching Center batches:', error);
      showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
      setBatches([]);
    }
  };

  useEffect(() => {
    loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch centerType whenever the selected Center changes (including the
  // initial default selection above).
  useEffect(() => {
    if (!selectedCenterId) {
      setCenterType(null);
      return;
    }
    getCohortTypeOfCenter(selectedCenterId).then(setCenterType);
  }, [selectedCenterId]);

  const filteredBatches = useMemo(() => {
    if (!batches) return [];
    return batches.filter((batch) => {
      if (selectedCenterId && batch.centerId !== selectedCenterId) return false;
      if (!searchInput.trim()) return true;
      return batch.name?.toLowerCase().includes(searchInput.trim().toLowerCase());
    });
  }, [batches, searchInput, selectedCenterId]);

  const hasTaxonomy = taxonomy.domains.length > 0 && taxonomy.skills.length > 0;
  const canCreateBatch = hasTaxonomy && !!selectedCenterId;

  const handleCenterChange = (centerId: string) => {
    setSelectedCenterId(centerId);
    localStorage.setItem(SELECTED_CENTER_STORAGE_KEY, centerId);
  };

  return (
    <>
      <Box>
        <Header />
      </Box>
      <Box
        ml={2}
        pr={2}
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
      >
        <BackHeader headingOne={t('MY_TEACHING_CENTER.PAGE_TITLE')} />
        {centers.length > 1 && (
          <CenterSwitcher
            centers={centers}
            selectedCenterId={selectedCenterId}
            onChange={handleCenterChange}
          />
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
          px: 2,
          mb: 2,
          mt: 2,
          flexWrap: 'wrap',
        }}
      >
        <TextField
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('COMMON.SEARCH')}
          variant="outlined"
          size="medium"
          sx={{
            width: { xs: '100%', sm: '400px', md: '450px' },
            height: '48px',
            backgroundColor: theme?.palette?.warning?.A700,
            color: theme?.palette?.warning?.A200,
            borderRadius: '40px',
            pl: 2,
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
            '& .MuiOutlinedInput-root': { paddingRight: '8px', borderRadius: '40px', boxShadow: 'none' },
            '& .MuiInputBase-input': { color: theme?.palette?.warning?.A200 },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {searchInput ? (
                  <IconButton onClick={() => setSearchInput('')} edge="end" sx={{ color: theme.palette.warning['A200'] }}>
                    <Clear sx={{ color: theme?.palette?.warning?.['300'] }} />
                  </IconButton>
                ) : (
                  <Search sx={{ color: theme?.palette?.warning?.['300'] }} />
                )}
              </InputAdornment>
            ),
          }}
        />
        {canCreateBatch && (
          <Button
            sx={{
              mt: 1.2,
              border: '1px solid #1E1B16',
              borderRadius: '100px',
              height: '40px',
              px: '16px',
              color: theme.palette.error.contrastText,
              alignSelf: 'flex-start',
            }}
            endIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            {t('MY_TEACHING_CENTER.CREATE_BATCH')}
          </Button>
        )}
      </Box>

      <Box>
        {batches == null ? (
          <Typography sx={{ px: 2 }}>{t('COMMON.LOADING')}</Typography>
        ) : !hasTaxonomy ? (
          <Typography sx={{ px: 2 }} color="text.secondary">
            {t('MY_TEACHING_CENTER.NO_DOMAIN_SKILLS_ASSIGNED')}
          </Typography>
        ) : filteredBatches.length > 0 ? (
          <BatchList
            batches={filteredBatches}
            router={router}
            theme={theme}
            onBatchClick={(batch) => router.push(`/my-teaching-center/${batch.cohortId}`)}
          />
        ) : (
          <NoDataFound title="MY_TEACHING_CENTER.NO_BATCHES_FOUND" />
        )}
      </Box>

      {canCreateBatch && (
        <CreateBatchModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          centerId={selectedCenterId}
          centerType={centerType}
          trainerTaxonomy={taxonomy}
          onCreated={loadBatches}
        />
      )}
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

export default withRole(TENANT_DATA.YOUTHNET)(MyTeachingCenterPage);
