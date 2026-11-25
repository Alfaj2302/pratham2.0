import CloseSharpIcon from '@mui/icons-material/CloseSharp';
import {
  Box,
  Button,
  Divider,
  Modal,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React, { ReactNode } from 'react';
import { SxProps, Theme } from '@mui/material/styles';

interface SimpleModalProps {
  secondaryActionHandler?: () => void;
  primaryActionHandler?: () => void;
  secondaryText?: string;
  primaryText?: string;
  showFooter?: boolean;
  footer?: ReactNode;
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  modalTitle: string;
  isFullwidth?: boolean;
  modalWidth?: string;
  id?: any;
  primaryDisabled?: boolean;
}

const SimpleModal: React.FC<SimpleModalProps> = ({
  open,
  onClose,
  primaryText,
  secondaryText,
  showFooter = true,
  primaryActionHandler,
  secondaryActionHandler,
  footer,
  children,
  modalTitle,
  isFullwidth = true,
  modalWidth = '40%',
  id = '',
  primaryDisabled = false,
}) => {
  const theme = useTheme<any>();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));

  const modalStyle: SxProps<Theme> = {
    display: 'flex',
    flexDirection: 'column',
    position: isFullwidth ? 'fixed' : 'absolute',
    top: isFullwidth ? 0 : '50%',
    left: isFullwidth ? 0 : '50%',
    transform: isFullwidth ? 'none' : 'translate(-50%, -50%)',
    width: isFullwidth ? '100vw' : modalWidth,
    maxWidth: isFullwidth ? '100vw' : modalWidth,
    height: isFullwidth ? '100vh' : 'auto',
    maxHeight: isFullwidth ? '100vh' : '80vh',
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: isFullwidth ? 0 : '8px',
    boxShadow:
      'rgba(0, 0, 0, 0.2) 0px 3px 5px -1px, rgba(0, 0, 0, 0.14) 0px 5px 8px 0px, rgba(0, 0, 0, 0.12) 0px 1px 14px 0px',
    overflow: 'hidden',
  };

  const titleStyle = isFullwidth
    ? {
        position: 'sticky' as const,
        top: 0,
        backgroundColor: '#fff',
        padding: theme.spacing(2),
        zIndex: 9999,
        borderBottom: `1px solid ${theme.palette.divider}`,
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
      }
    : {
        position: 'sticky' as const,
        top: '0',
        backgroundColor: '#fff',
        padding: theme.spacing(2),
        zIndex: 9999,
        borderBottom: `1px solid ${theme.palette.divider}`,
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
      };

  const contentStyle = isFullwidth
    ? {
        flex: 1,
        overflowY: 'auto' as const,
        padding: theme.spacing(2),
      }
    : {
        flex: 1,
        overflowY: 'auto' as const,
        padding: theme.spacing(2),
      };

  const footerStyle = isFullwidth
    ? {
        padding: theme.spacing(2),
        borderTop: `1px solid ${theme.palette.divider}`,
        position: 'sticky' as const,
        bottom: 0,
        backgroundColor: '#fff',
        borderBottomLeftRadius: '8px',
        borderBottomRightRadius: '8px',
      }
    : {
        padding: theme.spacing(2),
        borderTop: `1px solid ${theme.palette.divider}`,
      };

  return (
    <Modal
      open={open}
      onClose={(event, reason) => {
        if (reason !== 'backdropClick') {
          onClose();
        }
      }}
      aria-labelledby="child-modal-title"
      aria-describedby="child-modal-description"
    >
      <Box sx={modalStyle}>
        <Box display="flex" justifyContent="space-between" sx={titleStyle}>
          <Typography
            variant="h2"
            sx={{ color: theme.palette.warning.A200 }}
            component="h2"
          >
            {modalTitle}
          </Typography>
          <CloseSharpIcon
            sx={{ cursor: 'pointer' }}
            onClick={onClose}
            aria-label="Close"
          />
        </Box>
        <Divider />
        <Box sx={contentStyle}>{children}</Box>
        <Divider />
        {showFooter &&
          (footer ? (
            <Box sx={footerStyle}>{footer}</Box>
          ) : (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              sx={footerStyle}
              gap={'10px'}
            >
              {primaryText && (
                <Button
                  variant="contained"
                  color="primary"
                  sx={{
                    '&.Mui-disabled': {
                      backgroundColor: theme?.palette?.primary?.main,
                    },
                    padding: theme.spacing(1),
                    fontWeight: '500',
                    width: '100%',
                  }}
                  onClick={primaryActionHandler}
                  form={id}
                  type="submit"
                  disabled={primaryDisabled}
                >
                  {primaryText}
                </Button>
              )}
              {secondaryText && (
                <Button
                  variant="contained"
                  color="primary"
                  sx={{
                    '&.Mui-disabled': {
                      backgroundColor: theme?.palette?.primary?.main,
                    },
                    minWidth: '84px',
                    height: '2.5rem',
                    padding: theme.spacing(1),
                    fontWeight: '500',
                    width: '100%',
                  }}
                  onClick={secondaryActionHandler}
                >
                  {secondaryText}
                </Button>
              )}
            </Box>
          ))}
      </Box>
    </Modal>
  );
};

export default SimpleModal;
