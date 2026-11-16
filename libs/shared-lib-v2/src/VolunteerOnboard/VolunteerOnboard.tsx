import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  CircularProgress,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useRouter } from 'next/navigation';

import DynamicForm from '@shared-lib-v2/DynamicForm/components/DynamicForm';
import {
  fetchForm,
  splitUserData,
} from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import { FormContext } from '../DynamicForm/components/DynamicFormConstant';
import { updateUserPLP } from '../DynamicForm/services/CreateUserService';
import { showToastMessage } from '../DynamicForm/components/Toastify';
import { fetchActiveAcademicYearId } from '../DynamicForm/utils/helper';
import { post } from '../DynamicForm/services/RestClient';
import API_ENDPOINTS from '../DynamicForm/utils/API/APIEndpoints';
import { readUserIdTrue } from '../DynamicForm/services/NotificationService';
import { getInterestedToJoinFieldId } from '../utils/helper';

interface VolunteerOnboardProps {
  t: any;
  enrolledProgram?: boolean;
  uponEnrollCompletion?: () => void;
}


const VolunteerOnboard: React.FC<VolunteerOnboardProps> = ({
  t,
  enrolledProgram,
  uponEnrollCompletion
}) => {


  const router = useRouter();

  const [learnerSchema, setLearnerSchema] = useState<any>(null);
  const [learnerUiSchema, setLearnerUiSchema] = useState<any>(null);

  const [orgSchema, setOrgSchema] = useState<any>(null);
  const [orgUiSchema, setOrgUiSchema] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  //form steps schema and ui schema
  const [formStepsSchemaAndUiSchema, setFormStepsSchemaAndUiSchema] = useState<any>(null);
  const [activeStep, setActiveStep] = useState('step1');
  const [allVisitedSteps, setAllVisitedSteps] = useState<string[]>([]);
  const [formStepsData, setFormStepsData] = useState<any>({});

  const [tempYearId, setTempYearId] = useState<string>('');
  const [tempTenantId, setTempTenantId] = useState<string>('');

  const [state, setState] = useState<any>(null);
  const [district, setDistrict] = useState<any>(null);
  const [block, setBlock] = useState<any>(null);
  const [village, setVillage] = useState<any>(null);

  //fetch user details
  useEffect(() => {
    const loadUserData = async () => {
      if (typeof window !== 'undefined') {
        let userId = localStorage.getItem('userId') || '';
        const response = await readUserIdTrue(userId);
        let userDataDetails= response?.result?.userData;

        const customFields = userDataDetails?.customFields ?? [];
        const getFieldValue = (label: string) => {
          const field = customFields.find((f: any) => f.label === label);
          const val = field?.selectedValues?.[0];
          return typeof val === 'object' ? val : null;
        };

        const stateVal = getFieldValue('STATE');
        const districtVal = getFieldValue('DISTRICT');
        const blockVal = getFieldValue('BLOCK');
        const villageVal = getFieldValue('VILLAGE');

        setState(stateVal);
        setDistrict(districtVal);
        setBlock(blockVal);
        setVillage(villageVal);

        if (stateVal) localStorage.setItem('onboarding_state', JSON.stringify(stateVal));
        if (districtVal) localStorage.setItem('onboarding_district', JSON.stringify(districtVal));
        if (blockVal) localStorage.setItem('onboarding_block', JSON.stringify(blockVal));
        if (villageVal) localStorage.setItem('onboarding_village', JSON.stringify(villageVal));

      }
    };
    if(learnerSchema)
    {
      loadUserData();
    }
  }, [learnerSchema]);

  useEffect(() => {
    // Fetch form schema from API and set it in state.
    const fetchData = async () => {
      try {
        setLoading(true);
        const responseForm: any = await fetchForm([
          {
            fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.learner.context}&contextType=${FormContext.learner.contextType}`,
            header: {
              tenantid: localStorage.getItem('onboardTenantId'),
            },
          },
        ]);
        let responseLearnerSchema = responseForm?.schema;
        let responseLearnerUiSchema = responseForm?.uiSchema;
        setLearnerSchema(responseLearnerSchema);
        setLearnerUiSchema(responseLearnerUiSchema);

        const responseOrgForm: any = await fetchForm([
          {
            fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.organization.context}&contextType=${FormContext.organization.contextType}`,
            header: {
              tenantid: localStorage.getItem('onboardTenantId'),
            },
          },
        ]);
        let responseOrgSchema = responseOrgForm?.schema;
        let responseOrgUiSchema = responseOrgForm?.uiSchema;
        setOrgSchema(responseOrgSchema);
        setOrgUiSchema(responseOrgUiSchema);
      } catch (error) {
        console.log('error', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const loadAcademicYear = async () => {
      if (typeof window !== 'undefined') {
        const yearId = await fetchActiveAcademicYearId();
        localStorage.setItem('temp_academicYearId', yearId || '');
        setTempYearId(yearId || '');
        const tenantId = localStorage.getItem('onboardTenantId');
        setTempTenantId(tenantId || '');
      }
    };
    loadAcademicYear();
  }, []);

  useEffect(() => {
    if (learnerSchema && learnerUiSchema && orgSchema && orgUiSchema) {
      let tempFormStepsSchemaAndUiSchema = {
        step1: {
          schema: {
            "type": "object",
            "properties": {
              nda_policy: learnerSchema?.properties?.nda_policy,
              child_pocso_fraud_policy: learnerSchema?.properties?.child_pocso_fraud_policy,
            },
            "required": [
              "nda_policy",
              "child_pocso_fraud_policy",
            ]
          },
          uiSchema: {
            nda_policy: learnerUiSchema?.nda_policy,
            child_pocso_fraud_policy: learnerUiSchema?.child_pocso_fraud_policy,
          },
        },
        step2: {
          schema: {
            "type": "object",
            "properties": {
              how_would_you_like_to_register: learnerSchema?.properties?.how_would_you_like_to_register,
            },
            "required": [
              "how_would_you_like_to_register",
            ]
          },
          uiSchema: {
            how_would_you_like_to_register: learnerUiSchema?.how_would_you_like_to_register,
          },
        },
        step3_1: {
          schema: {
            "type": "object",
            "properties": {
              volunteer_type: learnerSchema?.properties?.volunteer_type,
            },
            "required": [
              "volunteer_type",
            ]
          },
          uiSchema: {
            volunteer_type: learnerUiSchema?.volunteer_type,
          },
        },
        step3_2: {
          schema: {
            "type": "object",
            "properties": {
              organisation_registered: learnerSchema?.properties?.organisation_registered,
            },
            "required": [
              "organisation_registered",
            ]
          },
          uiSchema: {
            organisation_registered: learnerUiSchema?.organisation_registered,
          },
        },
        step4_1: {
          schema: {
            "type": "object",
            "properties": {
              //step3_1
              volunteer_type: learnerSchema?.properties?.volunteer_type,

              ptm_id: learnerSchema?.properties?.ptm_id,
            },
            "required": [
              // step3_1
              "volunteer_type",

              "ptm_id",
            ]
          },
          uiSchema: {
            // step3_1
            volunteer_type: learnerUiSchema?.volunteer_type,

            ptm_id: learnerUiSchema?.ptm_id,
          },
        },
        step4_2: {
          schema: {
            "type": "object",
            "properties": {
              //step3_1
              volunteer_type: learnerSchema?.properties?.volunteer_type,

              org_id: learnerSchema?.properties?.org_id,
              poc_id: learnerSchema?.properties?.poc_id,
            },
            "required": [
              // step3_1
              "volunteer_type",

              "org_id",
              "poc_id",
            ]
          },
          uiSchema: {
            // step3_1
            volunteer_type: learnerUiSchema?.volunteer_type,

            org_id: learnerUiSchema?.org_id,
            poc_id: learnerUiSchema?.poc_id,
          },
        },
        step4_3: {
          schema: {
            "type": "object",
            "properties": {
              // step3_2
              organisation_registered: learnerSchema?.properties?.organisation_registered,

              ...((({ state, district, ...rest }) => rest)(orgSchema?.properties || {})),
              // state: {
              //   type: 'array',
              //   title: 'State',
              //   items: {
              //     type: 'string',
              //     enum: [state?.id],
              //     enumNames: [state?.value],
              //   },
              //   api: undefined,
              //   //for multiselect
              //   uniqueItems: true,
              //   isMultiSelect: true,
              //   maxSelection: 1,
              // },
              district: {
                type: 'array',
                title: 'FORM.DISTRICT',
                items: {
                  type: 'string',
                  enum: ['Select'],
                  enumNames: ['Select'],
                },
                api: {
                  url: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/fields/options/read`,
                  method: 'POST',
                  payload: {
                    fieldName: 'district',
                    controllingfieldfk:
                      [state?.id],
                    sort: ['district_name', 'asc'],
                  },
                  options: {
                    optionObj: 'result.values',
                    label: 'label',
                    value: 'value',
                  },
                  callType: 'initial',
                },
                //for multiselect
                uniqueItems: true,
                isMultiSelect: true,
                maxSelection: 1,
              },
            },
            "required": [
              // step3_2
              "organisation_registered",

              "name",
              "organisation_type",
              "ptm_id",
              // "state",
              "district",
              "block"
              // ...(orgSchema?.required || []),
            ]
          },
          uiSchema: {
              // step3_2
            organisation_registered: learnerUiSchema?.organisation_registered,
            
            ...((({ ["ui:order"]: _,state, ...rest }) => rest)(orgUiSchema || {})),
            'ui:order': [
              'organisation_registered',
              'name',
              // 'state',
              'district',
              'block',
              'organisation_type',
              'ptm_id'
            ],
          }
        },
        step4_4: {
          schema: {
            "type": "object",
            "properties": {
              // step3_2
              organisation_registered: learnerSchema?.properties?.organisation_registered,

              org_id: learnerSchema?.properties?.org_id,
            },
            "required": [
              // step3_2
              "organisation_registered",

              "org_id",
            ]
          },
          uiSchema: {
              // step3_2
            organisation_registered: learnerUiSchema?.organisation_registered,

            org_id: learnerUiSchema?.org_id,
          },
        },
      };
      setFormStepsSchemaAndUiSchema(tempFormStepsSchemaAndUiSchema);
    }
  }, [learnerSchema, learnerUiSchema, orgSchema, orgUiSchema]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isSubmitSetActionPerform, setIsSubmitSetActionPerform] = useState(false);

  useEffect(() => {
    const performAction = async () => {
      if (activeStep.includes('step4') && isSubmitSetActionPerform === true) {
        if (isSubmitting) {
          console.log('Already submitting, ignoring duplicate submission');
          return;
        }

        setIsSubmitting(true);
        let userId = localStorage.getItem('userId') || '';
        console.log('##########formsteps end of form submit call', formStepsData);
        let submitFormData = {};
        if (activeStep == 'step4_1') {
          submitFormData = {
            ...formStepsData?.step1,
            ...formStepsData?.step2,
            ...formStepsData?.step3_1,
            ...formStepsData?.step4_1,
          }
        }
        else if (activeStep == 'step4_2') {
          let temp_ptm_id = localStorage.getItem('temp_ptm_id');
          submitFormData = {
            ...formStepsData?.step1,
            ...formStepsData?.step2,
            ...formStepsData?.step3_1,
            ...formStepsData?.step4_2,
            ptm_id: temp_ptm_id
          }
          //also assign cohort organization with status pending and role as VOLUNTEER
          let responseAssign = await assignCohortOrganization(userId, formStepsData?.step4_2?.org_id, "VOLUNTEER");
          if (responseAssign?.success == false) {
            showToastMessage('Failed to assign cohort organization', 'error');
            setIsSubmitSetActionPerform(false);
            setIsSubmitting(false);
            return;
          }
        }
        else if (activeStep == 'step4_3') {
          //also register new organization with cohort status pending
          let responseCreateCohort = await registerOrganization(formStepsData?.step4_3, orgSchema);
          if (responseCreateCohort?.success == false) {
            setIsSubmitSetActionPerform(false);
            setIsSubmitting(false);
            return;
          }
          //get that new organization id
          let org_id = responseCreateCohort?.data?.result?.cohortId || '';
          //assign that org_id to ptm as cohort in active status with role PTM
          let temp_ptm_id = formStepsData?.step4_3?.ptm_id || '';
          let responseAssign = await assignCohortOrganization(temp_ptm_id, org_id, "PTM");
          if (responseAssign?.success == false) {
            showToastMessage('Failed to assign cohort organization', 'error');
            setIsSubmitSetActionPerform(false);
            setIsSubmitting(false);
            return;
          }
          //assign that organization cohort to that user as status pending and role as POC          
          responseAssign = await assignCohortOrganization(userId, org_id, "POC");
          if (responseAssign?.success == false) {
            showToastMessage('Failed to assign cohort organization', 'error');
            setIsSubmitSetActionPerform(false);
            setIsSubmitting(false);
            return;
          }
          //assign that org id as user data org id and assign that ptm id as user data ptm_id
          submitFormData = {
            ...formStepsData?.step1,
            ...formStepsData?.step2,
            ...formStepsData?.step3_2,
            org_id: org_id,
            ptm_id: temp_ptm_id,
          }
        }
        else if (activeStep == 'step4_4') {
          let temp_ptm_id = localStorage.getItem('temp_ptm_id');
          submitFormData = {
            ...formStepsData?.step1,
            ...formStepsData?.step2,
            ...formStepsData?.step3_2,
            ...formStepsData?.step4_4,
            ptm_id: temp_ptm_id
          }
          //also assign cohort organization with status pending and role as POC
          let responseAssign = await assignCohortOrganization(userId, formStepsData?.step4_4?.org_id, "POC");
          if (responseAssign?.success == false) {
            showToastMessage('Failed to assign cohort organization', 'error');
            setIsSubmitSetActionPerform(false);
            setIsSubmitting(false);
            return;
          }
        }
        //submit form data to api
        const submitPayload = transformFormData(
          submitFormData,
          learnerSchema,
          {}
        );
        console.log('##########formsteps debug submitPayload', submitPayload);
        const { userData, customFields = [] } = splitUserData(submitPayload);
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
        if(localStorage.getItem('temp_program_type') == 'VolunteerOnboarding'){
          customFields.push({
            fieldId: "4a04adbe-af01-4dea-92e3-688eab9935ca",
            value: "No"
          });
        }
        const object = {
          userData: {
            ...userData,
          },
          customFields: customFields,
        };
        if (userId) {
          try {
            // uncomment below
            const updateUserResponse = await updateUserPLP(userId, object);
            // console.log('updatedResponse', updateUserResponse);
            if (
              updateUserResponse &&
              updateUserResponse?.data?.params?.err === null
              && !enrolledProgram
            ) {
              showToastMessage('Profile Updated succeessfully', 'success');
            }

            if (enrolledProgram) {
              // Don't reset isSubmitting here - we're navigating away
              uponEnrollCompletion?.();
              // Don't redirect here - let the callback handle navigation after showing modal
              return;
            }
            // Reset submitting state for non-redirect cases
            setIsSubmitSetActionPerform(false);
            setIsSubmitting(false);
          } catch (error) {
            console.error('Error updating user:', error);
            setIsSubmitSetActionPerform(false);
            setIsSubmitting(false);
          }
          finally {
            setIsSubmitSetActionPerform(false);
            setIsSubmitting(false);
          }
        }
      }
    }
    // console.log("isSubmitSetActionPerform",isSubmitSetActionPerform);
    performAction()
  }, [isSubmitSetActionPerform]);

  function transformFormData(
    formData: Record<string, any>,
    schema: any,
    extraFields: Record<string, any> = {} // Optional root-level custom fields
  ) {
    const transformedData: Record<string, any> = {
      ...extraFields, // Add optional root-level custom fields dynamically
      customFields: [],
    };

    for (const key in formData) {
      if (schema.properties[key]) {
        const fieldSchema = schema.properties[key];

        if (fieldSchema.coreField === 0 && fieldSchema.fieldId) {
          // Use fieldId for custom fields
          transformedData.customFields.push({
            fieldId: fieldSchema.fieldId,
            value: formData[key] || '',
          });
        } else {
          // Use the field name for core fields
          transformedData[key] = formData[key] || '';
        }
      }
    }

    return transformedData;
  }

  const assignCohortOrganization = async (userId: string, orgId: string, role: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_MIDDLEWARE_URL || '';
      const apiUrl = `${baseUrl}/cohortmember/bulkCreate`;

      const token = localStorage.getItem('token') || '';

      const requestBody = {
        userId: [userId],
        cohortId: [orgId],
        cohortMemberRole: role,
        // uncomment below
        ...(role !== 'PTM' && { status: 'pending' })
      };

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'academicyearid': tempYearId,
        'tenantid': tempTenantId
      };

      const response = await post(apiUrl, requestBody, headers);

      if (response?.data?.params?.err === null) {
        console.log('Cohort organization assigned successfully:', response.data);
        return { success: true, data: response.data };
      } else {
        console.error('Error assigning cohort organization:', response?.data?.params?.err);
        // showToastMessage('Failed to assign cohort organization', 'error');
        return { success: false, error: response?.data?.params?.err };
      }
    } catch (error: any) {
      console.error('Error in assignCohortOrganization:', error);
      // showToastMessage('Failed to assign cohort organization', 'error');
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  const registerOrganization = async (orgFormData: any, orgSchema: any) => {
    try {
      //find out same state district block present not same name of organization
      const orgName = orgFormData?.name;
      const orgState = orgFormData?.state;
      const orgDistrict = orgFormData?.district;
      const orgBlock = orgFormData?.block;

      let isOrganizationExists = false;
      // Check if organization with same name exists in the same state, district, block
      if (orgName && orgState && orgDistrict && orgBlock) {
        const searchApiUrl = API_ENDPOINTS.cohortSearch;
        const token = localStorage.getItem('token') || '';

        const searchHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'academicyearid': tempYearId,
          'tenantid': tempTenantId
        };

        const searchRequestBody = {
          limit: 10,
          offset: 0,
          sort: ['name', 'asc'],
          filters: {
            type: 'COHORT',
            name: orgName,
            state: orgState,
            district: orgDistrict,
            block: orgBlock
          }
        };
        try {
          const searchResponse = await post(searchApiUrl, searchRequestBody, searchHeaders);
          if (searchResponse?.data?.result?.count > 0) {
            showToastMessage('Organization name already exists in that state, district, and block', 'error');
            isOrganizationExists = true;
          }
        }
        catch (error: any) { }
      }
      else {
        showToastMessage('Name,State, district, and block are required', 'error');
        isOrganizationExists = true;
      }
      if (isOrganizationExists == true) {
        return { success: false, error: 'Organization name already exists in that location' };
      }
      const apiUrl: string = API_ENDPOINTS.cohortCreate;
      //submit form data to api
      const submitPayload = transformFormData(
        orgFormData,
        orgSchema,
        {}
      );
      const token = localStorage.getItem('token') || '';
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'academicyearid': tempYearId,
        'tenantid': tempTenantId
      };
      const response = await post(apiUrl, {
        ...submitPayload, type: 'COHORT',
        //enable this when we have status field in cohort create api
        // uncomment below
        status: 'pending' //default status is active
      }, headers);
      if (response?.data?.params?.err === null) {
        console.log('Cohort organization created successfully:', response.data);
        return { success: true, data: response.data };
      } else {
        console.error('Error creating cohort organization:', response?.data?.params?.err);
        // showToastMessage('Failed to assign cohort organization', 'error');
        return { success: false, error: response?.data?.params?.err };
      }
    } catch (error: any) {
      console.error('Error in assignCohortOrganization:', error);
      // showToastMessage('Failed to assign cohort organization', 'error');
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  const valueSelectedChange=(changedFormData:any)=>{
    console.log("##########changedFormData",changedFormData);
    if(changedFormData?.volunteer_type){
      if(changedFormData.volunteer_type=='individual_volunteer'){
        setActiveStep('step4_1');
        formStepsData['step4_1']={volunteer_type:changedFormData.volunteer_type};
      }
      if(changedFormData.volunteer_type=='individual_volunteer_through_an_organisation'){
        setActiveStep('step4_2');
        formStepsData['step4_2']={volunteer_type:changedFormData.volunteer_type};
      }
    }
    if(changedFormData?.organisation_registered){
      if(changedFormData.organisation_registered=='this_is_the_first_time_my_organisation_is_registering'){
        setActiveStep('step4_3');
        formStepsData['step4_3']={organisation_registered:changedFormData.organisation_registered,
          state:[state?.id.toString()]
        };
      }
      if(changedFormData.organisation_registered=='my_organisation_is_already_registered'){
        setActiveStep('step4_4');
        formStepsData['step4_4']={organisation_registered:changedFormData.organisation_registered};
      }
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          ml: 'auto',
          mr: 'auto',
          width: {
            xs: '95vw',
            md: '85vw',
          },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#fff',
          p: '40px',
        }}
      >
        {formStepsSchemaAndUiSchema
          ?
          <Box display="flex" flexDirection="column" gap={1} mb={2}>
            <Typography fontWeight={600}>
              {allVisitedSteps.length > 0 && (
                <IconButton
                  onClick={() => {
                    localStorage.removeItem('temp_organization_register');
                    setFormStepsData({ ...formStepsData, [activeStep]: {} });
                    const lastStep = allVisitedSteps[allVisitedSteps.length - 1];
                    setActiveStep(lastStep);
                    setAllVisitedSteps(allVisitedSteps.slice(0, -1));
                  }}
                  sx={{ mb: 2 }}
                >
                  <ArrowBackIcon />
                </IconButton>
              )}
            </Typography>
            <DynamicForm
              key={activeStep}
              schema={formStepsSchemaAndUiSchema?.[activeStep]?.schema}
              uiSchema={formStepsSchemaAndUiSchema?.[activeStep]?.uiSchema}
              FormSubmitFunction={(formData: any, payload: any) => {
                console.log('##########formsteps debug payload', payload);
                console.log('##########formsteps debug formdata', formData);
                setFormStepsData({ ...formStepsData, [activeStep]: formData });
                if (!activeStep.includes('step4')) {
                  setAllVisitedSteps([...allVisitedSteps, activeStep]);
                }
                if (activeStep == 'step1') {
                  localStorage.removeItem('temp_organization_register');
                  setActiveStep('step2');
                }
                else if (activeStep == 'step2') {
                  if (formData.how_would_you_like_to_register == 'individual_volunteer') {
                    localStorage.removeItem('temp_organization_register');
                    setActiveStep('step3_1');
                  }
                  else if (formData.how_would_you_like_to_register == 'register_an_organisation_as_poc') {
                    localStorage.removeItem('temp_organization_register');
                    // normal step 3
                    setActiveStep('step3_2');
                    //direct to form step 4
                    // setActiveStep('step4_4');
                    // formStepsData['step4_4']={organisation_registered:'my_organisation_is_alresady_registered'};
                  }
                }
                else if (activeStep == 'step3_1') {
                  if (formData.volunteer_type == 'individual_volunteer') {
                    localStorage.removeItem('temp_organization_register');
                    setActiveStep('step4_1');
                  }
                  else if (formData.volunteer_type == 'individual_volunteer_through_an_organisation') {
                    localStorage.removeItem('temp_organization_register');
                    setActiveStep('step4_2');
                  }
                }
                else if (activeStep == 'step3_2') {
                  if (formData.organisation_registered == 'this_is_the_first_time_my_organisation_is_registering') {
                    localStorage.setItem('temp_organization_register', 'yes');
                    setActiveStep('step4_3');
                  }
                  else if (formData.organisation_registered == 'my_organisation_is_already_registered') {
                    localStorage.removeItem('temp_organization_register');
                    setActiveStep('step4_4');
                  }
                }
                else if (activeStep.includes('step4')) {
                  setIsSubmitSetActionPerform(true)
                }
              }}
              prefilledFormData={formStepsData?.[activeStep] || {}}
              hideSubmit={true}
              type={''}
              valueSelectedChange={valueSelectedChange}
            />
            <Button
              sx={{
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
                width: '100%',
                mt: 4,
              }}
              form="dynamic-form-id"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress color="inherit" size={20} /> : null}
              {
              activeStep=='step4_1' 
              ? t('COMMON.SUBMIT_REGISTRATION') 
              : activeStep=='step4_2' 
              ? t('COMMON.SUBMIT_REGISTRATION') 
              : activeStep=='step4_3' 
              ? t('COMMON.REGISTER_ORGANISATION') 
              : activeStep=='step4_4' 
              ? t('COMMON.SUBMIT_POC_REQUEST') 
              : t('COMMON.CONTINUE')
              }
            </Button>
          </Box>
          :
          <>
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          </>
        }
      </Box>
    </Box>
  );
};

export default VolunteerOnboard;
