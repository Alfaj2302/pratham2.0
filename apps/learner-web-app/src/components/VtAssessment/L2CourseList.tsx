'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Skeleton, Typography } from '@mui/material';
import { useTranslation } from '@shared-lib';
import LearnerCourse from '@learner/components/Content/LearnerCourse';
import { getTenantInfo } from '@learner/utils/API/ProgramService';
import { VtBatch, extractBatchSkills } from '@learner/utils/helpers/vtBatchHelper';

/**
 * Courses tab of /l2-courses: the Vocational Training catalogue narrowed to the
 * skill the learner's batch is training for.
 *
 * The batch's SKILLS custom field holds `skills` terms from the pos-framework
 * (domain > subDomain > subject > skills), and courses index the same level as
 * `se_skills` — so the batch value filters the catalogue directly, with no
 * mapping in between. The program filter comes from the tenant's contentFilter,
 * the same source the L1 Courses page uses.
 */
const L2CourseList: React.FC<{ batch: VtBatch | null }> = ({ batch }) => {
  const { t } = useTranslation();
  const [programFilter, setProgramFilter] = useState<string[] | null>(null);

  const skills = extractBatchSkills(batch);
  const skillsKey = skills.join(',');
  const programKey = (programFilter ?? []).join(',');

  // LearnerCourse is memo()'d and re-runs its content search whenever its props
  // change identity, so this config has to be referentially stable across the
  // 3-second eligibility poll — keyed on the values, not the objects.
  const contentConfig = useMemo(
    () => ({
      pageName: 'L2_Content',
      // Subject (se_subjects) is deliberately not offered: the list is already
      // scoped to the batch's single skill, so a subject facet can only ever
      // narrow it to nothing or leave it unchanged.
      onlyFields: ['contentLanguage'],
      isOpenColapsed: ['contentLanguage'],
      // A single tab keeps the content MFE from drawing its own tab bar on
      // top of the Courses / Assessment tabs above it.
      contentTabs: ['courses'],
      // Own storage key: LearnerCourse otherwise persists filter state under a
      // single shared `learnerCourseFilters`, so a subject picked on L1 Courses
      // (e.g. "Beauty") would carry into this tab and silently narrow it — with
      // no Subject facet here to clear it again.
      filterStorageKey: 'l2CourseFilters',
      staticFilter: {
        ...(programKey ? { program: programKey.split(',') } : {}),
        se_skills: skillsKey ? skillsKey.split(',') : [],
      },
    }),
    [programKey, skillsKey]
  );

  useEffect(() => {
    let cancelled = false;

    const loadProgram = async () => {
      try {
        const response = await getTenantInfo();
        const tenant = response?.result?.find(
          (program: { name?: string }) =>
            program?.name === localStorage.getItem('userProgram')
        );
        const program = tenant?.contentFilter?.program;
        if (cancelled) return;
        setProgramFilter(
          Array.isArray(program) ? program : program ? [program] : []
        );
      } catch (error) {
        console.error('L2CourseList: failed to resolve program filter', error);
        if (!cancelled) setProgramFilter([]);
      }
    };

    loadProgram();
    return () => {
      cancelled = true;
    };
  }, []);

  if (programFilter === null) {
    return <Skeleton variant="rounded" height={320} sx={{ borderRadius: '8px' }} />;
  }

  // Without a SKILLS value there is nothing to scope the catalogue to, and
  // showing every VT course here would misrepresent it as the batch's syllabus.
  if (skills.length === 0) {
    return (
      <Typography sx={{ color: '#7C766F', py: 4, textAlign: 'center' }}>
        {t('LEARNER_APP.VT_ASSESSMENT.NO_COURSES_FOUND')}
      </Typography>
    );
  }

  return (
    <Box>
      <LearnerCourse _content={contentConfig} />
    </Box>
  );
};

export default L2CourseList;
