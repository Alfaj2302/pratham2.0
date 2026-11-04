import { extractMatchingKeys } from '@shared-lib-v2/DynamicForm/components/DynamicFormCallback';
import {
  extractVisibilityRules,
  getHiddenFields,
} from '@shared-lib-v2/DynamicForm/utils/conditionalVisibility';

export enum Storage {
  USER_DATA = 'userData',
  NAME = 'name',
  USER_ID = 'userId',
}

export const firstLetterInUpperCase = (label: string): string => {
  if (!label) {
    return '';
  }

  return label
    ?.split(' ')
    ?.map((word) => word?.charAt(0).toUpperCase() + word?.slice(1))
    ?.join(' ');
};
const getSelectedValueName = (fields: any, label: any) => {
  const field = fields.find((f: any) => f.label === label);
  if (field && field.selectedValues && field.selectedValues.length > 0) {
    return field.selectedValues[0]; // Return the first selected value
  }

  return null;
};
// When a form schema is passed, schema fields the fixed mapping below doesn't
// cover (or leaves empty) are filled from userData.customFields by fieldId.
export const mapUserData = (userData: any, schema?: any) => {
  console.log(userData, 'userData===>');
  try {
    const getSelectedValue = (label: any) =>
      userData.customFields
        .find((f: any) => f.label === label)
        ?.selectedValues.map((v: any) => v?.id?.toString() || v?.value?.toString()) || '';
    const getSelectedValueString = (label: any): string => {
      const selected = userData.customFields.find(
        (f: any) => f.label === label
      )?.selectedValues?.[0];
      return (
        selected?.value?.toString() ||
        (typeof selected === 'string' ? selected : '') ||
        ''
      );
    };

    const getSingleSelectedValue = (label: any) => {
      const selected = userData.customFields.find(
        (f: any) => f.label === label
      )?.selectedValues[0];
      return (
        selected?.id?.toString() ||
        selected?.value?.toString() ||
        (typeof selected === 'string' ? selected : '') ||
        ''
      );
    };

    const getSingleTextValue = (label: any) =>
      userData.customFields.find((f: any) => f.label === label)
        ?.selectedValues[0] || '';

    const result: any = {
      firstName: userData.firstName || '',
      //  middleName: userData.middleName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      mobile: userData.mobile ? userData.mobile?.toString() : '',
      dob: userData.dob || '',
      gender: userData.gender || '',
       mother_name: getSingleTextValue('MOTHER_NAME'),
        number_of_children:getSingleTextValue('NUMBER_OF_CHILDREN'),
        number_of_children_in_your_group: getSingleTextValue('NUMBER_OF_CHILDREN_IN_YOUR_GROUP'),
              father_name: getSingleTextValue('FATHER_NAME'),
                            spouse_name: getSingleTextValue('SPOUSE_NAME'),


      marital_status: getSelectedValue('MARITAL_STATUS'),
      phone_type_accessible
: getSingleSelectedValue('TYPE_OF_PHONE_ACCESSIBLE'),
    family_member_details
: getSingleSelectedValue('FAMILY_MEMBER_DETAILS'),
      own_phone_check: getSingleSelectedValue('DOES_THIS_PHONE_BELONG_TO_YOU'),
      state: getSelectedValue('STATE'),
      district: getSelectedValue('DISTRICT'),
      block: getSelectedValue('BLOCK'),
      village: getSelectedValue('VILLAGE'),
      // is_volunteer: getSingleTextValue('IS_VOLUNTEER'),
      drop_out_reason:
        getSelectedValue('REASON_FOR_DROP_OUT_FROM_SCHOOL') || [], // array
      // Keep program dropdown empty on edit; user should select explicitly
      what_program_are_you_part_of: getSelectedValue('WHAT PROGRAM ARE YOU PART OF') || [],
    //  what_program_are_you_part_of: [],
      work_domain:
        getSelectedValue(
          'WHAT_IS_YOUR_PRIMARY_WORK'
        ) || [],
      training_check: getSingleSelectedValue(
        'HAVE_YOU_RECEIVE_ANY_PRIOR_TRAINING'
      ),
      what_do_you_want_to_become: getSingleTextValue(
        'WHAT_DO_YOU_WANT_TO_BECOME'
      ),
      class: getSelectedValue(
        'HIGHEST_EDCATIONAL_QUALIFICATION_OR_LAST_PASSED_GRADE'
      ), // string

      preferred_mode_of_learning:
        getSelectedValueString('WHAT_IS_YOUR_PREFERRED_MODE_OF_LEARNING') || "",
      what_is_your_preferred_language: getSelectedValue('WHAT_IS_YOUR_PREFERRED_LANGUAGE') || []
    };
    if (userData.middleName) {
      result.middleName = userData.middleName;
    }
    if (getSingleTextValue('MOTHER_NAME')) {
      result.mother_name = getSingleTextValue('MOTHER_NAME');
    }
    if (getSingleTextValue('IS_VOLUNTEER')) {
      result.is_volunteer = getSingleTextValue('IS_VOLUNTEER');
    }
     if (getSingleTextValue('NUMBER_OF_CHILDREN')) {
result.number_of_children = getSingleTextValue('NUMBER_OF_CHILDREN');
result.number_of_children_in_your_group = getSingleTextValue('NUMBER_OF_CHILDREN_IN_YOUR_GROUP');
    }
    if (getSelectedValueName(userData.customFields, 'NAME_OF_GUARDIAN')) {
      result.guardian_name =
        getSelectedValueName(userData.customFields, 'NAME_OF_GUARDIAN') || '';
    }
    if (getSelectedValueName(userData.customFields, 'RELATION_WITH_GUARDIAN')) {
      result.guardian_relation =
        getSelectedValueName(userData.customFields, 'RELATION_WITH_GUARDIAN') ||
        '';
    }
    if (
      getSelectedValueName(userData.customFields, 'PARENT_GUARDIAN_PHONE_NO')
    ) {
      result.parent_phone =
        getSelectedValueName(
          userData.customFields,
          'PARENT_GUARDIAN_PHONE_NO'
        ) || '';
    }
    if (schema?.properties) {
      const isEmptyValue = (value: any) =>
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0);
      try {
        Object.entries(extractMatchingKeys(userData, schema)).forEach(
          ([key, value]) => {
            if (isEmptyValue(result[key]) && !isEmptyValue(value)) {
              result[key] = value;
            }
          }
        );
      } catch (error) {
        // Keep the fixed mapping if a custom field has an unexpected shape
        console.log('schema field mapping failed', error);
      }
    }
    console.log("result===>", result);
    return result;
  } catch (error) {
    console.log(error);
  }
};

