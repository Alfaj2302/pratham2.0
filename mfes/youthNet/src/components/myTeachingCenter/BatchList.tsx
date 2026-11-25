import React from 'react';
import { Box, Grid } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Image from 'next/image';
import { useDirection } from '../../hooks/useDirection';
import building from '../../assets/images/apartment.png';
import { MyTeachingCenterBatch } from '../../utils/Interfaces';

interface BatchListProps {
  batches: MyTeachingCenterBatch[];
  router: any;
  theme: any;
  onBatchClick: (batch: MyTeachingCenterBatch) => void;
}

// Ported as-is from mfes/scp-teacher-repo/src/components/BatchList.tsx (the
// /scp-teacher-repo/centers?tab=1 design) — same layout/colors/icon, no new
// visual elements. The only addition is the Batch Date line under the name
// (spec item 4); nothing else was changed from the original design.
const BatchList: React.FC<BatchListProps> = ({ batches, router, theme, onBatchClick }) => {
  const { isRTL } = useDirection();

  const withBasePath = (path: string) => `${router.basePath}${path}`;

  return (
    <Box
      sx={{
        borderRadius: '16px',
        p: 2,
        background: theme.palette.action.selected,
        m: 2,
      }}
    >
      <Grid container spacing={2}>
        {batches.map((batch) => (
          <Grid item xs={12} sm={12} md={6} lg={4} key={batch.cohortId}>
            <Box
              component="a"
              href={withBasePath(`/my-teaching-center/${batch.cohortId}`)}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
                  return;
                }
                e.preventDefault();
                onBatchClick(batch);
              }}
              sx={{
                cursor: 'pointer',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  gap: '10px',
                  background: '#fff',
                  minHeight: '56px',
                  borderRadius: '8px',
                }}
                mt={1}
              >
                <Box
                  sx={{
                    width: '56px',
                    display: 'flex',
                    background: theme.palette.primary.light,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderTopLeftRadius: '8px',
                    borderBottomLeftRadius: '8px',
                  }}
                >
                  <Image src={building} alt="batch" />
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    padding: '8px 10px',
                  }}
                >
                  <Box>
                    <Box
                      sx={{
                        fontSize: '16px',
                        fontWeight: '400',
                        color: theme.palette.warning['300'],
                      }}
                    >
                      {batch.name.charAt(0).toUpperCase() + batch.name.slice(1)}
                    </Box>
                    {batch.startDate && batch.endDate && (
                      <Box
                        sx={{
                          fontSize: '12px',
                          fontWeight: '400',
                          color: theme.palette.warning['A200'],
                        }}
                      >
                        {batch.startDate} - {batch.endDate}
                      </Box>
                    )}
                  </Box>
                  <ChevronRightIcon
                    sx={{
                      color: theme.palette.warning['A200'],
                      transform: isRTL ? ' rotate(180deg)' : 'unset',
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default BatchList;
