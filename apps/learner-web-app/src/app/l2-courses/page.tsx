'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Box, Skeleton, Tab, Tabs } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@shared-lib';
import {
  AssessmentCategoryList,
  L2CourseList,
  VtAssessmentShell,
} from '@learner/components/VtAssessment';
import type { VtBatch } from '@learner/utils/helpers/vtBatchHelper';

// Tab order is also the URL contract (?tab=courses|assessment), so the learner
// can be linked straight to either one and a refresh keeps the tab.
const TAB_KEYS = ['courses', 'assessment'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const L2CoursesPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <VtAssessmentShell title={t('LEARNER_APP.VT_ASSESSMENT.L2_COURSES')}>
      {({ batch, assessmentIds, batchEnded }) => (
        <Suspense
          fallback={<Skeleton variant="rounded" height={320} sx={{ borderRadius: '8px' }} />}
        >
          <L2CoursesTabs
            batch={batch}
            assessmentIds={assessmentIds}
            batchEnded={batchEnded}
          />
        </Suspense>
      )}
    </VtAssessmentShell>
  );
};

const L2CoursesTabs: React.FC<{
  batch: VtBatch | null;
  assessmentIds: string[];
  batchEnded: boolean;
}> = ({ batch, assessmentIds, batchEnded }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab') as TabKey | null;
  const activeIndex = Math.max(
    0,
    TAB_KEYS.indexOf((tabParam ?? 'courses') as TabKey)
  );

  // Both panels stay mounted once visited so switching back does not refetch.
  const [visited, setVisited] = useState<Set<number>>(
    () => new Set([activeIndex])
  );
  useEffect(() => {
    setVisited((previous) =>
      previous.has(activeIndex) ? previous : new Set(previous).add(activeIndex)
    );
  }, [activeIndex]);

  const handleChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      router.replace(`/l2-courses?tab=${TAB_KEYS[newValue]}`, { scroll: false });
    },
    [router]
  );

  const tabs = [
    { key: 'courses', label: t('LEARNER_APP.VT_ASSESSMENT.TAB_COURSES') },
    { key: 'assessment', label: t('LEARNER_APP.VT_ASSESSMENT.TAB_ASSESSMENT') },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeIndex}
          onChange={handleChange}
          aria-label="l2 courses tabs"
          sx={{
            // Mirrors the Courses/Content tab spacing used across the content
            // pages (mfes/content ContentTabs), so this reads as the same control.
            '@media (min-width: 1200px)': {
              '& .MuiTab-root': { marginRight: '160px', minWidth: 'auto' },
              '& .MuiTab-root:last-child': { marginRight: 0 },
              '& .MuiTabs-indicator': { height: '3px', transform: 'none' },
            },
            '@media (min-width: 768px) and (max-width: 1199px)': {
              '& .MuiTab-root': { marginRight: '60px', minWidth: 'auto' },
              '& .MuiTab-root:last-child': { marginRight: 0 },
              '& .MuiTabs-indicator': { height: '3px', transform: 'none' },
            },
            '@media (max-width: 767px)': {
              '& .MuiTab-root': { minWidth: 'auto' },
            },
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.key}
              label={tab.label}
              id={`l2-tab-${index}`}
              aria-controls={`l2-tabpanel-${index}`}
            />
          ))}
        </Tabs>
      </Box>

      {tabs.map((tab, index) => (
        <Box
          key={tab.key}
          role="tabpanel"
          hidden={activeIndex !== index}
          id={`l2-tabpanel-${index}`}
          aria-labelledby={`l2-tab-${index}`}
          sx={{ pt: 2 }}
        >
          {visited.has(index) &&
            (tab.key === 'courses' ? (
              <L2CourseList batch={batch} />
            ) : (
              <AssessmentCategoryList
                assessmentIds={assessmentIds}
                batchEnded={batchEnded}
              />
            ))}
        </Box>
      ))}
    </Box>
  );
};

export default L2CoursesPage;
