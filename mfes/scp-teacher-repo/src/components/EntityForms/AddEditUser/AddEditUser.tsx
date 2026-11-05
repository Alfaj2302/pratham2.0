import React, { useEffect, useState } from 'react';
import DynamicForm from '@shared-lib-v2/DynamicForm/components/DynamicForm';
import DynamicFormV3 from '@shared-lib-v2/DynamicForm/components/DynamicFormV3';
import { applyYearPickerTopLabelFields } from '@shared-lib-v2/DynamicForm/components/RJSFWidget/CustomYearPickerTopLabelWidget';
import { applyMultiSelectTopLabelFields } from '@shared-lib-v2/DynamicForm/components/RJSFWidget/CustomMultiSelectTopLabelWidget';
import { applyTextFieldTopLabelFields } from '@shared-lib-v2/DynamicForm/components/RJSFWidget/CustomTextFieldTopLabelWidget';
import Loader from '@/components/Loader';
import { useTranslation } from 'react-i18next';
import { useTranslation as useSharedTranslation } from '@shared-lib-v2/lib/context/LanguageContext';
import { showToastMessage } from '../../Toastify';
import { createUser, updateUser } from '@/services/CreateUserService';
import {
  firstLetterInUpperCase,
  getReassignPayload,
  getUserFullName,
  isUnderEighteen,
} from '@/utils/helper';
import { sendCredentialService } from '@/services/NotificationService';
import {
  notificationCallback,
  splitUserData,
  telemetryCallbacks,
} from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import {
  bulkCreateCohortMembers,
  createCohort,
  updateCohortUpdate,
  updateReassignUser,
} from '@/services/CohortService/cohortService';
import { RoleId, TENANT_DATA } from '@/utils/app.constant';
import _ from 'lodash';
import { fetchAttendanceStats } from '@/utils/helperAttendanceStatApi';
const AddEditUser = ({
  SuccessCallback,
  schema,
  uiSchema,
  editPrefilledFormData,
  isEdit = false,
  isReassign = false,
  editableUserId,
  UpdateSuccessCallback,
  extraFields,
  extraFieldsUpdate,
  successUpdateMessage,
  telemetryUpdateKey,
  failureUpdateMessage,
  successCreateMessage,
  telemetryCreateKey,
  failureCreateMessage,
  notificationKey,
  notificationMessage,
  notificationContext,
  isNotificationRequired = true,
  blockFieldId,
  districtFieldId,
  isExtraFields = true,
  villageFieldId,
  centerFieldId,
  type,
  hideSubmit,
  setButtonShow,
  isSteeper,
  parentData = [],
}) => {
  console.log('parentData=======>', parentData);
  // Learner add/edit in the Pathways program uses DynamicFormV3; everything else keeps DynamicForm
  const isPathwaysProgram =
    typeof window !== 'undefined' &&
    [localStorage.getItem('tenantName'), localStorage.getItem('program')].some(
      (name) =>
        name?.toLowerCase() ===
        TENANT_DATA.SECOND_CHANCE_PROGRAM_PATHWAYS.toLowerCase()
    );
  const isPathwaysLearnerForm = isPathwaysProgram && type === 'learner';
  const UserForm = isPathwaysLearnerForm ? DynamicFormV3 : DynamicForm;
  const [isLoading, setIsLoading] = useState(false);
  const [showAssignmentScreen, setShowAssignmentScreen] =
    useState<boolean>(false);
  const [formData, setFormData] = useState<any>();
  const [districtId, setDistrictId] = useState<any>();
  const [prefilledFormData, setPrefilledFormData] = useState(
    editPrefilledFormData
  );
  // console.log(
  //   '#### reassign issue debug editPrefilledFormData',
  //   editPrefilledFormData
  // );

  // Use react-i18next for translations
  const { t, i18n } = useTranslation();
  const reactI18nLanguage = i18n.language;
  
  // Use @shared-lib-v2 LanguageContext to sync language changes
  const { setLanguage: setSharedLanguage } = useSharedTranslation();

  // Sync react-i18next language changes to @shared-lib-v2 LanguageContext
  useEffect(() => {
    if (reactI18nLanguage && setSharedLanguage) {
      setSharedLanguage(reactI18nLanguage);
    }
  }, [reactI18nLanguage, setSharedLanguage]);

  const [tempArray, setTempArray] = useState<any>([]);
  const [alteredSchema, setAlteredSchema] = useState<any>(null);
  const [alteredUiSchema, setAlteredUiSchema] = useState<any>(null);

  useEffect(() => {
    let isEditSchema = _.cloneDeep(schema);
    let isEditUiSchema = _.cloneDeep(uiSchema);

    if (localStorage.getItem('stateId')) {
      // console.log('##########isEditUiSchema', isEditUiSchema);
      // ✅ Add `ui:disabled` to the `state` field
      if (isEditUiSchema?.state) {
        isEditUiSchema.state['ui:disabled'] = true;
      }
    }

    if (isEdit) {
      console.log('########### debug issue ', isEditUiSchema);
      let keysToRemove = [];
      if (type == 'centers') {
        keysToRemove = ['state', 'district', 'block', 'village'];
        //disable center type if value present
        if (editPrefilledFormData?.center_type) {
          isEditUiSchema = {
            ...isEditUiSchema,
            center_type: {
              ...isEditUiSchema.center_type,
              'ui:disabled': true,
            },
          };
        }
      } else if (type == 'batch') {
        keysToRemove = ['state', 'district', 'block', 'village', 'parentId'];
      } else if (type == 'learner') {
        keysToRemove = [
          // 'state',
          // 'district',
          // 'block',
          // 'village',
          'password',
          'confirm_password',
          'board',
          'medium',
          'parentId',
          'center',
          'batch',
          'grade',
          'center',
          'program',
          'privacy_consent',
          'parent_guardian_consent',
          //  'class',
          // 'marital_status',
          // 'phone_type_available',
          //  'own_phone_check',

          // 'ownphonecheck',
          //  'parent_phone',
          // 'preferred_mode_of_learning',
          //'drop_out_reason',
          // 'work_domain',
          //  'what_do_you_want_to_become',
          // 'guardian_name',
          // 'guardian_relation',
          // 'dob',
        ];
      } else {
        keysToRemove = [
          'state',
          'district',
          'block',
          'village',
          'password',
          'confirm_password',
          'board',
          'medium',
          'parentId',
          'center',
          'batch',
          'grade',
          'center',
          'program',
        ];
      }
      keysToRemove.forEach((key) => delete isEditSchema.properties[key]);
      keysToRemove.forEach((key) => delete isEditUiSchema[key]);
      //also remove from required if present
      isEditSchema.required = isEditSchema.required.filter(
        (key: any) => !keysToRemove.includes(key)
      );

      // Disable name fields and username for learner editing
      if (type === 'learner' && isEdit) {
        const fieldsToDisable = [
          'firstName',
          'middleName',
          'lastName',
          'username',
        ];
        fieldsToDisable.forEach((fieldName) => {
          if (isEditUiSchema[fieldName]) {
            isEditUiSchema[fieldName] = {
              ...isEditUiSchema[fieldName],
              'ui:disabled': true,
            };
          }
        });
      }
      // console.log('isEditSchema', JSON.stringify(isEditSchema));
    } else if (isReassign) {
      let originalRequired = isEditSchema.required;
      const keysToHave = [
        'state',
        'district',
        'block',
        'village',
        'parentId',
        'center',
        'batch',
      ];
      isEditSchema = {
        type: 'object',
        properties: keysToHave.reduce((obj, key) => {
          if (isEditSchema.properties[key]) {
            obj[key] = isEditSchema.properties[key];
          }
          return obj;
        }, {}),
      };
      isEditUiSchema = keysToHave.reduce((obj, key) => {
        if (isEditUiSchema[key]) {
          obj[key] = isEditUiSchema[key];
        }
        return obj;
      }, {});
      isEditSchema.required = originalRequired;

      //also remove from required if present
      isEditSchema.required = isEditSchema.required.filter((key) =>
        keysToHave.includes(key)
      );
    } else {
      const keysToRemove = ['password', 'confirm_password', 'program', 'privacy_consent', 'parent_guardian_consent'];
      keysToRemove.forEach((key) => delete isEditSchema?.properties[key]);
      keysToRemove.forEach((key) => delete isEditUiSchema[key]);
      //also remove from required if present
      isEditSchema.required = isEditSchema.required.filter(
        (key) => !keysToRemove.includes(key)
      );
      // console.log('isEditSchema', JSON.stringify(isEditSchema));
    }
    console.log('isEditUiSchema', isEditUiSchema);
    if (type == 'learner') {
      const desiredOrder = [
        'state',
        'district',
        'block',
        'village',
        'firstName',
        'middleName',
        'lastName',
        'username',

        'gender',
        'dob',
        'mobile',
        'guardian_name',
        'guardian_relation',
        'parent_phone',
        'family_member_details',
        'father_name',
        'mother_name',
        'spouse_name',
        'class',
        'marital_status',
        'phone_type_accessible',
        // 'own_phone_check',
        'ownphonecheck',

        'password',
        'confirm_password',
        'program',
      ];

      // Filter only existing keys from the object - this will automatically exclude fields that were removed
      const updatedOrder = desiredOrder.filter((key) => key in isEditUiSchema);

      // Optionally, include any extra keys that were not in your desired list but exist in uiSchema
      const remainingKeys = Object.keys(isEditUiSchema).filter(
        (key) => key !== 'ui:order' && !updatedOrder.includes(key)
      );

      isEditUiSchema['ui:order'] = [...updatedOrder, ...remainingKeys];

      console.log('Updated ui:order', isEditUiSchema['ui:order']);
    }

    // Pathways asks for the learner's Class 10 passing year through a year picker
    if (isPathwaysLearnerForm) {
      const yearPickerForm = applyYearPickerTopLabelFields(
        isEditSchema,
        isEditUiSchema,
        ['inWhichYearDidYouPassClass10']
      );
      isEditSchema = yearPickerForm.schema;
      isEditUiSchema = yearPickerForm.uiSchema;
      // Class 10 drop downs show their label above the field
      isEditUiSchema = applyMultiSelectTopLabelFields(isEditUiSchema, [
        'fromWhichBoardDidYouPassClass10',
        'whatDivision/PercentageDidYouGetInClass10',
        "haveYouStudiedInPratham'sSecondChanceProgram",
      ]);
      isEditUiSchema = applyTextFieldTopLabelFields(isEditUiSchema, [
        'fromWhichBoardDidYouPassClass10Other',
      ]);
    }

    setAlteredSchema(isEditSchema);
    setAlteredUiSchema(isEditUiSchema);
  }, [isEdit, isReassign, reactI18nLanguage]);
  const isBelow18 = (dob: any) => {
    const birthDate = new Date(dob);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age < 18;
  };

  const FormSubmitFunction = async (formData: any, payload: any) => {
    setPrefilledFormData(formData);
    console.log(formData, 'formdata');
    console.log('########## debug username', payload);

    if (isEdit) {
      if (isNotificationRequired) {
        try {
          const { userData, customFields } = splitUserData(payload);
          //update email and username if email changed
          if (userData?.email) {
            if (editPrefilledFormData?.email == userData?.email) {
              delete userData?.email;
            } else {
              userData.username = userData?.email;
            }
          }

          //bug fix for if email is empty then don't sent
          if (type == 'learner') {
            if (userData?.email == '') {
              delete userData.email;
            }
          }
          //fix for learner edit username is not sent if not changed
          if (userData?.username) {
            if (editPrefilledFormData?.username == userData?.username) {
              delete userData?.username;
            }
          }
          // console.log('userData', userData);
          // console.log('customFields', customFields);
          if (type == 'learner') {
            if (isUnderEighteen(userData?.dob)) {
              const parentPhoneField = customFields.find(
                (field: any) => field.value === formData.parent_phone
              );
              console.log('Parent Phone Field:', parentPhoneField);
              if (parentPhoneField) {
                userData.mobile = parentPhoneField.value;
              }
            } else {
              // For users 18 or older, use the mobile field directly
              userData.mobile = formData?.mobile || userData?.mobile;
            }
          }
          const object = {
            userData: userData,
            customFields: customFields,
          };
          if (!isBelow18(userData?.dob)) {
            object.customFields = [...parentData, ...customFields];
          }
          console.log('object===>', object);
          const updateUserResponse = await updateUser(editableUserId, object);
          // console.log('updatedResponse', updateUserResponse);

          if (
            updateUserResponse &&
            updateUserResponse?.data?.params?.err === null
          ) {
            showToastMessage(t(successUpdateMessage), 'success');
            telemetryCallbacks(telemetryUpdateKey);

            if (typeof UpdateSuccessCallback === 'function') {
              UpdateSuccessCallback();
            }
            // localStorage.removeItem('BMGSData');
          } else {
            // console.error('Error update user:', error);
            showToastMessage(t(failureUpdateMessage), 'error');
          }
        } catch (error) {
          console.error('Error update user:', error);
          showToastMessage(t(failureUpdateMessage), 'error');
        }
      } else {
        const userId = localStorage.getItem('userId');
        const updatedPayload = {
          ...payload,
          updatedBy: userId,
        };

        const resp = await updateCohortUpdate(editableUserId, updatedPayload);
        if (resp) {
          showToastMessage(t(successUpdateMessage), 'success');
          telemetryCallbacks(telemetryUpdateKey);

          if (typeof UpdateSuccessCallback === 'function') {
            UpdateSuccessCallback();
          }
        } else {
          // console.error('Error update user:', error);
          showToastMessage(t(failureUpdateMessage), 'error');
        }
      }
    } else if (isReassign) {
      const attendanceStats = await fetchAttendanceStats(editableUserId);
      if (attendanceStats && attendanceStats.length > 0) {
        showToastMessage(
          t('COMMON.CANNOT_REASSIGN_TODAY_ATTENDANCE_MARKED'),
          'error'
        );
      } else {
        try {
          // console.log('new', formData?.batch);
          // console.log(editPrefilledFormData?.batch, 'old');
          delete payload?.batch;
          console.log('payload', payload);
          const reassignmentPayload = {
            ...payload,
            ...(type === 'team-leader' && {
              automaticMember: {
                value: true,
                fieldId: blockFieldId,
                fieldName: 'BLOCK',
              },
            }),
            userData: {
              firstName: formData.firstName,
            },
          };
          const resp = await updateReassignUser(
            editableUserId,
            reassignmentPayload
          );
          if (resp) {
            if (type !== 'team-leader') {
              const cohortIdPayload = getReassignPayload(
                editPrefilledFormData.batch,
                formData.batch
              );
              const res = await bulkCreateCohortMembers({
                userId: [editableUserId],
                cohortId: cohortIdPayload.cohortId,
                removeCohortId: cohortIdPayload.removedIds,
              });
            }
            showToastMessage(t(successUpdateMessage), 'success');
            telemetryCallbacks(telemetryUpdateKey);
            if (typeof UpdateSuccessCallback === 'function') {
              UpdateSuccessCallback();
            }
          } else {
            // console.error('Error reassigning user:', error);
            showToastMessage(t(failureUpdateMessage), 'error');
          }
        } catch (error) {
          console.error('Error reassigning user:', error);
          showToastMessage(t(failureUpdateMessage), 'error');
        }
      }
    } else {
      if (isNotificationRequired) {
        if (
          Array.isArray(payload.tenantCohortRoleMapping) &&
          payload.tenantCohortRoleMapping[0] &&
          payload.tenantCohortRoleMapping[0]['roleId'] !== RoleId.STUDENT
        ) {
          payload.username = formData.email;
        }
      }
      if (
        Array.isArray(payload.tenantCohortRoleMapping) &&
        payload.tenantCohortRoleMapping[0] &&
        payload.tenantCohortRoleMapping[0]['roleId'] === RoleId.TEAM_LEADER &&
        (localStorage.getItem('program') === TENANT_DATA.SECOND_CHANCE_PROGRAM ||
          localStorage.getItem('program') ===
            TENANT_DATA.SECOND_CHANCE_PROGRAM_PATHWAYS)
      ) {
        payload.automaticMember = {
          value: true,
          fieldName: 'Block',
          fieldId: blockFieldId,
        };
      }

      // Ensure batch is included from formData or prefilledFormData if missing from payload
      // This handles cases where hidden fields might not be included in the submitted payload
      if (!payload.batch && (formData?.batch || editPrefilledFormData?.batch)) {
        payload.batch = formData?.batch || editPrefilledFormData?.batch;
      }

      if (payload.batch) {
        const cohortIds = payload.batch;
        // payload.tenantCohortRoleMapping.push(cohortIds);
        payload.tenantCohortRoleMapping[0]['cohortIds'] = cohortIds;

        delete payload.batch;
        // delete payload.center;
      }
      try {
        if (isNotificationRequired) {
          //bug fix for if email is empty then don't sent
          if (type == 'learner') {
            if (payload?.email == '') {
              delete payload.email;
            }
            if (isUnderEighteen(payload?.dob)) {
              payload.mobile = formData?.parent_phone;
            } else {
              // For users 18 or older, use the mobile field directly
              payload.mobile = formData?.mobile || payload?.mobile;
            }
          }
          const responseUserData = await createUser(payload, t);

          if (responseUserData?.userData?.userId) {
            showToastMessage(t(successCreateMessage), 'success');

            telemetryCallbacks(telemetryCreateKey);
            if (typeof SuccessCallback === 'function') {
              SuccessCallback();
            }

            // Send Notification with credentials to user
            try {
              await notificationCallback(
                successCreateMessage,
                notificationContext,
                notificationKey,
                payload,
                t,
                notificationMessage,
                type
              );
            } catch (notificationError) {
              console.error('Notification failed:', notificationError);
              // No failure toast here to prevent duplicate messages
            }
          } else {
            showToastMessage(t(failureCreateMessage), 'error');
          }
        } else {
          if (type == 'batch') {
            let customFields = payload.customFields;
            // delete payload.customFields;
            let newCustomFields = removeFields(customFields, [
              '6469c3ac-8c46-49d7-852a-00f9589737c5',
              'b61edfc6-3787-4079-86d3-37262bf23a9e',
              '4aab68ae-8382-43aa-a45a-e9b239319857',
              '8e9bb321-ff99-4e2e-9269-61e863dd0c54',
            ]);
            payload.customFields = newCustomFields;
          }
          // payload.delete(customFields)
          const centerCreation = await createCohort(payload);
          console.log('centerCreatedResponse: ', centerCreation);
          if (centerCreation) {
            showToastMessage(t(successCreateMessage), 'success');
            telemetryCallbacks(telemetryCreateKey);
            if (typeof SuccessCallback === 'function') {
              SuccessCallback();
            }
          } else {
            showToastMessage(t(failureCreateMessage), 'error');
          }
        }
      } catch (error) {
        console.error('Error creating user:', error);
        showToastMessage(t(failureCreateMessage), 'error');
      }
    }
  };

  const removeFields = (data, fieldIdsToRemove) => {
    return data.filter((item) => !fieldIdsToRemove.includes(item.fieldId));
  };

  const StepperFormSubmitFunction = async (formData: any, payload: any) => {
    setDistrictId(formData?.district);
    setFormData(formData);
    setShowAssignmentScreen(true);
    // setButtonShow(false);
  };
  const onClose = () => {
    // setOpenDelete(false);
    //   setOpenReassignDistrict(false);
    //   setOpenReassignVillage(false);
    //   setAddNew(false);
    //   setCount(0);
    setShowAssignmentScreen(false);
    // setButtonShow(true)
    setFormData({});
    if (typeof SuccessCallback === 'function') {
      SuccessCallback();
    }
  };
  return (
    // <>
    //   {isLoading ? (
    //     <>
    //       <Loader showBackdrop={false} loadingText={t('COMMON.LOADING')} />
    //     </>
    //   ) : (
    //     alteredSchema &&
    //     alteredUiSchema && (
    //       <DynamicForm
    //         schema={alteredSchema}
    //         uiSchema={alteredUiSchema}
    //         t={t}
    //         FormSubmitFunction={FormSubmitFunction}
    //         prefilledFormData={prefilledFormData || {}}
    //         extraFields={isEdit ? extraFieldsUpdate : extraFields}
    //       />
    //     )
    //   )}
    // </>
    <>
      {/* { console.log(formData, 'formData')} */}

      {isLoading ? (
        <Loader showBackdrop={false} loadingText={t('COMMON.LOADING')} />
      ) : (
        alteredSchema &&
        alteredUiSchema && (
          <>
            {/* {isEdit ? (
              // When editing, show DynamicForm regardless of role
              <DynamicForm
                schema={alteredSchema}
                uiSchema={alteredUiSchema}
                t={t}
                FormSubmitFunction={FormSubmitFunction}
                prefilledFormData={prefilledFormData || {}}
                extraFields={extraFieldsUpdate}
                hideSubmit={hideSubmit}
              />
            ) : type === 'facilitator' ? (
              // When role is facilitator and not editing, show StepperForm with facilitator-specific props
              <StepperForm
                FormSubmitFunction={StepperFormSubmitFunction}
                setShowAssignmentScreen={setShowAssignmentScreen}
                showAssignmentScreen={showAssignmentScreen}
                formData={formData}
                setFormData={setFormData}
                onClose={onClose}
                parenResult={{}}
                parentId={formData?.district}
                stateId={formData?.state?.[0]}
                districtId={formData?.district?.[0]}
                blockId={formData?.block?.[0]}
                villageId={formData?.village?.[0]}
                // facilitatorProp="yourFacilitatorValue"
                role={type}
                // add any additional prop(s) for facilitator
                hideSubmit={hideSubmit}
                setButtonShow={setButtonShow}
                isReassign={isReassign}
                isEditSchema={alteredSchema}
                isEditUiSchema={alteredUiSchema}
                extraFieldsUpdate={extraFieldsUpdate}
                extraFields={extraFields}
                prefilledFormData={prefilledFormData || {}}
                schema={alteredSchema}
                uiSchema={alteredUiSchema}
                selectedCohortId={
                  editPrefilledFormData?.batch?.length
                    ? editPrefilledFormData?.batch
                    : ''
                }
                successUpdateMessage={successUpdateMessage}
                UpdateSuccessCallback={UpdateSuccessCallback}
                editPrefilledFormData={editPrefilledFormData}
                editableUserId={editableUserId}
              />
            ) : type === 'mentor' ? (
              <StepperForm
                FormSubmitFunction={StepperFormSubmitFunction}
                setShowAssignmentScreen={setShowAssignmentScreen}
                showAssignmentScreen={showAssignmentScreen}
                formData={formData}
                setFormData={setFormData}
                onClose={onClose}
                parenResult={{}}
                parentId={formData?.district}
                stateId={formData?.state?.[0]}
                districtId={formData?.district?.[0]}
                //mentorProp="yourMentorValue" // add any additional prop(s) for mentor
                role={type}
                hideSubmit={hideSubmit}
              />
            ) : isReassign ? (
              // When editing, show DynamicForm regardless of role
              prefilledFormDataReas && (
                <DynamicForm
                  schema={alteredSchema}
                  uiSchema={alteredUiSchema}
                  t={t}
                  FormSubmitFunction={FormSubmitFunction}
                  prefilledFormData={prefilledFormDataReas}
                  extraFields={extraFieldsUpdate}
                  hideSubmit={hideSubmit}
                />
              )
            ) : (
              <DynamicForm
                schema={alteredSchema}
                uiSchema={alteredUiSchema}
                t={t}
                FormSubmitFunction={FormSubmitFunction}
                prefilledFormData={prefilledFormData || {}}
                hideSubmit={hideSubmit}
                extraFields={
                  isEdit || isReassign ? extraFieldsUpdate : extraFields
                }
              />
            )} */}
            <UserForm
              schema={alteredSchema}
              uiSchema={alteredUiSchema}
              t={t}
              FormSubmitFunction={FormSubmitFunction}
              prefilledFormData={prefilledFormData || {}}
              hideSubmit={hideSubmit}
              extraFields={
                isEdit || isReassign ? extraFieldsUpdate : extraFields
              }
              type={type == 'learner' ? type : ''}
              isReassign={isReassign}
            />
          </>
        )
      )}
    </>
  );
};

export default AddEditUser;
