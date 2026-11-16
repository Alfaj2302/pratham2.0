import {
  Box,
  Button,
  Divider,
  Modal,
  Typography,
  useMediaQuery,
} from '@mui/material';
import React, { ReactNode } from 'react';

import CloseSharpIcon from '@mui/icons-material/CloseSharp';
import { useTheme } from '@mui/material/styles';

export interface SimpleModalProps {
  secondaryActionHandler?: () => void;
  primaryActionHandler?: () => void;
  secondaryText?: string;
  primaryText?: string;
  primaryDisabled?: boolean;
  showFooter?: boolean;
  children?: ReactNode;
  open: boolean;
  onClose: () => void;
  modalTitle: string;
  handleNext?: any;
  // The primary button is type="submit" form={id}: pass a form's id (e.g.
  // DynamicForm's default "dynamic-form-id") to make it submit that form.
  id?: string;
}

const modalStyles = (theme: any) => ({
  width: '85%',
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  backgroundColor: theme.palette.warning?.A400,
  borderRadius: '8px',
  zIndex: '9999',
  outline: 'none',
  boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
  '@media (min-width: 600px)': {
    width: '450px',
  },
});

export const SimpleModal: React.FC<SimpleModalProps> = ({
  open,
  onClose,
  primaryText,
  secondaryText,
  primaryDisabled = false,
  showFooter = true,
  primaryActionHandler,
  secondaryActionHandler,
  children,
  modalTitle,
  handleNext,
  id = '',
}) => {
  const theme = useTheme<any>();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const titleStyle = {
    backgroundColor: theme.palette.warning?.A400,
    padding: theme.spacing(2),
    zIndex: 1,
    borderRadius: '12px 12px 0 0',
  };

  const footerStyle = {
    padding: '8px 16px',
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: isMobile ? 'center' : 'flex-end',
    zIndex: 1,
    borderRadius: '0 0 12px 12px',
    backgroundColor: theme.palette.warning?.A400,
  };

  const contentStyle = {
    flexGrow: 1,
    overflowY: 'auto',
    padding: '16px',
    maxHeight: '60vh',
  };

  const buttonStyle = {
    width: '100%',
    margin: isMobile ? '8px 0' : '10px',
  };

  return (
    <Modal
      open={open}
      onClose={(event, reason) => {
        if (reason && reason === 'backdropClick') return;
        onClose();
      }}
      aria-labelledby="child-modal-title"
      aria-describedby="child-modal-description"
    >
      <Box sx={modalStyles}>
        {/* Header */}
        <Box display={'flex'} justifyContent={'space-between'} sx={titleStyle}>
          <Typography
            variant="h3"
            sx={{ color: theme.palette.warning?.A200 }}
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

        {/* Scrollable Content */}
        <Box sx={contentStyle}>{children}</Box>

        <Divider />

        {/* Footer */}
        {showFooter && (
          <Box sx={footerStyle}>
            {secondaryText && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={secondaryActionHandler}
                className="one-line-text"
                sx={{
                  ...buttonStyle,
                  display: '-webkit-box !important',
                }}
              >
                {secondaryText}
              </Button>
            )}
            {primaryText && (
              <Button
                variant="contained"
                color="primary"
                sx={buttonStyle}
                onClick={primaryActionHandler || handleNext}
                className="one-line-text"
                form={id}
                type="submit"
                disabled={primaryDisabled}
              >
                {primaryText}
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Modal>
  );
};

export default SimpleModal;
