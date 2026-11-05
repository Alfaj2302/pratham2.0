'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Link, Typography, useRadioGroup } from '@mui/material';
import SimpleModal from '@learner/components/SimpleModal/SimpleModal';
import { showToastMessage } from '@learner/components/ToastComponent/Toastify';
import axios from 'axios';

import DynamicForm from '@shared-lib-v2/DynamicForm/components/DynamicForm';
import DynamicFormV3 from '@shared-lib-v2/DynamicForm/components/DynamicFormV3';
import { applyYearPickerTopLabelFields } from '@shared-lib-v2/DynamicForm/components/RJSFWidget/CustomYearPickerTopLabelWidget';
import { applyMultiSelectTopLabelFields } from '@shared-lib-v2/DynamicForm/components/RJSFWidget/CustomMultiSelectTopLabelWidget';
import { applyTextFieldTopLabelFields } from '@shared-lib-v2/DynamicForm/components/RJSFWidget/CustomTextFieldTopLabelWidget';
import { TenantName } from '@learner/utils/app.constant';
import {
  fetchForm,
  splitUserData,
} from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import { FormContext } from '@shared-lib-v2/DynamicForm/components/DynamicFormConstant';
import { useRouter } from 'next/navigation';
import { createUser } from '@shared-lib-v2/DynamicForm/services/CreateUserService';
import { RoleId } from '@shared-lib-v2/DynamicForm/utils/app.constant';
import { Loader, useTranslation } from '@shared-lib';
import {
  firstLetterInUpperCase,
  getMissingFields,
  isUnderEighteen,
  mapUserData,
} from '@learner/utils/helper';
import face from '../../../public/images/Group 3.png';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

//build issue fix for  ⨯ useSearchParams() should be wrapped in a suspense boundary at page
import { useSearchParams } from 'next/navigation';
import { getTenantInfo } from '@learner/utils/API/ProgramService';
import { checkAuth } from '@shared-lib-v2/utils/AuthService';

import Image from 'next/image';
import { set } from 'lodash';
import {
  getUserDetails,
  profileComplitionCheck,
  updateUser,
} from '@learner/utils/API/userService';
import Header from '../Header/Header';
import ConsentCheckbox from '../ConsentCheckbox/ConsentCheckbox';

//volunteer onboarding
import VolunteerOnboard from '@shared-lib-v2/VolunteerOnboard/VolunteerOnboard';
import { getInterestedToJoinFieldId } from '@shared-lib-v2/utils/helper';

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

type UserAccount = {
  name: string;
  username: string;
};
interface EditProfileProps {
  completeProfile: boolean;
  enrolledProgram?: boolean;
  uponEnrollCompletion?: () => void;
}

