import * as React from 'react';
import { Box, Drawer, Divider, Typography, IconButton } from '@mui/material';
import CloseSharpIcon from '@mui/icons-material/CloseSharp';
import { useTheme } from '@mui/material/styles';

export interface CommonSidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: number | string;
}

// Generic right-anchored content panel: header (title + close) + scrollable
// body + sticky footer. Distinct from `CommonDrawer` (that one is a left-side
// nav-item list) — this is for arbitrary content/forms, e.g. a "review and
// edit this record" panel.
export const CommonSidePanel: React.FC<CommonSidePanelProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  width = 420,
}) => {
  const theme = useTheme<any>();

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box
        sx={{
          width: { xs: '100vw', sm: width },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {title && (
          <>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              sx={{ p: 2 }}
            >
              <Typography variant="h6" sx={{ color: theme.palette.warning?.A200 }}>
                {title}
              </Typography>
              <IconButton size="small" onClick={onClose} aria-label="Close">
                <CloseSharpIcon fontSize="small" />
              </IconButton>
            </Box>
            <Divider />
          </>
        )}

        <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>{children}</Box>

        {footer && (
          <>
            <Divider />
            <Box sx={{ p: 2 }}>{footer}</Box>
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default CommonSidePanel;
