'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import Header from '@learner/components/Header/Header';
import ResetPasswordForm from '@learner/components/ResetPasswordForm/ResetPasswordForm';
import SimpleModal from '@learner/components/SimpleModal/SimpleModal';
import { showToastMessage } from '@learner/components/ToastComponent/Toastify';
import { sendOTP, verifyOTP } from '@learner/utils/API/OtPService';
import OtpVerificationComponent from '@learner/components/OtpVerificationComponent/OtpVerificationComponent';
import { maskMobileNumber } from '@learner/utils/helper';
import { useRouter } from 'next/navigation';
import PasswordResetSuccess from '@forget-password/Components/PasswordResetSuccess/PasswordResetSuccess';
import { resetPassword } from '@learner/utils/API/LoginService';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Layout from '../../components/Layout';
import { checkAuth } from '@shared-lib-v2/utils/AuthService';
import { useTranslation } from '@shared-lib';
const ChangePassword = () => {
  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const [otpmodal, setOtpModal] = useState(false);
  const [hash, setHash] = useState<string>('');
    const { t } = useTranslation();

  const [mobile] = useState(
    typeof window !== 'undefined'
      ? localStorage.getItem('usermobile') || ''
      : ''
  );
  const [resetPasswordSuccessModal, setResetPasswordSuccessModal] =
    useState(false);
  const router = useRouter();

  const handleResetPassword = async (
    oldPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    const userIdName = localStorage.getItem('userIdName');

    if (oldPassword === newPassword) {
      showToastMessage(
        'New password cannot be the same as the current password.',
        'error'
      );
      return;
    }

    if (!userIdName) {
      showToastMessage('Something went wrong, please login again.', 'error');
      return;
    }

    try {
      // The API verifies oldPassword, so there is no login call to check it
      await resetPassword(newPassword, oldPassword, userIdName);
      setResetPasswordSuccessModal(true);
    } catch (error: any) {
      showToastMessage(
        error?.response?.data?.params?.err ||
          'The old password you entered is incorrect',
        'error'
      );
    }
  };

  const handleForgotPassword = async () => {
    try {
      let reason = 'forgot';
      const response = await sendOTP({ mobile: mobile, reason });
      console.log('sendOTP', response);
      setHash(response?.result?.data?.hash);
      setOtpModal(true);
    } catch (error) {}
    console.log('Forgot Password clicked');
    // Navigate or show forgot password modal
  };
  const onVerify = async () => {
    try {
      // let mobile = mobile.toString();
      let reason = 'forgot';
      // let username = enterdUserName;
      const response = await verifyOTP({
        mobile: localStorage.getItem('usermobile') || '',
        reason,
        otp: otp.join(''),
        hash,
        username: localStorage.getItem('userIdName') || '',
      });
      console.log('verifyOtp', response);
      let isValid = response.result.success;
      localStorage.setItem('tokenForResetPassword', response.result.token); // temporary assume true
      // let isValid = true;
      if (isValid) {
        // setVerificationSuccessModal(true);
        setOtpModal(false);
        localStorage.setItem('redirectionRoute', '/profile');
        router.push('/reset-Password');
      } else {
        showToastMessage('Please enter valid otp', 'error');
      }
    } catch (error) {
      showToastMessage('Please enter valid otp', 'error');
    } finally {
      setOtp(['', '', '', '']);
    }
  };
  const onResend = async () => {
    try {
      let reason = 'forgot';
      const response = await sendOTP({ mobile: mobile, reason });
      console.log('sendOTP', response);
      setHash(response?.result?.data?.hash);
    } catch (error) {}
  };
  const handleOTPModal = () => {
    setOtpModal(false);
    setOtp(['', '', '', '']);
  };
  const onCloseSuccessModal = () => {
    // const route = localStorage.getItem('redirectionRoute');
    // if (route)
    router.push('/profile');

    setResetPasswordSuccessModal(false);
  };
  useEffect(() => {
    // const token = localStorage.getItem('token');
    if (!checkAuth()) {
      router.push('/login');
    }
  }, []);

  return (
    <>
      <Layout>
        <Box
          sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 2 }}
          onClick={() => router.back()}
        >
          <IconButton>
            <ArrowBackIcon />
          </IconButton>
        </Box>
        <Box
          // height="100vh"
          // width="100vw"
          display="flex"
          flexDirection="column"
          //  overflow="auto"
          mt="70px"
        >
          <Typography
            variant="body8"
            mb="20px"
            sx={{
              fontWeight: 600,
              // fontSize: '24px',
              // lineHeight: '32px',
              letterSpacing: '0px',
              textAlign: 'center',
            }}
          >
   { t('LEARNER_APP.USER_PROFILE_CARD.CHANGE_PASSWORD')}
          </Typography>
          <ResetPasswordForm
            onResetPassword={handleResetPassword}
            onForgotPassword={handleForgotPassword}
          />
        </Box>
        <SimpleModal
          open={otpmodal && mobile ? true : false}
          onClose={handleOTPModal}
          showFooter
          primaryText={'Verify OTP'}
          modalTitle={'Verify Your Phone Number'}
          primaryActionHandler={onVerify}
        >
          <OtpVerificationComponent
            onResend={onResend}
            otp={otp}
            setOtp={setOtp}
            maskedNumber={maskMobileNumber(mobile || '')}
          />
        </SimpleModal>
        <SimpleModal
          open={resetPasswordSuccessModal}
          onClose={onCloseSuccessModal}
          showFooter
          primaryText={'Okay'}
          primaryActionHandler={onCloseSuccessModal}
        >
          <PasswordResetSuccess />
        </SimpleModal>
      </Layout>
    </>
  );
};

export default ChangePassword;
