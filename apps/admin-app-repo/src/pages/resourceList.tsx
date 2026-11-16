import React, { useEffect, useState } from 'react';
import { Grid, Typography, Box, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // Import the back arrow icon
import ResourceCard from '../components/ResourceCard';
import taxonomyStore from '@/store/tanonomyStore';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ResourceType } from '@/utils/app.constant';
import { useTranslation } from 'next-i18next';
import router from 'next/router';
import { fetchBulkContents } from '@/services/PlayerService';

const ResourceList = () => {
  const [learnersPreReq, setLearnersPreReq] = useState<any[]>([]);
  const [learnersPostReq, setLearnersPostReq] = useState<any[]>([]);
  const [facilitatorsPreReq, setFacilitatorsPreReq] = useState<any[]>([]);
  const [duringCourse, setDuringCourse] = useState<any[]>([]);

  const tstore = taxonomyStore();
  const { t } = useTranslation();
function reorderByIdentifiers(dataArray: any, idOrder: any) {
  const dataCopy = [...dataArray]; // Clone to avoid mutating original array
  return idOrder.map((id: any) => {
    const index = dataCopy.findIndex(item => item.identifier === id);
    if (index !== -1) {
      return dataCopy.splice(index, 1)[0]; // Remove and return matched item
    }
    return null; // or throw error or skip if not found
  }).filter(Boolean); // Remove nulls if any
}

  useEffect(() => {
    const fetchData = async () => {
      const resources = tstore.resources;

      const fetchedLearningResources = resources?.learningResources || [];
      if (fetchedLearningResources?.length) {
        fetchedLearningResources.forEach((resource: { id: string }) => {
          resource.id = resource.id.toLowerCase();
        });

        let contents = await fetchBulkContents(
          fetchedLearningResources?.map((item: any) => item.id)
        );
        const hasDuplicateIds = fetchedLearningResources.some(
          (resource: { id: any }, index: any, array: any[]) => {
            return array.findIndex((r) => r.id === resource.id) !== index;
          }
        );

        if (hasDuplicateIds) {
          contents = contents?.flatMap((item: any) => {
            const matchedResources = fetchedLearningResources?.filter(
              (resource: any) => resource.id === item.identifier
            );

            // Create a copy of the item for each matched type
            return (
              matchedResources?.map((resource: any) => ({
                ...item,
                type: resource.type,
              })) || []
            );
          });
        } else {
          contents = contents?.map((item: any) => {
            const contentType = fetchedLearningResources?.find(
              (resource: any) => resource.id === item.identifier
            )?.type;

            return {
              ...item,
              type: contentType,
            };
          });
        }

        // console.log('contents!!!!', contents);
       console.log('fetchedLearningResources!!!!', fetchedLearningResources);

        let preRequisite = contents?.filter(
          (item: any) => item.type === ResourceType.LEARNER_PRE_REQUISITE
        );
        let postRequisite = contents?.filter(
          (item: any) => item.type === ResourceType.LEARNER_POST_REQUISITE
        );
        let facilitatorsRequisite = contents?.filter(
          (item: any) => item.type === ResourceType.FACILITATOR_REQUISITE
        );
        let duringCourse = contents?.filter(
          (item: any) => item.type === ResourceType.DURING_COURSE
        );

const groupedIds: any = {};

fetchedLearningResources.forEach((item: any) => {
  const type = item.type;
  if (!groupedIds[type]) {
    groupedIds[type] = [];
  }
  groupedIds[type].push(item.id); // Keep all IDs including duplicates
});
// Convert Sets to Arrays (if needed)
const result: any = {};
for (const type in groupedIds) {
  result[type] = Array.from(groupedIds[type]);
}
if(result?.prerequisite)
{
    preRequisite = reorderByIdentifiers(preRequisite, result?.prerequisite);

}
if(result?.facilitatorsRequisite)
{
   facilitatorsRequisite= reorderByIdentifiers(facilitatorsRequisite, result?.facilitatorsRequisite);
}
if(result?.postRequisite)
{
   postRequisite = reorderByIdentifiers(postRequisite, result?.postRequisite);
}
if(result?.duringCourse)
{
   duringCourse = reorderByIdentifiers(duringCourse, result?.duringCourse);
}
console.log('preRequisiteIdsresult',result);
console.log('preRequisite', preRequisite);
console.log('preRequisitefetchedLearningResources', fetchedLearningResources);

        setLearnersPreReq(preRequisite);
        setLearnersPostReq(postRequisite);
        setFacilitatorsPreReq(facilitatorsRequisite);
        setDuringCourse(duringCourse);
      }
    };

    fetchData();
  }, [tstore.resources]);

  const handleBack = () => {
    router.back();
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h2" mb={2}>
        {tstore.taxonomyType}
      </Typography>
      <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
        <IconButton sx={{ mr: 1 }} onClick={handleBack}>
          <ArrowBackIcon />
        </IconButton>

        {/* Course Name */}
        <Typography variant="h2" fontWeight={600}>
          {tstore?.resources?.name}
        </Typography>
      </Box>

      <Box sx={{ border: '1px solid #DDDDDD', borderRadius: '10px' }} p={2}>
        <Typography variant="h4" fontWeight={500} mb={2}>
          {t('COURSE_PLANNER.LEARNERS_PREREQISITE')}
        </Typography>
        {learnersPreReq?.length > 0 ? (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {learnersPreReq.map((item, index) => (
              <Grid item xs={12} md={4} lg={3} key={index}>
                <ResourceCard
                  title={item.name}
                  // type={item.app}
                  resource={item.contentType}
                  appIcon={item?.appIcon}
                  identifier={item.identifier}
                  mimeType={item.mimeType}
                  hideBackButton
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            {t('COURSE_PLANNER.NO_DATA_PRE')}
          </Typography>
        )}
<Typography variant="h4" fontWeight={500} mb={2}>
          {t('COURSE_PLANNER.DURING_COURSE')}
        </Typography>
        {duringCourse?.length > 0 ? (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {duringCourse.map((item, index) => (
              <Grid xs={12} md={4} lg={3} item key={index}>
                <ResourceCard
                  title={item.name}
                  // type={item.app}
                  resource={item.contentType}
                  appIcon={item?.appIcon}
                  identifier={item.identifier}
                  mimeType={item.mimeType}
                  hideBackButton
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            {t('COURSE_PLANNER.NO_DATA_POST')}
          </Typography>
        )}
        <Typography variant="h4" fontWeight={500} mb={2}>
          {t('COURSE_PLANNER.LEARNERS_POSTREQISITE')}
        </Typography>
        {learnersPostReq?.length > 0 ? (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {learnersPostReq.map((item, index) => (
              <Grid xs={12} md={4} lg={3} item key={index}>
                <ResourceCard
                  title={item.name}
                  // type={item.app}
                  resource={item.contentType}
                  appIcon={item?.appIcon}
                  identifier={item.identifier}
                  mimeType={item.mimeType}
                  hideBackButton
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            {t('COURSE_PLANNER.NO_DATA_POST')}
          </Typography>
        )}



        <Typography variant="h4" fontWeight={500} mb={2}>
          {t('COURSE_PLANNER.FACILITATORS')}
        </Typography>
        {facilitatorsPreReq?.length > 0 ? (
          <Grid container spacing={2}>
            {facilitatorsPreReq.map((item, index) => (
              <Grid xs={12} md={4} lg={3} item key={index}>
                <ResourceCard
                  title={item.name}
                  // type={item.app || "Facilitator"}
                  resource={item.contentType}
                  appIcon={item?.appIcon}
                  identifier={item.identifier}
                  mimeType={item.mimeType}
                  hideBackButton
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            {t('COURSE_PLANNER.NO_DATA')}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ResourceList;

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
