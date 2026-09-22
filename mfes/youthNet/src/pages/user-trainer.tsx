import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import EmailSearchUser from '@shared-lib-v2/MapUser/EmailSearchUser';
import { splitUserData } from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import { enrollUserTenant } from '@shared-lib-v2/MapUser/MapService';
import Header from '../components/Header';
import BackHeader from '../components/youthNet/BackHeader';
import withRole from '../components/withRole';
import Loader from '../components/Loader';
import { showToastMessage } from '../components/Toastify';
import { TENANT_DATA } from '../utils/app.config';
import { RoleId } from '../utils/app.constant';
import { bulkCreateCohortMembers } from '../services/CohortService';
import {
  extractDomainSkillValues,
  getTrainerMappingForm,
  TrainerMappingFormBundle,
} from '../services/trainer/TrainerFormService';
import { TrainerCenter } from '../services/trainer/TrainerCenterService';
import TrainerCenterSelector from '../components/trainer/TrainerCenterSelector';

// Trainer Role Mapping. Modeled on apps/admin-app-repo's Instructor Mapping
// "Map New" wizard (Select User -> role-specific fields -> Center/Batch),
// reusing the same EmailSearchUser + splitUserData + enrollUserTenant +
// bulkCreateCohortMembers pieces that flow already uses — except the
// Trainer's own "Domain + Skill" step replaces Instructor's full profile
// fields (Domain/Skill only, pulled from the real USERS/INSTRUCTOR form —
// see TrainerFormService), and the flow stops at Center: no Batch dropdown,
// selection, filtering, or API call, per the ticket's "No Batch Selection"
// section. Trainer reuses the Instructor role itself (RoleId.TEACHER) —
// there is no separate backend role for it (see MenuDrawer.tsx's own
// `isTrainer = role === Role.TEACHER`).
const UserTrainerPage = () => {
  const { t } = useTranslation();

  const [tenantId, setTenantId] = useState('');
  const [trainerMappingForm, setTrainerMappingForm] =
    useState<TrainerMappingFormBundle | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(true);
  const [formLoadError, setFormLoadError] = useState(false);

  const [step, setStep] = useState<0 | 1>(0);
  const [prefilledState, setPrefilledState] = useState<any>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userPayload, setUserPayload] = useState<any>(null);
  const [domain, setDomain] = useState<string | undefined>(undefined);
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<TrainerCenter | null>(null);
  const [isMapping, setIsMapping] = useState(false);

  useEffect(() => {
    setTenantId(localStorage.getItem('tenantId') || '');
    const loadForm = async () => {
      setIsFormLoading(true);
      const form = await getTrainerMappingForm();
      if (!form) {
        setFormLoadError(true);
      } else {
        setTrainerMappingForm(form);
      }
      setIsFormLoading(false);
    };
    loadForm();
  }, []);

  const resetWizard = () => {
    setStep(0);
    setPrefilledState({});
    setSelectedUserId(null);
    setUserPayload(null);
    setDomain(undefined);
    setSkills([]);
    setSelectedCenter(null);
  };

  const handleUserDetails = (payload: any) => {
    const { domain: selectedDomain, skills: selectedSkills } =
      extractDomainSkillValues(payload?.customFields);
    if (!selectedDomain || selectedSkills.length === 0) {
      showToastMessage(
        t(
          'TRAINER_MAPPING.SELECT_DOMAIN_AND_SKILL',
          'Please select a Domain and at least one Skill'
        ),
        'error'
      );
      return;
    }
    setUserPayload(payload);
    setDomain(selectedDomain);
    setSkills(selectedSkills);
    setStep(1);
  };

  const handleConfirmMapping = async () => {
    if (!selectedUserId || !selectedCenter || !userPayload || isMapping) return;
    setIsMapping(true);
    try {
      const { userData, customFields } = splitUserData(userPayload);
      delete userData.email;

      const enrollResponse = await enrollUserTenant({
        userId: selectedUserId,
        tenantId,
        roleId: RoleId.TEACHER,
        customField: customFields,
        userData,
      });

      if (enrollResponse && enrollResponse?.params?.err) {
        showToastMessage(
          enrollResponse?.params?.errmsg ||
            t('TRAINER_MAPPING.MAP_FAILED', 'Could not map Trainer'),
          'error'
        );
        return;
      }

      const bulkResponse = await bulkCreateCohortMembers({
        userId: [selectedUserId],
        cohortId: [selectedCenter.cohortId],
      });

      const isBulkSuccess =
        bulkResponse?.responseCode === 201 ||
        bulkResponse?.data?.responseCode === 201 ||
        bulkResponse?.status === 201;

      if (!isBulkSuccess) {
        showToastMessage(
          bulkResponse?.params?.errmsg ||
            t('TRAINER_MAPPING.MAP_FAILED', 'Could not map Trainer to this Center'),
          'error'
        );
        return;
      }

      showToastMessage(
        t('TRAINER_MAPPING.MAP_SUCCESS', 'Trainer mapped successfully'),
        'success'
      );
      resetWizard();
    } catch (error) {
      console.error('Error mapping Trainer:', error);
      showToastMessage(
        t('TRAINER_MAPPING.MAP_FAILED', 'Could not map Trainer'),
        'error'
      );
    } finally {
      setIsMapping(false);
    }
  };

  return (
    <>
      <Box>
        <Header />
      </Box>
      <Box ml={2}>
        <BackHeader
          headingOne={t('TRAINER_MAPPING.PAGE_TITLE', 'Trainer Role Mapping')}
          headingTwo={t(
            'TRAINER_MAPPING.PAGE_SUBTITLE',
            'Select a user, then Domain and Skill, to map them as a Trainer at a matching Center'
          )}
          showBackButton={step === 1}
          onBackClick={() => setStep(0)}
        />
      </Box>

      <Box
        sx={{
          border: '1px solid #eee',
          borderRadius: 2,
          p: 2,
          mx: 2,
          mb: 4,
        }}
      >
        {isFormLoading ? (
          <Loader showBackdrop={false} loadingText={t('COMMON.LOADING')} />
        ) : formLoadError || !trainerMappingForm ? (
          <Typography color="error">
            {t(
              'TRAINER_MAPPING.FORM_LOAD_FAILED',
              'Could not load the Trainer Mapping form. Please try again later.'
            )}
          </Typography>
        ) : step === 0 ? (
          <>
            <EmailSearchUser
              onUserSelected={setSelectedUserId}
              onUserDetails={handleUserDetails}
              schema={trainerMappingForm.schema}
              uiSchema={trainerMappingForm.uiSchema}
              prefilledState={prefilledState}
              onPrefilledStateChange={setPrefilledState}
              roleId={RoleId.TEACHER}
              tenantId={tenantId}
              type="trainer"
            />
            {!!selectedUserId && (
              <Box mt={2}>
                <Button
                  variant="contained"
                  color="primary"
                  form="dynamic-form-id"
                  type="submit"
                >
                  {t('COMMON.NEXT')}
                </Button>
              </Box>
            )}
          </>
        ) : (
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography variant="body1">
              {t(
                'TRAINER_MAPPING.MATCHING_CENTERS_LABEL',
                'Centers matching {{domain}} / {{skills}}',
                { domain, skills: skills.join(', ') }
              )}
            </Typography>
            <TrainerCenterSelector
              domain={domain}
              skills={skills}
              value={selectedCenter}
              onChange={setSelectedCenter}
            />
            <Box>
              <Button
                variant="contained"
                color="primary"
                disabled={!selectedCenter || isMapping}
                onClick={handleConfirmMapping}
              >
                {isMapping ? (
                  <CircularProgress size={20} />
                ) : (
                  t('TRAINER_MAPPING.MAP_AS_TRAINER', 'Map as Trainer')
                )}
              </Button>
            </Box>
          </Box>
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

export default withRole(TENANT_DATA.YOUTHNET)(UserTrainerPage);
