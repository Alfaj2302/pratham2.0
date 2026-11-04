import {
  Box,
  Checkbox,
  FormControlLabel,
  Typography,
} from '@mui/material';
import { useTranslation } from '@shared-lib';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  // Consent Form cum Privacy Notice PDF. The link text stays plain until a URL is configured.
  consentFormUrl?: string;
};

// Personal data consent shown below the form, styled like the consent on the
// registration Create Account step.
const ConsentCheckbox = ({
  checked,
  onChange,
  consentFormUrl,
}: Props) => {
  const { t } = useTranslation();
  const afterLinkText = t('LEARNER_APP.EDIT_PROFILE.PERSONAL_DATA_CONSENT_AFTER_LINK');

  const handleConsentForm = () => {
    if (consentFormUrl) {
      window.open(consentFormUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Box mt={2}>
      <FormControlLabel
        control={
          <Checkbox
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            sx={{ alignSelf: 'flex-start', mt: -1 }}
          />
        }
        label={
          <Typography variant="h3">
            {t('LEARNER_APP.EDIT_PROFILE.PERSONAL_DATA_CONSENT_BEFORE_LINK')}{' '}
            <Typography
              component="span"
              fontWeight="bold"
              color="#0071E3"
              onClick={(e) => {
                // Opening the PDF shouldn't toggle the checkbox
                e.preventDefault();
                handleConsentForm();
              }}
              sx={{ cursor: consentFormUrl ? 'pointer' : 'default' }}
            >
              {t('LEARNER_APP.EDIT_PROFILE.CONSENT_FORM')}
            </Typography>
            {/^[.,।]/.test(afterLinkText) ? '' : ' '}
            {afterLinkText}
          </Typography>
        }
        sx={{ alignItems: 'flex-start', mr: 0 }}
      />
    </Box>
  );
};

export default ConsentCheckbox;
