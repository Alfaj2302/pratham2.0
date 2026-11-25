import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import CommonModal from '@learner/components/Modal/CommonModal';
import LevelUp from '@learner/components/LTwoContent/LevelUp';
import ResponseRecorded from '@learner/components/LTwoContent/ResponseRecorded';
import { useTranslation } from '@shared-lib';
import {
  fetchUserCoursesWithContent,
  createL2Course,
} from '@learner/utils/API/contentService';
import { checkAuth } from '@shared-lib-v2/utils/AuthService';
import { showToastMessage } from '@learner/components/ToastComponent/Toastify';
import { getUserDetails, updateUser } from '@learner/utils/API/userService';
import { L2_INTEREST_FIELD_ID } from '@learner/utils/app.constant';

export interface TopicProp {
  topic: string;
  courses?: any[];
}

const getCustomFieldValueFromArray = (customFields: any, label: string[]) => {
  const fieldValue = label.reduce((acc, curr) => {
    const field = customFields.find((f: any) => f.label === curr);
    return { ...acc, [curr]: field?.selectedValues?.[0]?.value || '' };
  }, {});
  return JSON.parse(JSON.stringify(fieldValue));
};

const LTwoCourse: React.FC = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [topics, setTopics] = useState<TopicProp[]>([]);
  const [userResponse, setUserResponse] = useState<any>(null);
  const [isInterested, setIsInterested] = useState(false);
  const [selectedTopic, setSelectedTopic] = React.useState<
    TopicProp | undefined
  >(undefined);

  useEffect(() => {
    const fetchTopics = async () => {
      if (checkAuth()) {
        const userId = localStorage.getItem('userId');
        const tenantId = localStorage.getItem('tenantId');
        if (userId && tenantId) {
          try {
            const { result } = await getUserDetails(userId, true);
            const customFieldsJson = getCustomFieldValueFromArray(
              result?.userData?.customFields,
              [
                'MOTHER_NAME',
                'STATE',
                'DISTRICT',
                'BLOCK',
                'VILLAGE',
                'HIGHEST_EDCATIONAL_QUALIFICATION_OR_LAST_PASSED_GRADE',
              ]
            );
            setUserResponse({
              ...(result.userData || {}),
              ...customFieldsJson,
            });
            // The L2_INTERESTED field only appears in customFields once the
            // learner has shown interest, so its presence alone hides the
            // section — its value is not checked.
            const hasInterestField = (result?.userData?.customFields ?? []).some(
              (field: any) =>
                field?.fieldId === L2_INTEREST_FIELD_ID ||
                field?.label === 'L2_INTERESTED'
            );
            setIsInterested(hasInterestField);
            const courses = await fetchUserCoursesWithContent(userId, tenantId);
            setTopics(courses);
          } catch (error) {
            console.error('Error fetching user courses:', error);
            showToastMessage(`Error fetching user courses: ${error}`, 'error');
          }
        }
      }
    };
    fetchTopics();
  }, []);

  // Return null if there are no topics, or the learner has already confirmed
  // interest and isn't currently looking at the post-submit confirmation modal
  if (topics.length === 0 || (isInterested && !isModalOpen)) {
    return null;
  }

  const handleInterestClick = () => {
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      return;
    }
    try {
      // Get user data
      const salesforceUserData = {
        first_name: userResponse?.firstName ?? '',
        middle_name: userResponse?.middleName ?? '',
        last_name: userResponse?.lastName ?? '',
        mother_name: userResponse?.MOTHER_NAME ?? '',
        gender: userResponse?.gender ?? '',
        email_address: userResponse?.email ?? '',
        dob: userResponse?.dob ?? '',
        enrollmentId: userResponse?.enrollmentId ?? '',
        qualification:
          userResponse?.HIGHEST_EDCATIONAL_QUALIFICATION_OR_LAST_PASSED_GRADE ??
          '',
        phone_number: userResponse?.mobile?.toString() ?? '',
        state: userResponse?.STATE ?? '',
        district: userResponse?.DISTRICT ?? '',
        block: userResponse?.BLOCK ?? '',
        village: userResponse?.VILLAGE ?? '',
        blood_group: '',
        userId: userResponse?.userId ?? '',
        courseId: selectedTopic?.courses?.[0]?.courseId ?? '',
        courseName: selectedTopic?.courses?.[0]?.name ?? '',
        topicName: selectedTopic?.topic ?? '',
      };

      // Call createL2Course API (Salesforce)
      await createL2Course(salesforceUserData);

      // Flag interest on the user's profile so the section stays hidden on revisit
      const response = await updateUser(userId, {
        userData: {
          firstName: userResponse?.firstName ?? '',
          lastName: userResponse?.lastName ?? '',
          mobile: userResponse?.mobile ?? '',
          dob: userResponse?.dob ?? '',
          gender: userResponse?.gender ?? '',
        },
        customFields: [
          {
            fieldId: L2_INTEREST_FIELD_ID,
            value: 'yes',
          },
        ],
      });

      if (response?.data?.params?.err !== null) {
        throw new Error(response?.data?.params?.errmsg ?? 'Failed to update interest');
      }

      setIsInterested(true);
      setCount(1);
    } catch (error: any) {
      const errorResponse = error?.response;
      console.error(
        'Error in handleSubmit:',
        errorResponse?.data?.message?.join('') ?? error
      );
      showToastMessage(t('LEARNER_APP.COMMON.REACHOUT_TO_MENTOR'), 'error');
    }
  };

  const handleCloseResponse = () => {
    setIsModalOpen(false);
    setCount(0);
  };

  const handleTopicChange = (event: TopicProp) => {
    setSelectedTopic(event);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setCount(0);
  };

  return (
    <Box
      sx={{
        padding: { md: '48px 56px', xs: '24px 16px' },
        bgcolor: 'white',
      }}
    >
      <Typography
        variant="h1"
        gutterBottom
        sx={{
          color: '#78590C',
          fontSize: { md: '22px', xs: '16px' },
          lineHeight: { md: '26px', xs: '20px' },
        }}
      >
        {t('LEARNER_APP.L_TWO_COURSE.TITLE')}
      </Typography>
      <Box
        sx={{
          gap: { md: 2, xs: 0 },
          width: '100%',
          mb: { md: 2, xs: 0 },
          background: '#F3EDF7',
          padding: { md: '24px 56px', xs: '16px' },
          borderRadius: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          '@media (max-width: 600px)': {
            flexDirection: 'column',
            alignItems: 'center',
          },
        }}
      >
        <Box>
          <Typography
            variant="h1"
            sx={{
              color: '#1F1B13',
              fontSize: { md: '22px', xs: '16px' },
              lineHeight: { md: '26px', xs: '20px' },
            }}
            gutterBottom
          >
            {t('LEARNER_APP.L_TWO_COURSE.DESCRIPTION')}
          </Typography>
          <Typography variant="body1" color="#635E57" gutterBottom>
            {t('LEARNER_APP.L_TWO_COURSE.SUB_DESCRIPTION')}
          </Typography>
        </Box>
        <Button
          sx={{
            minWidth: 'fit-content',
            padding: '10px 55px',
            fontSize: '16px',
            fontWeight: '500',
          }}
          variant="contained"
          color="primary"
          onClick={handleInterestClick}
        >
          {t('LEARNER_APP.L_TWO_COURSE.INTEREST_BUTTON')}
        </Button>
        {count == 0 ? (
          <CommonModal
            handleSubmit={handleSubmit}
            isOpen={isModalOpen}
            onClose={handleClose}
            submitText={t('LEARNER_APP.L_TWO_COURSE.SUBMIT_BUTTON')}
          >
            <LevelUp
              handleTopicChange={handleTopicChange}
              selectedTopic={selectedTopic?.topic ?? ''}
              topics={topics}
            />
          </CommonModal>
        ) : (
          <CommonModal
            handleSubmit={handleCloseResponse}
            isOpen={isModalOpen}
            onClose={handleClose}
            submitText={t('LEARNER_APP.L_TWO_COURSE.OKAY_BUTTON')}
          >
            <ResponseRecorded />
          </CommonModal>
        )}
      </Box>
    </Box>
  );
};

export default React.memo(LTwoCourse);
