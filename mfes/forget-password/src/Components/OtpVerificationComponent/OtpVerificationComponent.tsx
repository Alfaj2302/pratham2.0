'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Stack } from '@mui/material';
import useOtpAutofill from '@shared-lib-v2/hooks/useOtpAutofill';

const OtpVerificationComponent = ({
  maskedNumber,
  onResend,
  otp,
  setOtp,
}: {
  maskedNumber?: string;
  onResend?: () => void;
  otp: string[];
  setOtp: any;
}) => {
  // const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const [timer, setTimer] = useState(120);

  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Typing, paste/autofill distribution and WebOTP (see hook for the
  // required SMS format: last line `@<site-domain> #<otp>`).
  const { handleChange, handlePaste, handleKeyDown, restartWebOtp } =
    useOtpAutofill(otp, setOtp);

  const handleResend = () => {
    setTimer(120);
    setOtp(['', '', '', '']);
    // Abort the pending WebOTP request and arm a fresh one for the new SMS.
    restartWebOtp();
    onResend?.();
  };

  return (
    <Box textAlign="center" p={4}>
      <Typography mb={2}>
        We’ve sent an OTP to verify your number <strong>{maskedNumber}</strong>
      </Typography>

      <Stack direction="row" justifyContent="center" spacing={2} mb={2}>
        {otp.map((digit, idx) => (
          <TextField
            key={idx}
            id={`otp-${idx}`}
            value={digit}
            onChange={(e) => handleChange(idx, e.target.value)}
            onPaste={(e) => handlePaste(idx, e)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            autoComplete="one-time-code"
            inputProps={{
              // No maxLength: a full autofilled/pasted code must reach
              // onChange; the hook enforces one digit per box.
              inputMode: 'numeric',
              pattern: '[0-9]*',
              style: { textAlign: 'center', fontSize: '20px' },
            }}
            sx={{ width: 50 }}
          />
        ))}
      </Stack>

      <Typography
        variant="body2"
        color="primary"
        sx={{ cursor: timer === 0 ? 'pointer' : 'default' }}
        onClick={timer === 0 ? handleResend : undefined}
      >
        {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
      </Typography>
    </Box>
  );
};
export default OtpVerificationComponent;