// Usage
export const getMissingFields = (schema: any, userData: any) => {
  try {
    // use mapped data instead of raw userData
    // Map every schema field (not just mapUserData's fixed list), otherwise
    // filled custom fields count as missing.
    const mappedUserData = mapUserData(userData, schema);
    console.log(mappedUserData, 'mappedUserData');
    console.log(schema, 'schema');

    const isEmpty = (value: any) => {
      return (
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' &&
          !Array.isArray(value) &&
          Object.keys(value).length === 0)
      );
    };

    const clonedSchema = JSON.parse(JSON.stringify(schema));

    const fieldsToRemove = [
      'password',
      'confirm_password',
      'username',
      'program',
      'batch',
      'center',
      'state',
      'district',
      'block',
      'village',
      // middle name is optional, filled or not it should never mark the profile incomplete
    ];

    fieldsToRemove.forEach((field) => {
      delete clonedSchema.properties[field];
    });

    if (Array.isArray(clonedSchema.required)) {
      clonedSchema.required = clonedSchema.required.filter(
        (field: any) => !fieldsToRemove.includes(field)
      );
    }

    const guardianFields = [
      'guardian_name',
      'guardian_relation',
      'parent_phone',
    ];

    const result: any = {
      type: clonedSchema.type,
      properties: {},
      required: [],
    };

    // Check keys using mappedUserData
    Object.keys(clonedSchema.properties).forEach((key) => {
      if (!(key in mappedUserData) || isEmpty(mappedUserData[key])) {
        result.properties[key] = clonedSchema.properties[key];
      }
    });

    if (Array.isArray(clonedSchema.required)) {
      result.required = clonedSchema.required.filter(
        (field: any) =>
          !(field in mappedUserData) || isEmpty(mappedUserData[field])
      );
    }

    // Remove guardian fields from result
    guardianFields.forEach((field) => {
      delete result.properties[field];
    });

    if (Array.isArray(result.required)) {
      result.required = result.required.filter(
        (field: any) => !guardianFields.includes(field)
      );
    }

    // const hasDOB = !!mappedUserData.dob;
    // if (hasDOB) {
    //   guardianFields.forEach((field) => {
    //     if (!mappedUserData[field] || isEmpty(mappedUserData[field])) {
    //       // Use the field from schema if available, otherwise fallback
    //       result.properties[field] = clonedSchema.properties[field] || {
    //         type: 'string',
    //         title: field.replace(/_/g, ' ').toUpperCase(),
    //       };
    //     }
    //   });
    // } else {
    //   guardianFields.forEach((field) => {
    //     if (field in result.properties) {
    //       delete result.properties[field];
    //     }
    //   });
    // }

    // if (result.properties.dob) {
    //   guardianFields.forEach((field) => {
    //     if (!result.properties[field]) {
    //       result.properties[field] = {
    //         type: 'string',
    //         title: field.toUpperCase(),
    //       };
    //     }
    //   });
    // } else {
    //   guardianFields.forEach((field) => {
    //     if (result.properties[field]) {
    //       delete result.properties[field];
    //     }
    //   });
    // }
    if(mappedUserData.spouse_name) {
      delete result.properties.mother_name;
            delete result.properties.father_name;

    }
   else if(mappedUserData.father_name ) {
    delete result.properties.mother_name;
            delete result.properties.spouse_name;
    }
   else if(mappedUserData.mother_name) {
    delete result.properties.spouse_name;
            delete result.properties.father_name;
    }

    // Conditional fields (extra.skipAndHide / extra.skipAndShow). A field the
    // learner's saved answers hide (e.g. "Other university" when SSPU was
    // chosen) isn't missing. A missing field controlled by a saved answer
    // brings that controlling field along, so the form can prefill it and
    // re-evaluate visibility if the learner changes the answer.
    const answeredRules = Object.fromEntries(
      Object.entries(extractVisibilityRules(clonedSchema)).filter(
        ([key]) => !isEmpty(mappedUserData[key])
      )
    );
    const hiddenBySavedAnswers = getHiddenFields(answeredRules, mappedUserData);
    hiddenBySavedAnswers.forEach((field) => delete result.properties[field]);
    result.required = result.required.filter(
      (field: any) => !hiddenBySavedAnswers.has(field)
    );

    Object.entries(answeredRules).forEach(([controllingKey, rule]: any) => {
      const dependentFields = [
        ...Object.values(rule.skipAndHide || {}),
        ...Object.values(rule.skipAndShow || {}),
      ].flat() as string[];
      const hasMissingDependent = dependentFields.some(
        (field) => field in result.properties
      );
      if (hasMissingDependent && !result.properties[controllingKey]) {
        result.properties[controllingKey] =
          clonedSchema.properties[controllingKey];
        if (clonedSchema.required?.includes(controllingKey)) {
          result.required.push(controllingKey);
        }
      }
    });

    return result;
  } catch (error) {
    console.error('Error in getMissingFields:', error);
    return null;
  }
};
export const maskMobileNumber = (mobile: string) => {
  if (mobile && mobile.length < 2) return mobile;
  else if (mobile) {
    const first = mobile[0];
    const last = mobile[mobile.length - 1];
    const masked = '*'.repeat(mobile.length - 2);
    return first + masked + last;
  }
};
export const preserveLocalStorage = () => {
  const keysToKeep = [
    'preferredLanguage',
    'mui-mode',
    'mui-color-scheme-dark',
    'mui-color-scheme-light',
    'hasSeenTutorial',
    'lang',
    'uiConfig',
    'userProgram',
    'userProgramTenantId',
    // Kept so logout can send NavaPatham learners back to /navapatham
    'isForNavaPatham'
  ];

  const valuesToKeep: { [key: string]: any } = {};

  keysToKeep.forEach((key: string) => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      valuesToKeep[key] = value;
    }
  });

  localStorage.clear();

  keysToKeep.forEach((key: string) => {
    if (valuesToKeep[key] !== undefined) {
      localStorage.setItem(key, valuesToKeep[key]);
    }
  });
};
export const isUnderEighteen = (dobString: any): boolean => {
  if (!dobString) return false;

  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return false; // Invalid date check

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age < 18;
};

export const SUPPORTED_MIME_TYPES = [
  'application/vnd.ekstep.ecml-archive',
  'application/vnd.ekstep.html-archive',
  'application/vnd.ekstep.h5p-archive',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'application/epub',
  'video/x-youtube',
  'application/vnd.sunbird.questionset',
];
export const toPascalCase = (name: string | any) => {
  if (typeof name !== 'string') {
    return name;
  }

  return name
    ?.toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const formatDate = (dateString: string) => {
  if (dateString) {
    const dateOnly = dateString?.split('T')[0];
    const [year, monthIndex, day] = dateOnly.split('-');
    const MONTHS = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const month = MONTHS[parseInt(monthIndex, 10) - 1];
    return `${day} ${month}, ${year}`;
  }
};

export const transformLabel = (label: string): string => {
  if (typeof label !== 'string') {
    return label;
  }
  return label
    ?.toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};
