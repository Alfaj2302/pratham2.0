'use client';

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Link,
  Typography,
} from '@mui/material';
import Header from '@learner/components/Header/Header';
import dynamic from 'next/dynamic';
// import { userCheck } from '@learner/utils/API/userService';
import { userNameExist } from '@learner/utils/API/userService';
// import AccountExistsCard from '@learner/components/AccountExistsCard/AccountExistsCard';
import SimpleModal from '@learner/components/SimpleModal/SimpleModal';
// import OtpVerificationComponent from '@learner/components/OtpVerificationComponent/OtpVerificationComponent';
// import { sendOTP, verifyOTP } from '@learner/utils/API/OtPService';
import { showToastMessage } from '@learner/components/ToastComponent/Toastify';
// import axios from 'axios';
// import MobileVerificationSuccess from '@learner/components/MobileVerificationSuccess/MobileVerificationSuccess';
import CreateAccountForm from '@learner/components/CreateAccountForm/CreateAccountForm';
import DynamicForm from '@shared-lib-v2/DynamicForm/components/DynamicForm';
import DynamicFormV3 from '@shared-lib-v2/DynamicForm/components/DynamicFormV3';
import { applyYearPickerFields } from '@shared-lib-v2/DynamicForm/components/RJSFWidget/CustomYearPickerWidget';
import { fetchForm } from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import { FormContext } from '@shared-lib-v2/DynamicForm/components/DynamicFormConstant';
import { useRouter } from 'next/navigation';
import {
  createUser,
  sendMessage,
} from '@shared-lib-v2/DynamicForm/services/CreateUserService';
import { RoleId } from '@shared-lib-v2/DynamicForm/utils/app.constant';
import { getUserId, login } from '@learner/utils/API/LoginService';
import SignupSuccess from '@learner/components/SignupSuccess /SignupSuccess ';
import { Loader } from '@shared-lib';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import { useTranslation } from '@shared-lib';
import {
  // firstLetterInUpperCase,
  isUnderEighteen,
  // maskMobileNumber,
} from '@learner/utils/helper';
import face from '../../../public/images/Group 3.png';

//build issue fix for  ⨯ useSearchParams() should be wrapped in a suspense boundary at page
import { useSearchParams } from 'next/navigation';
import {
  getTenantInfo,
  getTenantIdByName,
} from '@learner/utils/API/ProgramService';
import { getVerifiedMobile, clearVerifiedMobile } from '@learner/utils/verifiedMobile';
import Image from 'next/image';
import SwitchAccountDialog from '@shared-lib-v2/SwitchAccount/SwitchAccount';
import { getInterestedToJoinFieldId } from '@shared-lib-v2/utils/helper';
import { TenantName } from '@learner/utils/app.constant';
import { setSecureRefreshToken } from '@shared-lib-v2/utils/secureTokenStorage';

