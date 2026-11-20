import {
  Box,
  Checkbox,
  FormControlLabel,
  Typography,
} from '@mui/material';
import { useTranslation } from '@shared-lib';

// Pathways in Education Consent Form and Privacy Notice, one per age group
const ADULT_CONSENT_FORM_URL = '/files/pathways_consent_form_above_18.pdf';
const MINOR_CONSENT_FORM_URL = '/files/pathways_consent_form_below_18.pdf';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  // Under 18: consent is given by the parent/legal guardian on the child's behalf
  isMinor: boolean;
};

// Personal data consent shown below the form, styled like the consent on the
// registration Create Account step.
const ConsentCheckbox = ({ checked, onChange, isMinor }: Props) => {
  const { t } = useTranslation();
  const beforeLinkText = t(
    isMinor
      ? 'LEARNER_APP.EDIT_PROFILE.PERSONAL_DATA_CONSENT_MINOR_BEFORE_LINK'
      : 'LEARNER_APP.EDIT_PROFILE.PERSONAL_DATA_CONSENT_ADULT_BEFORE_LINK'
  );
  // Most languages finish the sentence after the link, so each age group has its own tail
  const afterLinkText = t(
    isMinor
      ? 'LEARNER_APP.EDIT_PROFILE.PERSONAL_DATA_CONSENT_MINOR_AFTER_LINK'
      : 'LEARNER_APP.EDIT_PROFILE.PERSONAL_DATA_CONSENT_ADULT_AFTER_LINK'
  );
  const consentFormUrl = isMinor
    ? MINOR_CONSENT_FORM_URL
    : ADULT_CONSENT_FORM_URL;

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
            {beforeLinkText}{' '}
            <Typography
              component="span"
              fontWeight="bold"
              color="#0071E3"
              onClick={(e) => {
                // Opening the PDF shouldn't toggle the checkbox
                e.preventDefault();
                window.open(consentFormUrl, '_blank', 'noopener,noreferrer');
              }}
              sx={{ cursor: 'pointer' }}
            >
              {t('LEARNER_APP.EDIT_PROFILE.CONSENT_FORM_AND_PRIVACY_NOTICE')}
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