const EditProfile = ({ completeProfile, enrolledProgram, uponEnrollCompletion }: EditProfileProps) => {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const directEnroll = searchParams.get('directEnroll');
  const [isSubmitting, setIsSubmitting] = useState(false);
  console.log('directEnroll', directEnroll);

  // The Android app opens this component in a WebView as /profile-complition?screen=edit|complete
  // and supplies its own toolbar. Requiring `screen` means no existing web route into this
  // component (profile menu, complete-profile banner, enrollment page) can reach the branches below.
  const screen = searchParams.get('screen');
  const closeToNative =
    !enrolledProgram &&
    (screen === 'edit' || screen === 'complete') &&
    typeof window !== 'undefined' &&
    localStorage.getItem('isAndroidApp') === 'yes';

  // Where web would navigate to landingPage, the app instead hands control back to native,
  // which tears down the WebView. Same payload as ENROLL_PROGRAM_EVENT plus `screen`, so native
  // knows which flow finished and where to return the learner.
  const postProfileEventToNative = () => {
    let refreshToken = localStorage.getItem('refreshTokenForAndroid');
    if (!refreshToken || refreshToken === '') {
      refreshToken = localStorage.getItem('refreshToken');
    }
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'EDIT_PROFILE_EVENT',
          data: {
            userId: localStorage.getItem('userId'),
            tenantId: localStorage.getItem('tenantId'),
            token: localStorage.getItem('token'),
            refreshToken: refreshToken,
            screen: screen,
          },
        })
      );
    }
  };

  // Helper function to get program name (Navapatham if isForNavaPatham is true, otherwise userProgram)
  const getProgramName = () => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return '';
    }
    const isForNavaPatham =
      typeof window !== 'undefined' && window.localStorage
        ? localStorage.getItem('isForNavaPatham') === 'true'
        : false;
    return isForNavaPatham
      ? t('NAVAPATHAM.NAVAPATHAM')
      : localStorage.getItem('userProgram') || '';
  };
  // Pathways learners fill their profile with DynamicFormV3; other programs keep DynamicForm
  const isPathwaysProgram =
    typeof window !== 'undefined' &&
    window.localStorage &&
    localStorage.getItem('userProgram')?.toLowerCase() ===
      TenantName.SECOND_CHANCE_PROGRAM_PATHWAYS.toLowerCase();
  const LearnerForm = isPathwaysProgram ? DynamicFormV3 : DynamicForm;
  // Enrolling into Pathways shows one field per row and asks for personal data consent
  const isPathwaysEnrollment = isPathwaysProgram && !!enrolledProgram;
  const [consentAccepted, setConsentAccepted] = useState(false);
  // let formData: any = {};
  const [loading, setLoading] = useState(true);
  const [invalidLinkModal, setInvalidLinkModal] = useState(false);

  const localFormData = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('formData') || '{}') : {};
  const [userFormData, setUserFormData] = useState<any>(localFormData);
  const [userData, setuserData] = useState<any>({});
  // Complete-profile and enroll-program strip marital_status out of the form when it isn't
  // required, but DynamicForm still needs the saved value to know whether "spouse" is a valid
  // family member option - keep it separately so it survives those reduced prefilledFormData shapes.
  const [maritalStatusValue, setMaritalStatusValue] = useState<string | undefined>(undefined);
  const [responseFormData, setResponseFormData] = useState<any>({});
  const localPayload = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('localPayload') || '{}') : {};
  const uiConfig =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('uiConfig') || '{}')
      : {};

  //formData.email = 'a@tekditechnologies.com';

  const router = useRouter();

  const [addSchema, setAddSchema] = useState(null);
  const [addUiSchema, setAddUiSchema] = useState(null);
  // Complete-profile form shows the missing fields plus the saved fields that
  // control them (see getMissingFields); prefill whatever was already saved.
  const completeProfilePrefill = useMemo(
    () =>
      Object.fromEntries(
        Object.keys((addSchema as any)?.properties || {})
          .filter((key) => {
            const value = userFormData?.[key];
            return (
              value !== undefined &&
              value !== null &&
              value !== '' &&
              !(Array.isArray(value) && value.length === 0)
            );
          })
          .map((key) => [key, userFormData[key]])
      ),
    [addSchema, userFormData]
  );

  // Mobile field states
  const [mobileAddUiSchema, setMobileAddUiSchema] = useState({});
  const [mobileSchema, setMobileSchema] = useState({});

  // Parent data states (parent_phone, guardian_relation, guardian_name)
  const [parentDataAddUiSchema, setParentDataAddUiSchema] = useState({});
  const [parentDataSchema, setParentDataSchema] = useState({});

  console.log('addSchema', addSchema);

  // const [schema, setSchema] = useState(facilitatorSearchSchema);
  // const [uiSchema, setUiSchema] = useState(facilitatorSearchUISchema);
  useEffect(() => {
    // const token = localStorage.getItem('token');
    if (!checkAuth()) {
      // router.push('/login') would load the whole web login into the app's WebView.
      if (closeToNative) postProfileEventToNative();
      else router.push('/login');
    }
  }, []);

  const [isVolunteerOnboard, setIsVolunteerOnboard] = useState<boolean | null>(null);

  useEffect(() => {
    const temp_program_type = localStorage.getItem('temp_program_type');
    if (temp_program_type == 'VolunteerOnboarding') {
      setIsVolunteerOnboard(true);
    }
    else {
      setIsVolunteerOnboard(false);
    }
  }, []);

  const [isModeOfLearningPresent, setIsModeOfLearningPresent] = useState<boolean | null>(false);

  useEffect(() => {
    // Fetch form schema from API and set it in state.
    const fetchData = async () => {
      let skipLoadingReset = false;
      try {
        setLoading(true);
        const responseForm: any = await fetchForm([
          {
            fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.learner.context}&contextType=${FormContext.learner.contextType}`,
            header: {},
          },
          {
            fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.learner.context}&contextType=${FormContext.learner.contextType}`,
            header: {
              tenantid: localStorage.getItem('tenantId'),
            },
          },
        ]);

        const responseFormForEnroll: any = await fetchForm([
          {
            fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.learner.context}&contextType=${FormContext.learner.contextType}`,
            header: {
              tenantid: localStorage.getItem('tenantId'),
            },
          },
        ]);
        delete responseFormForEnroll?.schema?.properties?.password;
        delete responseFormForEnroll?.schema?.properties.confirm_password;
        delete responseFormForEnroll?.schema?.properties?.username;
        delete responseFormForEnroll?.schema?.properties?.program;
        delete responseFormForEnroll?.schema?.properties?.batch;
        delete responseFormForEnroll?.schema?.properties?.center;
        delete responseFormForEnroll?.schema?.properties?.state;
        delete responseFormForEnroll?.schema?.properties?.district;
        delete responseFormForEnroll?.schema?.properties?.block;
        delete responseFormForEnroll?.schema?.properties?.village;
        delete responseFormForEnroll?.schema?.properties?.consent_file;
        delete responseFormForEnroll?.schema?.properties?.privacy_consent;
        delete responseFormForEnroll?.schema?.properties?.parent_guardian_consent;
        // delete responseFormForEnroll?.schema?.properties?.nda_policy;
        // delete responseFormForEnroll?.schema?.properties?.child_pocso_fraud_policy;
        delete responseFormForEnroll?.schema?.properties?.how_would_you_like_to_register;
        delete responseFormForEnroll?.schema?.properties?.organisation_registered;
        delete responseFormForEnroll?.schema?.properties?.volunteer_type;
        delete responseFormForEnroll?.schema?.properties?.ptm_id;
        delete responseFormForEnroll?.schema?.properties?.poc_id;
        delete responseFormForEnroll?.schema?.properties?.org_id;
        delete responseFormForEnroll?.schema?.properties?.what_do_you_want_to_become;
        // `batch` is dropped from properties above, so drop it from `required` too.
        // Must be a filter, not `pop('batch')` — pop ignores its argument and
        // removes the last required field instead (PS: hid what_program_are_you_part_of).
        if (Array.isArray(responseFormForEnroll?.schema?.required)) {
          responseFormForEnroll.schema.required =
            responseFormForEnroll.schema.required.filter(
              (f: string) => f !== 'batch'
            );
        }
        console.log('responseFormForEnroll', responseFormForEnroll?.schema);

        if (responseFormForEnroll?.schema?.properties && Array.isArray(responseFormForEnroll?.schema?.required)) {
          const requiredFields = responseFormForEnroll.schema.required;
          Object.keys(responseFormForEnroll.schema.properties).forEach((key) => {
            if (!requiredFields.includes(key)) {
              delete responseFormForEnroll.schema.properties[key];
            }
          });
        }
        console.log('responseFormForEnroll', responseFormForEnroll?.schema);

        const responseFormCopy = JSON.parse(JSON.stringify(responseForm));
        setResponseFormData(responseFormCopy);
        console.log('responseForm===>', responseFormCopy?.schema);
        const r = await profileComplitionCheck();
        console.log(r);
        delete responseForm?.schema?.properties.password;
        delete responseForm?.schema?.properties.confirm_password;
        delete responseForm?.schema?.properties.username;
        delete responseForm?.schema?.properties.program;
        delete responseForm?.schema?.properties.batch;
        delete responseForm?.schema?.properties.center;
        delete responseForm?.schema?.properties.state;
        delete responseForm?.schema?.properties.district;
        delete responseForm?.schema?.properties.block;
        delete responseForm?.schema?.properties.village;
        delete responseForm?.schema?.properties?.privacy_consent;
        delete responseForm?.schema?.properties?.parent_guardian_consent;
        delete responseForm?.schema?.properties?.nda_policy;
        delete responseForm?.schema?.properties?.child_pocso_fraud_policy;
        delete responseForm?.schema?.properties?.how_would_you_like_to_register;
        delete responseForm?.schema?.properties?.organisation_registered;
        delete responseForm?.schema?.properties?.volunteer_type;
        delete responseForm?.schema?.properties?.ptm_id;
        delete responseForm?.schema?.properties?.poc_id;
        delete responseForm?.schema?.properties?.org_id;
        delete responseForm?.schema?.properties?.consent_file;
        delete responseForm?.schema?.properties?.what_do_you_want_to_become;


        if (Array.isArray(responseForm?.schema?.required)) {
          responseForm.schema.required = responseForm.schema.required.filter(
            (f: string) => f !== 'batch'
          );
        }
        let userId = localStorage.getItem('userId');
        if (userId) {
          const useInfo = await getUserDetails(userId, true);
          console.log('useInfo', useInfo?.result?.userData);
          setuserData(useInfo?.result?.userData);
          // Pass the form schema so custom fields outside mapUserData's fixed list prefill too
          const mappedData = mapUserData(
            useInfo?.result?.userData,
            responseFormCopy?.schema
          );
          setMaritalStatusValue(mappedData?.marital_status);

          // console.log("responseFormForEnroll", responseFormForEnroll?.schema?.properties)
          const keyNames = Object.keys(responseFormForEnroll?.schema?.properties);

          // Add family member fields to keyNames if they exist in user data
          // These fields will be added to the schema later
          const familyMemberFields = ['father_name', 'mother_name', 'spouse_name'];
          familyMemberFields.forEach(field => {
            if (mappedData[field] && !keyNames.includes(field)) {
              keyNames.push(field);
            }
          });

          const filteredData = Object.fromEntries(
            Object.entries(mappedData).filter(([key]) => keyNames.includes(key))
          );

          if (isUnderEighteen(useInfo?.result?.userData?.dob)) {
            delete responseForm?.schema.properties.mobile;
          }

          const updatedSchema = getMissingFields(
            responseForm?.schema,
            useInfo?.result?.userData
          );
          delete updatedSchema?.properties?.consent_file;
          delete updatedSchema?.properties?.what_do_you_want_to_become;


          const updatedSchemaForEnroll = getMissingFields(
            responseFormForEnroll?.schema,
            useInfo?.result?.userData
          );
          console.log(updatedSchema);
          if (enrolledProgram)
            setUserFormData(filteredData);
          else
            setUserFormData(mappedData);
          //unit name is missing from required so handled from frotnend
          let alterSchema = enrolledProgram ? responseFormForEnroll?.schema : completeProfile
            ? updatedSchema
            : responseForm?.schema;
          let alterUISchema = enrolledProgram ? responseFormForEnroll?.uiSchema : responseForm?.uiSchema;

          console.log('alterSchema', alterSchema);
          console.log('alterUISchema', alterUISchema);
          if(alterSchema.properties.own_phone_check && !alterSchema.properties.phone_type_accessible)
          {
            delete alterSchema.properties.own_phone_check;
            delete alterUISchema.own_phone_check;
            if(Array.isArray(alterSchema.required) && alterSchema.required.includes('own_phone_check')){
             alterSchema.required = alterSchema.required.filter((f: string) => f !== 'own_phone_check');
            }
          }
          if(alterSchema.properties.own_phone_check && mappedData?.phone_type_accessible === 'nophone')
          {
            delete alterSchema.properties.own_phone_check;
            delete alterUISchema.own_phone_check;
            if(Array.isArray(alterSchema.required) && alterSchema.required.includes('own_phone_check')){
              alterSchema.required = alterSchema.required.filter((f: string) => f !== 'own_phone_check');
            }
          }
       //   If enrolledProgram + completeProfile and there are no required fields left,
          // the profile is already complete — skip the form and proceed directly.
          if (enrolledProgram && completeProfile && (!alterSchema?.required || alterSchema.required.length === 0)) {
            skipLoadingReset = true; // keep loader visible while handleAccessProgram runs
            uponEnrollCompletion?.();
            return;
          }

          // Set mobile field states
          setMobileAddUiSchema(responseForm?.uiSchema?.mobile);
          setMobileSchema(responseFormCopy?.schema?.properties?.mobile);

          // Set parent data states (grouping parent_phone, guardian_relation, guardian_name)
          setParentDataAddUiSchema({
            parent_phone: responseForm?.uiSchema?.parent_phone,
            guardian_relation: responseForm?.uiSchema?.guardian_relation,
            guardian_name: responseForm?.uiSchema?.guardian_name
          });
          setParentDataSchema({
            parent_phone: responseFormCopy?.schema?.properties?.parent_phone,
            guardian_relation: responseFormCopy?.schema?.properties?.guardian_relation,
            guardian_name: responseFormCopy?.schema?.properties?.guardian_name
          });

          //set 2 grid layout
          alterUISchema = enhanceUiSchemaWithGrid(alterUISchema);


            //check if mode of learning is present in the schema
            console.log('####debug responseForm?.schema?.properties?.preferred_mode_of_learning', responseForm?.schema?.properties?.preferred_mode_of_learning);
            if (responseForm?.schema?.properties?.preferred_mode_of_learning) {
              setIsModeOfLearningPresent(true);
              console.log('####debug isModeOfLearningPresent', isModeOfLearningPresent);
            }


          // Add helper text to all CustomTextFieldWidget fields if isForNavaPatham is true
          alterUISchema = addHelperTextToTextFieldWidgets(alterUISchema);

          console.log('alterUISchema', alterUISchema);
          if (!completeProfile) {
            alterUISchema = {
              ...alterUISchema,
              firstName: {
                ...alterUISchema.firstName,
                'ui:disabled': true,
              },
              dob: {
                ...alterUISchema.dob,
                // 'ui:disabled': true,
              },
              lastName: {
                ...alterUISchema.lastName,
                'ui:disabled': true,
              },
            };
          }
          delete alterSchema?.properties?.is_volunteer;
          if (alterSchema?.properties?.family_member_details) {
            // if (!alterSchema?.required?.includes('family_member_details')) {
            //   alterSchema?.required?.push('family_member_details')

            // }
            // Add family member fields to schema if they exist in responseFormCopy
            // But DON'T add them as required - DynamicForm will handle that based on selection
            if (responseFormCopy?.schema?.properties?.father_name) {
              alterSchema.properties.father_name = responseFormCopy.schema.properties.father_name;
              // Remove from required if present
              if (alterSchema.required) {
                alterSchema.required = alterSchema.required.filter((f: string) => f !== 'father_name');
              }
            }
            if (responseFormCopy?.schema?.properties?.mother_name) {
              alterSchema.properties.mother_name = responseFormCopy.schema.properties.mother_name;
              // Remove from required if present
              if (alterSchema.required) {
                alterSchema.required = alterSchema.required.filter((f: string) => f !== 'mother_name');
              }
            }
            if (responseFormCopy?.schema?.properties?.spouse_name) {
              alterSchema.properties.spouse_name = responseFormCopy.schema.properties.spouse_name;
              // Remove from required if present
              if (alterSchema.required) {
                alterSchema.required = alterSchema.required.filter((f: string) => f !== 'spouse_name');
              }
            }

            // Add family member fields to uiSchema but set them as hidden initially
            // DynamicForm will show the appropriate one based on selection
            if (responseForm?.uiSchema?.father_name) {
              alterUISchema.father_name = {
                ...responseForm.uiSchema.father_name,
                'ui:widget': 'hidden'
              };
            }
            if (responseForm?.uiSchema?.mother_name) {
              alterUISchema.mother_name = {
                ...responseForm.uiSchema.mother_name,
                'ui:widget': 'hidden'
              };
            }
            if (responseForm?.uiSchema?.spouse_name) {
              alterUISchema.spouse_name = {
                ...responseForm.uiSchema.spouse_name,
                'ui:widget': 'hidden'
              };
            }

            // Add family member fields to ui:order if it exists
            // They will be hidden initially and DynamicForm will show the appropriate one
            // Insert them right after family_member_details for proper ordering
            if (alterUISchema['ui:order']) {
              const fieldsToAdd = ['father_name', 'mother_name', 'spouse_name'];
              const familyMemberDetailsIndex = alterUISchema['ui:order'].indexOf('family_member_details');

              if (familyMemberDetailsIndex !== -1) {
                // First, remove the fields if they already exist in the order
                fieldsToAdd.forEach((field) => {
                  const existingIndex = alterUISchema['ui:order'].indexOf(field);
                  if (existingIndex !== -1) {
                    alterUISchema['ui:order'].splice(existingIndex, 1);
                  }
                });

                // Then insert fields right after family_member_details in the correct order
                let insertPosition = alterUISchema['ui:order'].indexOf('family_member_details') + 1;
                fieldsToAdd.forEach((field) => {
                  alterUISchema['ui:order'].splice(insertPosition, 0, field);
                  insertPosition++; // Increment position for next field
                });
              } else {
                // Fallback: add at the end if family_member_details not found in order
                fieldsToAdd.forEach((field) => {
                  if (!alterUISchema['ui:order'].includes(field)) {
                    alterUISchema['ui:order'].push(field);
                  }
                });
              }
            }
          }
          //shift nda policy at end
          const order = alterUISchema['ui:order'];
          const policies = ['nda_policy', 'child_pocso_fraud_policy'];
          alterUISchema['ui:order'] = [
            ...order.filter((item:any) => !policies.includes(item)),
            ...order.filter((item:any) => policies.includes(item)),
          ];
          //if !enrolledProgram then remove from required policies
          if(!enrolledProgram){
            alterSchema.required = alterSchema?.required?.filter(
              (item:any) => !['nda_policy', 'child_pocso_fraud_policy'].includes(item)
            );
          }
          alterUISchema.mobile = responseForm?.uiSchema?.mobile
          // Pathways asks for the Class 10 passing year through a year picker
          if (isPathwaysProgram) {
            const yearPickerForm = applyYearPickerTopLabelFields(
              alterSchema,
              alterUISchema,
              ['inWhichYearDidYouPassClass10']
            );
            alterSchema = yearPickerForm.schema;
            alterUISchema = yearPickerForm.uiSchema;
            // Class 10 drop downs show their label above the field
            alterUISchema = applyMultiSelectTopLabelFields(alterUISchema, [
              'fromWhichBoardDidYouPassClass10',
              'whatDivision/PercentageDidYouGetInClass10',
              "haveYouStudiedInPratham'sSecondChanceProgram",
            ]);
            alterUISchema = applyTextFieldTopLabelFields(alterUISchema, [
              'fromWhichBoardDidYouPassClass10Other',
            ]);
          }
          setAddSchema(alterSchema);
          console.log("alterUISchema", alterUISchema);
          setAddUiSchema(alterUISchema);
        }
      } catch (error) {
        console.log('error', error);
      } finally {
        if (!skipLoadingReset) {
          setLoading(false);
        }
      }
    };
    if (isVolunteerOnboard == false) {
      fetchData();
    }
    else {
      setLoading(false);
    }
  }, [isVolunteerOnboard]);
  console.log("addSchema", addSchema);
  console.log("addUiSchema", addUiSchema);
  const enhanceUiSchemaWithGrid = (uiSchema: any): any => {
    const enhancedSchema = { ...uiSchema };

    Object.keys(enhancedSchema).forEach((fieldKey) => {
      if (typeof enhancedSchema[fieldKey] === 'object') {
        // Ensure ui:options exists
        if (!enhancedSchema[fieldKey]['ui:options']) {
          enhancedSchema[fieldKey]['ui:options'] = {};
        }

        // Push grid option
        if(isPathwaysEnrollment || ['nda_policy','child_pocso_fraud_policy']?.includes(fieldKey)){
          enhancedSchema[fieldKey]['ui:options'].grid = { xs: 12, sm: 12, md: 12 };
        }
        else{
          enhancedSchema[fieldKey]['ui:options'].grid = { xs: 12, sm: 12, md: 6 };
        }
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

  // formData.mobile = '8793607919';
  // formData.firstName = 'karan';
  // formData.lastName = 'patil';

  const onCloseInvalidLinkModal = () => { };
  const renderHomePage = () => {
    router.push('/');
  };

  const FormSubmitFunction = async (formData: any, payload: any) => {
    // Prevent double submission
    if (isSubmitting) {
      console.log('Already submitting, ignoring duplicate submission');
      return;
    }
    // Finish Enroll stays disabled without consent; this also blocks an Enter-key submit
    if (isPathwaysEnrollment && !consentAccepted) {
      return;
    }

    setIsSubmitting(true);
    console.log('formData', formData);
    console.log(userFormData);
    if (userFormData.email == payload.email) {
      delete payload.email;
    }
    console.log('payload', payload);
    const { userData, customFields = [] } = splitUserData(payload);
    //custom field hardcoded for pending status
    const data = {
      fieldId: getInterestedToJoinFieldId(),
      value: 'pending'
    }
    const storedUiConfig = JSON.parse(localStorage.getItem('uiConfig') || '{}');
    const userTenantStatus = storedUiConfig?.isTenantPendingStatus;
    if (enrolledProgram && userTenantStatus && data.fieldId) {
      customFields.push(data);
    }

    // Ensure "WHAT PROGRAM ARE YOU PART OF" is explicitly sent even when empty,
    // but only when it was actually part of the form rendered this submission -
    // `responseFormData` is the tenant's full master schema and always has this
    // field, so keying off it wiped the saved value on unrelated submits (e.g.
    // a Complete Profile form that only asked for Middle Name).
    const programSchema =
      (addSchema as any)?.properties?.what_program_are_you_part_of;
    const programFieldId = programSchema?.fieldId;

    const programFieldIndex = customFields.findIndex(
      (field: any) =>
        field?.fieldId === programFieldId ||
        field?.label === 'WHAT PROGRAM ARE YOU PART OF'
    );

    if (programFieldIndex === -1) {
      if (programFieldId) {
        customFields.push({
          fieldId: programFieldId,
          value: [],
        });
      }
    } else if (!Array.isArray(customFields[programFieldIndex].selectedValues)) {
      customFields[programFieldIndex].selectedValues = [];
    }

    // The family member fields are mutually exclusive, so switching the selection must clear
    // the previous one. DynamicForm drops the deselected fields from its schema, which means
    // they never reach customFields and the old value survives on the server (a learner who
    // saved a spouse name and then switched to mother showed both). Send them as empty.
    const familyMemberFieldNames = [
      'father_name',
      'mother_name',
      'spouse_name',
    ];
    const familyFieldId = (fieldName: string) =>
      responseFormData?.schema?.properties?.[fieldName]?.fieldId;

    // Only touch these when the form actually asks for a family member, otherwise a tenant
    // whose form omits the selector would have its stored names wiped.
    const familySelectorFieldId = familyFieldId('family_member_details');
    const formHasFamilySelector =
      Boolean(familySelectorFieldId) &&
      customFields.some(
        (field: any) => field?.fieldId === familySelectorFieldId
      );

    if (formHasFamilySelector) {
      // Match the selector against the field it controls without assuming the option's
      // exact casing or wording - just that it contains 'father' / 'mother' / 'spouse'.
      const selectedRaw = String(formData?.family_member_details ?? '')
        .trim()
        .toLowerCase();
      const selectedFieldName = familyMemberFieldNames.find((fieldName) =>
        selectedRaw.includes(fieldName.replace('_name', ''))
      );

      familyMemberFieldNames.forEach((fieldName) => {
        if (fieldName === selectedFieldName) return;

        const fieldId = familyFieldId(fieldName);
        if (!fieldId) return;

        const existingIndex = customFields.findIndex(
          (field: any) => field?.fieldId === fieldId
        );

        if (existingIndex !== -1) {
          // Present in the payload but not the selected member - blank it.
          customFields[existingIndex].value = '';
        } else if (selectedFieldName) {
          // Dropped from the schema when deselected, so send it explicitly as empty.
          customFields.push({ fieldId, value: '' });
        }
      });

    }

    const parentPhoneField = customFields.find(
      (field: any) => field.value === formData.parent_phone
    );
    console.log('Parent Phone Field:', parentPhoneField);
    if (parentPhoneField) {
      userData.mobile = parentPhoneField.value;
    }
    let userId = localStorage.getItem('userId');
    const object = {
      userData: {
        ...userData,
        future_work: t('LEARNER_APP.EDIT_PROFILE.FUTURE_WORK'),
      },
      customFields: customFields,
    };
    if (userId) {
      try {
        const updateUserResponse = await updateUser(userId, object);
        // console.log('updatedResponse', updateUserResponse);

        if (
          updateUserResponse &&
          updateUserResponse?.data?.params?.err === null
          && !enrolledProgram
        ) {
          showToastMessage('Profile Updated succeessfully', 'success');
          const landingPage = localStorage.getItem('landingPage') || '';

          // In app mode native closes the WebView instead — see the closeToNative block below.
          if (landingPage && !closeToNative) {
            window.location.href = landingPage;
          }
        }

        if (formData?.what_is_your_preferred_language && localStorage.getItem('registerationTestGiven') !== "Yes") {
          localStorage.setItem('preferred_language', formData.what_is_your_preferred_language);
        }

        // Covers both edit and complete modes: native tears down the WebView, so the
        // completeProfile branch's router.push(landingPage) below is never reached in app mode.
        if (closeToNative) {
          postProfileEventToNative();
          setIsSubmitting(false);
          return;
        }

        if (enrolledProgram) {
          // Don't reset isSubmitting here - we're navigating away
          uponEnrollCompletion?.();
          // Don't redirect here - let the callback handle navigation after showing modal
          return;
        }

        if (completeProfile) {
          const uiConfig =
            typeof window !== 'undefined'
              ? JSON.parse(localStorage.getItem('uiConfig') || '{}')
              : {};
          //  const hasBothContentCoursetab = uiConfig?.showContent?.includes("courses") && uiConfig?.showContent?.includes("contents");

          //                 if (hasBothContentCoursetab) {
          //                   router.push('/courses-contents');
          //                 }
          //                  else
          //                 router.push('/content');

          const landingPage = localStorage.getItem('landingPage') || '';

          if (landingPage) {
            router.push(landingPage);
          } else {
            router.push('/content');
          }
          return;
        }

        // Reset submitting state for non-redirect cases
        setIsSubmitting(false);
      } catch (error) {
        console.error('Error updating user:', error);
        setIsSubmitting(false);
      }
    }

    console.log(payload);
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
          </Loader>
        </Box>
      ) : (
        <>
          {directEnroll == 'true' && <Header isShowLogout={true} />}

          {directEnroll != 'true' && !closeToNative && (<Box
            sx={{
              //   p: 2,
              mt: 2,
              ml: 2,
              cursor: 'pointer',
              width: 'fit-content',
              background: 'linear-gradient(to bottom, #fff7e6, #fef9ef)',
            }}
            onClick={() => router.back()}
          >
            <ArrowBackIcon
              sx={{ color: '#4B5563', '&:hover': { color: '#000' } }}
            />
          </Box>)}

          <Box
            sx={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              fontFamily: `'Inter', sans-serif`,
              mb: '10px',
              // assuming Inter or similar
              //   mt: '15px',
              //  p: '25px',
            }}
          >
            <Typography
              variant="body8"
              component="h2"
              sx={{
                fontWeight: 600,
                // fontSize: '24px',
                // lineHeight: '32px',
                letterSpacing: '0px',
                textAlign: 'center',
              }}
            >
              {enrolledProgram &&
                typeof window !== 'undefined' &&
                window.localStorage &&
                localStorage.getItem('userProgram')
                ? `${t('NAVAPATHAM.ENROLL_INTO')} ${getProgramName()}`
                : completeProfile
                  ? t('LEARNER_APP.EDIT_PROFILE.COMPLETE_PROFILE_TITLE')
                  : t('LEARNER_APP.EDIT_PROFILE.TITLE')}
            </Typography>

            {enrolledProgram &&
              typeof window !== 'undefined' &&
              window.localStorage &&
              uiConfig.registrationdescription && (
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
                  {uiConfig?.registrationdescription}
                </Typography>
              )}
          </Box>
          {isVolunteerOnboard != null && (
            <>
              {isVolunteerOnboard == true ? (
                <>
                  <VolunteerOnboard t={t} enrolledProgram={enrolledProgram} uponEnrollCompletion={uponEnrollCompletion} />
                </>
              ) : (
                <>
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
                      p: '40px',
                    }}
                  >
                    {completeProfile && !enrolledProgram && (
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <Image src={face} alt="Step Icon" />
                        <Typography fontWeight={600}>
                          {t('LEARNER_APP.EDIT_PROFILE.BACKGROUND_HELP_TEXT')}
                        </Typography>
                      </Box>
                    )}
                    {enrolledProgram &&
                      typeof window !== 'undefined' &&
                      window.localStorage &&
                      localStorage.getItem('userProgram') && (
                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                          <Image src={face} alt="Step Icon" />
                          <Typography fontWeight={600}>
                            {t('NAVAPATHAM.WELCOME_JOINED')} {getProgramName()}!<br />
                            {t('NAVAPATHAM.ENROLLMENT_INTRO')}
                          </Typography>
                        </Box>
                      )}
                    {addSchema && addUiSchema && (
                      <LearnerForm
                        schema={addSchema}
                        uiSchema={addUiSchema}
                        mobileAddUiSchema={mobileAddUiSchema}
                        mobileSchema={mobileSchema}
                        parentDataAddUiSchema={parentDataAddUiSchema}
                        parentDataSchema={parentDataSchema}
                        forEditedschema={responseFormData?.schema?.properties}
                        FormSubmitFunction={FormSubmitFunction}
                        prefilledFormData={{
                          ...(completeProfile && !enrolledProgram
                            ? completeProfilePrefill
                            : enrolledProgram && isModeOfLearningPresent
                            ? { preferred_mode_of_learning: 'remote' }
                            : userFormData),
                          // Carry the already-known marital status through even on the reduced
                          // shapes above, so the family-member-details gating in DynamicForm can
                          // still hide "spouse" for a learner who is Unmarried.
                          ...(maritalStatusValue
                            ? { marital_status: maritalStatusValue }
                            : {}),
                        }}
                        hideSubmit={true}
                        type="learner"
                        isCompleteProfile={completeProfile}
                        createNew={false}
                      />
                    )}
                    {isPathwaysEnrollment && addSchema && (
                      <ConsentCheckbox
                        checked={consentAccepted}
                        onChange={setConsentAccepted}
                        consentFormUrl={uiConfig?.consentFormUrl}
                      />
                    )}
                    <Button
                      disabled={isPathwaysEnrollment && !consentAccepted}
                      sx={{
                        mt: 3,
                        backgroundColor: '#FFC107',
                        color: '#000',
                        fontWeight: 'bold',
                        '&:hover': {
                          backgroundColor: '#ffb300',
                        },
                        '&:disabled': {
                          backgroundColor: '#E0E0E0',
                          color: '#9E9E9E',
                        },
                      }}
                      form="dynamic-form-id"
                      type="submit"
                    >
                      {enrolledProgram
                        ? t('NAVAPATHAM.FINISH_ENROLL')
                        : t('COMMON.SUBMIT')}
                    </Button>
                  </Box>
                </>
              )}
            </>)}
        </>
      )}

      <SimpleModal
        open={invalidLinkModal}
        onClose={onCloseInvalidLinkModal}
        showFooter={true}
        primaryText={'Okay'}
        primaryActionHandler={renderHomePage}
      >
        <Box p="10px">{t('LEARNER_APP.EDIT_PROFILE.INVALID_LINK')}</Box>
      </SimpleModal>
    </Box>
  );
};

export default EditProfile;