type UserAccount = {
  name: string;
  username: string;
};
const RegisterationFlow = () => {
  const searchParams = useSearchParams();
  const newAccount = searchParams.get('newAccount');
  // const tenantId = searchParams.get('tenantId');
  const { t, language } = useTranslation();
  console.log('language', language);

  // let formData: any = {};
  // const [usernames, setUsernames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [invalidLinkModal, setInvalidLinkModal] = useState(false);
  const tenantId = searchParams.get('tenantId');
  const enroll = searchParams.get('enroll');
  // Verified mobile never travels in the URL — it's handed off from EnrolModal via
  // encrypted sessionStorage after OTP verification. Absent on direct access or a
  // hard refresh (decryption key lives only in memory), which correctly falls back
  // to an empty, editable mobile field.
  const [mobileFromQuery, setMobileFromQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    getVerifiedMobile().then((verified) => {
      if (isMounted && verified?.mobile) {
        setMobileFromQuery(verified.mobile);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);
  const [fetchedTenantId, setFetchedTenantId] = useState<string | null>(null);
  const [fetchedEnroll, setFetchedEnroll] = useState<string | null>(null);

  // const [accountExistModal, setAccountExistModal] = useState<boolean>(false);
  const [usernamePasswordForm, setUsernamePasswordForm] =
    useState<boolean>(false);

  // const [otpmodal, setOtpModal] = useState(false);
  // const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  // const [hash, setHash] = useState<string>('');
  const [below18PrivacyConsent, setBelow18PrivacyConsent] = useState<string>("");
   const [above18ParentGuardianConsent, setAbove18ParentGuardianConsent] = useState<string>("");

  const localFormData =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('formData') || '{}')
      : {};

  const [formData, setFormData] = useState<any>(localFormData);

  const localPayload =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('localPayload') || '{}')
      : {};

  const [payload, setPayload] = useState<any>(localPayload);

  // const [verificationSuccessModal, setVerificationSuccessModal] =
  //   useState(false);
  const [signupSuccessModal, setSignupSuccessModal] = useState(false);

  //formData.email = 'a@tekditechnologies.com';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [tenantName, setTenantName] = useState('');
  // Pathways registration uses DynamicFormV3; other programs keep DynamicForm
  // `enroll` is known before the tenant is resolved, so the form fetch below
  // can already tell it is building the Pathways form
  const isPathwaysProgram = [tenantName, enroll].some(
    (name) =>
      name?.toLowerCase() ===
      TenantName.SECOND_CHANCE_PROGRAM_PATHWAYS.toLowerCase()
  );
  const LearnerForm = isPathwaysProgram ? DynamicFormV3 : DynamicForm;
  const [tenantUiConfig, setTenantUiConfig] = useState<any>(null);

  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [userResponse, setUserResponse] = useState<any>(null);

  const router = useRouter();

  const [confirmPassword, setConfirmPassword] = useState('');
  const [addSchema, setAddSchema] = useState(null);
  const [addUiSchema, setAddUiSchema] = useState(null);

  // const [schema, setSchema] = useState(facilitatorSearchSchema);
  // const [uiSchema, setUiSchema] = useState(facilitatorSearchUISchema);
  function checkTenantId(tenantIdToCheck: any, tenantData: any) {
    const tenant = tenantData?.find(
      (item: any) => item.tenantId === tenantIdToCheck
    );
    setTenantName(tenant.name);
    setTenantUiConfig(tenant?.params?.uiConfig || null);
    return tenantData?.some((item: any) => item.tenantId === tenantIdToCheck);
  }
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getTenantInfo();
        console.log('res', res?.result);

        // Validate tenantId if provided directly, or fetchedTenantId from enroll parameter
        const idToCheck = fetchedTenantId;

        if (idToCheck) {
          const isPresent = checkTenantId(idToCheck, res?.result);
          console.log('isPresent', isPresent);
          if (!isPresent) {
            setInvalidLinkModal(true);
          }
        }
      } catch (error) {
        console.error('Error fetching tenant info', error);
      }
    };
    fetchData();
  }, [fetchedTenantId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && fetchedEnroll) {
      localStorage.setItem('enrollTenantId', fetchedEnroll as string);
    }
  }, [fetchedEnroll]);

  useEffect(() => {
    if (mobileFromQuery && typeof window !== 'undefined') {
      const stored = JSON.parse(localStorage.getItem('formData') || '{}');
      const updated = { ...stored, mobile: mobileFromQuery, parent_phone: mobileFromQuery };
      localStorage.setItem('formData', JSON.stringify(updated));
      setFormData((prev: any) => ({ ...prev, mobile: mobileFromQuery, parent_phone: mobileFromQuery }));
    }
  }, [mobileFromQuery]);

  // Fetch tenant ID by name when enroll parameter is present
  useEffect(() => {
    const fetchTenantIdByName = async () => {
      if (tenantId) {
        try {
          const tenantIdFromName = await getTenantIdByName(tenantId as string);
          if (tenantIdFromName) {
            setFetchedTenantId(tenantIdFromName);
            console.log('Fetched tenant ID for enroll name:', tenantIdFromName);
          } else {
            console.log('No tenant found with name:', enroll);
          }
        } catch (error) {
          console.error('Error fetching tenant ID by name:', error);
        }
      }
    };
    fetchTenantIdByName();
  }, [tenantId]);

  useEffect(() => {
    const fetchTenantIdByName = async () => {
      if (enroll) {
        try {
          const tenantIdFromName = await getTenantIdByName(enroll as string);
          console.log('tenantIdFromName########', enroll);
          if (tenantIdFromName) {
            setFetchedEnroll(tenantIdFromName);
            console.log('Fetched tenant ID for enroll name:', tenantIdFromName);
          } else {
            console.log('No tenant found with name:', enroll);
          }
        } catch (error) {
          console.error('Error fetching tenant ID by name:', error);
        }
      }
    };
    fetchTenantIdByName();
  }, [enroll]);

  useEffect(() => {
    // Fetch form schema from API and set it in state.
    const fetchData = async () => {
      try {
        setLoading(true);
        const responseForm: any = await fetchForm([
          {
            fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.learner.context}&contextType=${FormContext.learner.contextType}`,
            header: {},
          },
          // {
          //   fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.learner.context}&contextType=${FormContext.learner.contextType}`,
          //   header: {
          //     tenantid: localStorage.getItem('tenantId'),
          //   },
          // },
        ]);
        console.log('responseForm####', responseForm);
        setAbove18ParentGuardianConsent(responseForm?.schema?.properties.privacy_consent?.fieldId);
        setBelow18PrivacyConsent(responseForm?.schema?.properties?.parent_guardian_consent?.fieldId);
        delete responseForm?.schema?.properties.password;
        delete responseForm?.schema?.properties.confirm_password;
        delete responseForm?.schema?.properties.username;
        delete responseForm?.schema?.properties.program;
        delete responseForm?.schema?.properties.batch;
        delete responseForm?.schema?.properties.center;
        delete responseForm?.schema?.properties.privacy_consent;
        delete responseForm?.schema?.properties.parent_guardian_consent;
        // Filter, not `pop('batch')` — pop ignores its argument and would drop
        // whichever required field the API happens to return last.
        if (Array.isArray(responseForm?.schema?.required)) {
          responseForm.schema.required = responseForm.schema.required.filter(
            (f: string) => f !== 'batch'
          );
        }
        //unit name is missing from required so handled from frotnend
        let alterSchema = responseForm?.schema;
        let requiredArray = alterSchema?.required;
        const mustRequired = [
          'firstName',
          'lastName',
          // 'email',
          // 'mobile',
          'dob',
          'gender',
          'state',
          'district',
          'block',
          'village',
          'what_is_your_preferred_language',
        //  'family_member_details',
          // 'center',
          // 'batch',
          // 'username',
        ];
        // Merge only missing items from required2 into required1
        mustRequired.forEach((item) => {
          if (!requiredArray.includes(item)) {
            requiredArray.push(item);
          }
        });
        //no required

        alterSchema.required = requiredArray;
        //add max selection custom
        if (alterSchema?.properties?.state) {
          alterSchema.properties.state.maxSelection = 1;
        }
        if (alterSchema?.properties?.district) {
          alterSchema.properties.district.maxSelection = 1;
        }
        if (alterSchema?.properties?.block) {
          alterSchema.properties.block.maxSelection = 1;
        }
        if (alterSchema?.properties?.village) {
          alterSchema.properties.village.maxSelection = 1;
        }
        if (alterSchema?.properties?.center) {
          alterSchema.properties.center.maxSelection = 1;
        }
        if (alterSchema?.properties?.batch) {
          alterSchema.properties.batch.maxSelection = 1;
        }

        //alter UI schema
        let alterUISchema = responseForm?.uiSchema;

        //set 2 grid layout
        alterUISchema = enhanceUiSchemaWithGrid(alterUISchema);

        // Add helper text to all CustomTextFieldWidget fields
        alterUISchema = addHelperTextToTextFieldWidgets(alterUISchema);

        // Reorder fields: guardian fields should appear right after dob
        let updatedUiSchema = reorderUiSchema(
          alterUISchema,
          'guardian_name',
          'dob'
        );
        updatedUiSchema = reorderUiSchema(
          updatedUiSchema,
          'guardian_relation',
          'guardian_name'
        );
        updatedUiSchema = reorderUiSchema(
          updatedUiSchema,
          'parent_phone',
          'guardian_relation'
        );
        updatedUiSchema = reorderUiSchema(
          updatedUiSchema,
          'mobile',
          'parent_phone'
        );

        // Pathways asks for the Class 10 passing year through a year picker
        if (isPathwaysProgram) {
          const yearPickerForm = applyYearPickerFields(
            alterSchema,
            updatedUiSchema,
            ['inWhichYearDidYouPassClass10']
          );
          alterSchema = yearPickerForm.schema;
          updatedUiSchema = yearPickerForm.uiSchema;
        }

        setAddSchema(alterSchema);
        setAddUiSchema(updatedUiSchema);
      } catch (error) {
        console.log('error', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [language]);

  // Resolve the preferred-language option from the schema. The enum values come
  // from the API and the labels are localised, so match on either one rather
  // than hardcoding a value.
  const resolvePreferredLanguage = (schema: any, aliases: string[]) => {
    const property = schema?.properties?.what_is_your_preferred_language;
    if (!property) return undefined;

    const isArrayField = property.type === 'array';
    const options = isArrayField ? property.items : property;
    const values: any[] = options?.enum || [];
    const labels: any[] = options?.enumNames || [];

    const index = values.findIndex((value, i) =>
      [value, labels[i]].some((candidate) =>
        aliases.some(
          (alias) =>
            String(candidate ?? '').trim().toLowerCase() === alias.toLowerCase()
        )
      )
    );
    if (index === -1) return undefined;

    return isArrayField ? [values[index]] : values[index];
  };

  // Set Telangana state (36) and Telugu language as defaults when isForNavaPatham is true
  useEffect(() => {
    if (addSchema && addUiSchema) {
      const isForNavaPatham =
        typeof window !== 'undefined'
          ? localStorage.getItem('isForNavaPatham') === 'true'
          : false;

      if (isForNavaPatham && formData) {
        // Only set defaults for fields that are not already set (respect stored data)
        const defaults: Record<string, any> = {};

        if (formData.state === undefined) {
          // Set Telangana state ID (36) as default
          defaults.state = ['36'];
        }

        if (formData.what_is_your_preferred_language === undefined) {
          const telugu = resolvePreferredLanguage(addSchema, [
            'telugu',
            'తెలుగు',
            'tel',
          ]);
          if (telugu !== undefined) {
            defaults.what_is_your_preferred_language = telugu;
          }
        }

        if (Object.keys(defaults).length > 0) {
          const updatedFormData = {
            ...formData,
            ...defaults,
          };
          setFormData(updatedFormData);

          // Update localStorage to persist the defaults
          if (typeof window !== 'undefined') {
            localStorage.setItem('formData', JSON.stringify(updatedFormData));
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSchema, addUiSchema]);

  const enhanceUiSchemaWithGrid = (uiSchema: any): any => {
    const enhancedSchema = { ...uiSchema };

    Object.keys(enhancedSchema).forEach((fieldKey) => {
      if (typeof enhancedSchema[fieldKey] === 'object') {
        // Ensure ui:options exists
        if (!enhancedSchema[fieldKey]['ui:options']) {
          enhancedSchema[fieldKey]['ui:options'] = {};
        }

        // Push grid option
        enhancedSchema[fieldKey]['ui:options'].grid = { xs: 12, sm: 12, md: 6 };
      }
    });

    return enhancedSchema;
  };

  const addHelperTextToTextFieldWidgets = (uiSchema: any): any => {
    // Check if isForNavaPatham is true in localStorage
    const isForNavaPatham =
      typeof window !== 'undefined'
        ? localStorage.getItem('isForNavaPatham') === 'true'
        : false;

    // If isForNavaPatham is not true, return the schema without modifications
    if (!isForNavaPatham) {
      return uiSchema;
    }

    const enhancedSchema = { ...uiSchema };

    Object.keys(enhancedSchema).forEach((fieldKey) => {
      // Skip ui:order and other non-field keys
      if (fieldKey === 'ui:order') return;

      if (
        typeof enhancedSchema[fieldKey] === 'object' &&
        enhancedSchema[fieldKey] !== null
      ) {
        // Check if this field uses CustomTextFieldWidget
        if (enhancedSchema[fieldKey]['ui:widget'] === 'CustomTextFieldWidget') {
          // Ensure ui:options exists
          if (!enhancedSchema[fieldKey]['ui:options']) {
            enhancedSchema[fieldKey]['ui:options'] = {};
          }

          // Add helperText if it doesn't already exist
          if (!enhancedSchema[fieldKey]['ui:options'].helperText) {
            enhancedSchema[fieldKey]['ui:options'].helperText = t(
              'NAVAPATHAM.TYPE_IN_ENGLISH'
            );
          }
        }
      }
    });

    return enhancedSchema;
  };

  function reorderUiSchema(uiSchema: any, moveField: any, afterField: any) {
    const order = [...uiSchema['ui:order']];
    const filteredOrder = order.filter((item) => item !== moveField);
    const index = filteredOrder.indexOf(afterField);

    filteredOrder.splice(index + 1, 0, moveField);

    return {
      ...uiSchema,
      'ui:order': filteredOrder,
    };
  }

  // useEffect(() => {
  //   let timer: any;
  //   if (verificationSuccessModal) {
  //     timer = setTimeout(() => {
  //       //   router.push(`/account-selection?newAccount=${'true'}`);
  //       // params.set('newAccount', 'true');

  //       onCloseSuccessModal();
  //     }, 3000);
  //   }

  //   return () => clearTimeout(timer);
  // }, [verificationSuccessModal]);
  const handleCreateAccount = async () => {
    if (creatingAccount) return; // Prevent multiple clicks

    setCreatingAccount(true);
    try {
      const localPayload = localStorage.getItem('localPayload');
      if (localPayload) {
        const payloadData = JSON.parse(
          localStorage.getItem('localPayload') || '{}'
        );

        // Use tenantId if directly provided, otherwise use fetchedTenantId from enroll parameter
        const finalTenantId = fetchedTenantId;

        if (!finalTenantId) {
          showToastMessage(
            t('LEARNER_APP.REGISTRATION_FLOW.INVALID_TENANT'),
            'error'
          );
          setCreatingAccount(false);
          return;
        }

        const tenantData = [
          { roleId: RoleId.STUDENT, tenantId: finalTenantId },
        ];

        //delete mobile or guardian detail from dob
        let updated_payload = payload;
        if (isUnderEighteen(updated_payload?.dob)) {
          //  delete updated_payload?.mobile;
          updated_payload.mobile = formData?.parent_phone;
          
          // Add privacy consent for users under 18
          const customFieldsArray = [...(payload.customFields || [])];
          if (below18PrivacyConsent) {
            customFieldsArray.push({
              fieldId: below18PrivacyConsent,
              value: 'yes'
            });
          }
          updated_payload = {
            ...payload,
            customFields: customFieldsArray,
          };
        } else {
          updated_payload.mobile = formData?.mobile;

          const fieldIdsToRemove = [
            'd7a56014-0b9a-4f16-b07e-88baea79576d',
            '3a7bf305-6bac-4377-bf09-f38af866105c',
            '7ecaa845-901a-4ac7-a136-eed087f3b85b',
          ];
          
          // Add parent/guardian consent for users 18 and above
          const filteredCustomFields = payload.customFields.filter(
            (field: any) => !fieldIdsToRemove.includes(field.fieldId)
          );
          
          if (above18ParentGuardianConsent) {
            filteredCustomFields.push({
              fieldId: above18ParentGuardianConsent,
              value: 'yes'
            });
          }
          
          updated_payload = {
            ...payload,
            customFields: filteredCustomFields,
          };
          delete formData?.parent_phone;
          delete formData?.guardian_relation;
          delete formData?.guardian_name;
        }

        //custom field for pending status (SCP and Pathways only)
        const interestedToJoinFieldId = getInterestedToJoinFieldId(tenantName);
        if (tenantUiConfig?.isTenantPendingStatus && interestedToJoinFieldId) {
          updated_payload = {
            ...updated_payload,
            customFields: [
              ...(updated_payload.customFields || []),
              { fieldId: interestedToJoinFieldId, value: 'pending' },
            ],
          };
        }

        const createuserPayload = {
          ...updated_payload,
          username: username,
          password: password,
          //  program: tenantId,
          tenantCohortRoleMapping: tenantData,
        };
        localStorage.setItem('localPayload', JSON.stringify(createuserPayload));
        localStorage.setItem(
          'loginLocalPayload',
          JSON.stringify(createuserPayload)
        );
        const responseUserData = await createUser(createuserPayload);
        console.log(responseUserData);
        if (responseUserData) {
          localStorage.removeItem('localPayload');
          
          // Persist preferred language before clearing form data
          try {
            const storedFormDataRaw = localStorage.getItem('formData');
            if (storedFormDataRaw) {
              const storedFormData = JSON.parse(storedFormDataRaw || '{}');
              const preferred =
                Array.isArray(storedFormData?.what_is_your_preferred_language)
                  ? storedFormData.what_is_your_preferred_language[0]
                  : storedFormData?.what_is_your_preferred_language;
              if (preferred) {
                localStorage.setItem('preferred_language', preferred);
              }
            }
          } catch (err) {
            void err;
          }
          
          localStorage.removeItem('formData');
          clearVerifiedMobile();

          //sent username and password
          sendMessage({
            "sms": {
              "to": [updated_payload.mobile],
              "body":"Hey",
              "templateId": "6ae2e2adba35dbc54409b3f2", 
              "replacements": {
                "username": username,
                "password": password
              }
            }
          }).catch((error) => {
            // Account is already created; a failed credentials SMS must not block sign-in
            console.error('error in sending credentials message', error?.message);
          });
          // Added condition to hide popup based on enroll present or not
          if (enroll) {
            onSigin();
          } else {  
            setSignupSuccessModal(true);
          }
        } else {
          showToastMessage(
            t('LEARNER_APP.REGISTRATION_FLOW.USERNAME_ALREADY_EXIST'),
            'error'
          );
        }

        console.log(responseUserData);
      }
    } catch (error) {
      showToastMessage(
        t('LEARNER_APP.REGISTRATION_FLOW.ERROR_CREATING_ACCOUNT'),
        'error'
      );
    } finally {
      setCreatingAccount(false);
    }
  };
  // formData.mobile = '8793607919';
  // formData.firstName = 'karan';
  // formData.lastName = 'patil';
  console.log(payload);

  // const handleSendOtp = async (mob: string) => {
  //   try {
  //     const reason = 'signup';
  //     const response = await sendOTP({ mobile: mob, reason });
  //     setHash(response?.result?.data?.hash);
  //     setOtpModal(true);
  //   } catch (error: any) {
  //     console.error('Error sending OTP:', error);
  //   }
  // };

  // const handleAccountValidation = async (formData: any) => {
  //   try {
  //     const isEmailCheck = Boolean(formData.email);
  //     const payload = isEmailCheck
  //       ? { email: formData.email }
  //       : { mobile: isUnderEighteen(formData.dob) ? formData.parent_phone : formData.mobile };
  //     const response = await userCheck(payload);
  //     const users = response?.result || [];
  //     if (users.length > 0 && isEmailCheck) {
  //       showToastMessage(t('LEARNER_APP.REGISTRATION_FLOW.EMAIL_ALREADY_EXISTS'), 'error');
  //     } else if (users.length > 0) {
  //       setUsernames(users.map((user: any) => user.username));
  //       setAccountExistModal(true);
  //     } else {
  //       setOtpModal(true);
  //     }
  //   } catch (error: any) {
  //     if (error.response?.data?.params?.errmsg === 'User does not exist') {
  //       handleSendOtp(isUnderEighteen(formData.dob) ? formData.parent_phone : formData.mobile);
  //     }
  //   }
  // };

  // const handleLoginClick = () => { setAccountExistModal(false); window.location.href = '/login'; };
  // const handleCloseModal = () => { setAccountExistModal(false); };
  // const handleOTPModal = () => { setOtpModal(false); setOtp(['', '', '', '']); };
  // const onCreateAnotherAccount = async () => { setAccountExistModal(false); await handleSendOtp(mobile); };
  // const onVerify = async () => {
  //   try {
  //     const response = await verifyOTP({ mobile: mobile.toString(), reason: 'signup', otp: otp.join(''), hash });
  //     if (response.result.success) { setVerificationSuccessModal(true); setOtpModal(false); }
  //     else { showToastMessage(t('LEARNER_APP.REGISTRATION_FLOW.PLEASE_ENTER_VALID_OTP'), 'error'); }
  //   } catch { showToastMessage(t('LEARNER_APP.REGISTRATION_FLOW.PLEASE_ENTER_VALID_OTP'), 'error'); }
  //   finally { setOtp(['', '', '', '']); }
  // };
  // const onResend = async () => {
  //   try { const response = await sendOTP({ mobile, reason: 'signup' }); setHash(response?.result?.data?.hash); } catch {}
  // };

  const onCloseSuccessModal = async (currentFormData?: any) => {
    const data = currentFormData || formData;
    try {
      const result = await userNameExist({
        firstName: data?.firstName || '',
        lastName: data?.lastName || '',
      });
      setUsername(result?.suggestedUsername || '');
    } catch (error) {
      // Fallback to locally generated username if the suggestion API fails
      setUsername(
        (data?.firstName || '') +
          (data?.lastName || '') +
          Math.floor(10 + Math.random() * 90)
      );
    }
    // setVerificationSuccessModal(false);
    setUsernamePasswordForm(true);
  };
  const onCloseSignupSuccessModal = () => {
    //  const route = localStorage.getItem('redirectionRoute');
    //   if (route) router.push(route);

    setSignupSuccessModal(false);
    // setUsernamePasswordForm(true);
  };
  const onCloseInvalidLinkModal = () => {};
  const renderHomePage = () => {
    router.push('/');
  };
  const onSigin = async () => {
    let username;
    let password;

    //   const loginLocalPayload = localStorage.getItem('loginLocalPayload');
    if (true) {
      const payloadData = JSON.parse(
        localStorage.getItem('loginLocalPayload') || '{}'
      );

      username = payloadData?.username;
      password = payloadData?.password;
    }

    try {
      if (username && password) {
        const response = await login({ username, password });
        if (response?.result?.access_token) {
          if (typeof window !== 'undefined' && window.localStorage) {
            const token = response.result.access_token;
            const refreshToken = response?.result?.refresh_token;
            // Only store refreshToken if it has a valid value
            if (refreshToken) {
              localStorage.setItem('refreshTokenForAndroid', refreshToken);
            } else {
              localStorage.removeItem('refreshTokenForAndroid');
            }
            await setSecureRefreshToken(refreshToken);

            localStorage.setItem('token', token);

            const userResponseData = await getUserId();
            setUserResponse(userResponseData);
            setSwitchDialogOpen(true);
          }
        } else {
          // showToastMessage('LOGIN_PAGE.USERNAME_PASSWORD_NOT_CORRECT', 'error');
        }
        setSignupSuccessModal(false);
      }
      // setLoading(false);
    } catch (error: any) {
      //   setLoading(false);
      const errorMessage = 'LOGIN_PAGE.USERNAME_PASSWORD_NOT_CORRECT';
      showToastMessage(errorMessage, 'error');
    }
  };
  const callBackSwitchDialog = async (
    selectedTenantId: string,
    selectedTenantName: string,
    tenantType: string,
    selectedRoleId: string,
    selectedRoleName: string
  ) => {
    setSwitchDialogOpen(false);
    setLoading(true);
    try {
      if (userResponse) {
        const token = localStorage.getItem('token') || '';

        // Persist core user info
        localStorage.setItem('userId', userResponse?.userId);
        localStorage.setItem('userIdName', userResponse?.username);
        localStorage.setItem('name', userResponse?.firstName);
        localStorage.setItem('firstName', userResponse?.firstName || '');
        localStorage.setItem('lastName', userResponse?.lastName || '');
        // Persist selected tenant/role
        localStorage.setItem('tenantName', selectedTenantName);
        localStorage.setItem('roleId', selectedRoleId);
        localStorage.setItem('roleName', selectedRoleName);
        localStorage.setItem('tenantId', selectedTenantId);

        // Lookup selected tenant details from response
        const selectedTenant = userResponse?.tenantData?.find(
          (t: any) => t?.tenantId === selectedTenantId
        );

        if (selectedTenant) {
          localStorage.setItem('userProgram', selectedTenantName);
          const uiConfig = selectedTenant?.params?.uiConfig;
          localStorage.setItem('uiConfig', JSON.stringify(uiConfig || {}));

          if (selectedTenant?.templateId) {
            localStorage.setItem('templtateId', selectedTenant?.templateId);
          }
          if (selectedTenant?.channelId) {
            localStorage.setItem('channelId', selectedTenant?.channelId);
          }
          if (selectedTenant?.collectionFramework) {
            localStorage.setItem(
              'collectionFramework',
              selectedTenant?.collectionFramework
            );
          }

          document.cookie = `token=${token}; path=/; secure; SameSite=Strict`;
          router.push('/programs');
          // const hasBothContentCoursetab =
          //   uiConfig?.showContent?.includes('courses') &&
          //   uiConfig?.showContent?.includes('contents');
          // if (hasBothContentCoursetab) {
          //   router.push('/courses-contents');
          // } else {
          //   router.push('/content');
          // }
          // const landingPage = localStorage.getItem('landingPage') || '';

          // if (landingPage) {
          //   router.push(landingPage);
          // } else {
          //   router.push('/content');
          // }
        }
      }
    } catch (e) {}
    setLoading(false);
  };
  //   const handleLogin = async () => {
  //     if (formData.email) {
  //       const email = formData.email;
  //       const response = await userCheck({ email });
  //       console.log('response', response.result);
  //       const userList = response.result.map((user: any) => ({
  //         name: [user.firstName, user.middleName, user.lastName]
  //           .filter(Boolean)
  //           .join(' '),
  //         username: user.username,
  //       }));
  //       const usernameList = response.result.map((user: any) => user.username);

  //       console.log(usernameList);
  //       setUsernames(usernameList);
  //     }
  //   };
  const FormSubmitFunction = async (formData: any, payload: any) => {
    console.log('formData', formData);
    localStorage.setItem('formData', JSON.stringify(formData));
    setPayload(payload);
    localStorage.setItem('localPayload', JSON.stringify(payload));
    localStorage.setItem('loginLocalPayload', JSON.stringify(payload));

    setFormData(formData);
    onCloseSuccessModal(formData);
    console.log(formData.parent_phone);
    console.log(payload);
    console.log(formData.dob);
    console.log(isUnderEighteen(formData.dob));
    if (isUnderEighteen(formData.dob)) {
      setMobile(formData.parent_phone);
    } else {
      setMobile(formData.mobile);
    }
  };
  return (
    <Box
      height="100vh"
      width="100vw"
      display="flex"
      flexDirection="column"
      sx={{
        background: 'linear-gradient(to bottom, #fff7e6, #fef9ef)',
        overflow: 'auto',
      }}
    >
      <Header />

      {loading ? (
        <Box
          width="100%"
          id="check"
          display="flex"
          flexDirection="column"
          alignItems="center"
        >
          <Loader isLoading={true} layoutHeight={0}>
            {/* Your actual content goes here, even if it's an empty div */}
            <div />
          </Loader>{' '}
        </Box>
      ) : usernamePasswordForm ? (
        <>
          {' '}
          <Box
            sx={{ display: 'flex', alignItems: 'center', mt: 2 }}
            onClick={() => {
              if (usernamePasswordForm) {
                setUsernamePasswordForm(false);
              } else router.back();
            }}
          >
            <IconButton>
              <ArrowBackIcon />
            </IconButton>
          </Box>
          <Box mb={'30px'}>
            <CreateAccountForm
              username={username}
              onUsernameChange={setUsername}
              password={password}
              onPasswordChange={setPassword}
              confirmPassword={confirmPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onSubmit={handleCreateAccount}
              isSubmitDisabled={creatingAccount}
              belowEighteen={formData.guardian_name ? true : false}
              tenantName={tenantName}
            />
          </Box>
        </>
      ) : (
        <>
          <Box
            sx={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              fontFamily: `'Inter', sans-serif`, // assuming Inter or similar
              mt: '15px',
            }}
          >
            <Typography
              variant="h1"
              fontWeight="bold"
              gutterBottom
              sx={{
                fontFamily: 'Poppins, sans-serif',
                lineHeight: '24px',
                letterSpacing: '0.5px',
                textAlign: 'center',
              }}
            >
              {`${t(
                'LEARNER_APP.REGISTRATION.GET_STARTED_WITH_YOUR_LEARNING_JOURNEY_NOW'
              )} `}
            </Typography>

            <Typography
              sx={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 400,
                fontSize: '16px',
                lineHeight: '24px',
                letterSpacing: '0.5px',
                textAlign: 'center',
                p: '5px',
              }}
            >
              {t('LEARNER_APP.REGISTRATION.CREATE_ACCOUNT_TO_PROGRAMS')}
              {/* <Box
                component="br"
                sx={{ display: { xs: 'block', sm: 'none' } }}
              />
              {t(
                'LEARNER_APP.REGISTRATION.AN_ENTRY_LEVEL_JOB_WITH_2_MONTHS_OF'
              )}
              <Box
                component="br"
                sx={{ display: { xs: 'block', sm: 'none' } }}
              />
              {' ' + t('LEARNER_APP.REGISTRATION.TRAINING')} */}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 400,
                fontSize: '16px',
                lineHeight: '24px',
                letterSpacing: '0.5px',
                textAlign: 'center',
              }}
            >
              {t('LEARNER_APP.REGISTRATION.ALREADY_SIGNED_UP')}
              <Link
                href="/login"
                underline="hover"
                color="secondary"
                sx={{ fontWeight: '500' }}
              >
                {' ' + t('LEARNER_APP.REGISTRATION.CLICK_HERE_TO_LOGIN')}
              </Link>
            </Typography>
          </Box>
          <Box
            sx={{
              ml: 'auto',
              mr: 'auto',
              width: {
                xs: '90vw',
                md: '50vw',
              },
              display: 'flex',
              flexDirection: 'column',
              bgcolor: '#fff',
              p: {
                xs: '20px',
                md: '40px',
              },
            }}
          >
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Image src={face} alt="Step Icon" />
              <Typography fontWeight={600}>
                {t('LEARNER_APP.REGISTRATION.TELL_US_ABOUT_YOURSELF')}
              </Typography>
            </Box>

            <Alert
              icon={<PriorityHighIcon htmlColor="black" />}
              severity="info"
              sx={{
                backgroundColor: '#F7EBD9',
                color: '#000',
                //  fontSize: '14px',
                mt: 2,
                mb: 3,
              }}
            >
              {t(
                'LEARNER_APP.LOGIN.make_sure_to_cross_check_the_state_district_block_village'
              )}
            </Alert>
            {addSchema && addUiSchema && (
              <LearnerForm
                schema={addSchema}
                uiSchema={
                  mobileFromQuery
                    ? {
                        ...(addUiSchema as any),
                        mobile: { ...(addUiSchema as any)?.mobile, 'ui:disabled': true },
                        parent_phone: { ...(addUiSchema as any)?.parent_phone, 'ui:disabled': true },
                      }
                    : addUiSchema
                }
                FormSubmitFunction={FormSubmitFunction}
                prefilledFormData={{ ...formData, ...(mobileFromQuery ? { mobile: mobileFromQuery, parent_phone: mobileFromQuery } : {}) }}
                hideSubmit={true}
                type={'learner'}
                mobileNumber={mobileFromQuery}
              />
            )}
            <Button
              sx={{
                mt: 3,
                backgroundColor: '#FFC107',
                color: '#000',
                fontFamily: 'Poppins',
                fontWeight: 500,
                fontSize: '14px',
                height: '40px',
                lineHeight: '20px',
                letterSpacing: '0.1px',
                textAlign: 'center',
                verticalAlign: 'middle',
                '&:hover': {
                  backgroundColor: '#ffb300',
                },
              }}
              form="dynamic-form-id"
              type="submit"
            >
              {t('LEARNER_APP.REGISTRATION.CONTINUE')}
            </Button>
          </Box>
        </>
      )}

      {/* Account Exists, OTP verification and Verification Success modals removed —
          these checks now happen in EnrolModal before reaching registration */}

      <SimpleModal
        open={signupSuccessModal}
        onClose={onCloseSignupSuccessModal}
        showFooter={true}
        primaryText={t('LEARNER_APP.REGISTRATION_FLOW.START_EXPLORING')}
        primaryActionHandler={onSigin}
      >
        <Box p="10px">
          <SignupSuccess />
        </Box>
      </SimpleModal>

      <SwitchAccountDialog
        open={switchDialogOpen}
        onClose={() => setSwitchDialogOpen(false)}
        callbackFunction={callBackSwitchDialog}
        authResponse={userResponse?.tenantData}
      />

      <SimpleModal
        open={invalidLinkModal}
        onClose={onCloseInvalidLinkModal}
        showFooter={true}
        primaryText={t('LEARNER_APP.REGISTRATION_FLOW.OKAY')}
        primaryActionHandler={renderHomePage}
      >
        <Box p="10px">{t('LEARNER_APP.REGISTRATION.INVALID_LINK')}</Box>
      </SimpleModal>
    </Box>
  );
};

export default RegisterationFlow;
