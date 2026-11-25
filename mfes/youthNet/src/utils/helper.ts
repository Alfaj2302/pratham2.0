import FingerprintJS from 'fingerprintjs2';
import {
  Role,
  DateFilter,
  cohortHierarchy,
  VolunteerField,
} from './app.constant';
import { AssessmentType } from './app.config';
import { format, parseISO } from 'date-fns';

export const generateUUID = () => {
  let d = new Date().getTime();
  let d2 =
    (typeof performance !== 'undefined' &&
      performance.now &&
      performance.now() * 1000) ||
    0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    let r = Math.random() * 16; //NOSONAR
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

export const getDeviceId = () => {
  return new Promise((resolve) => {
    FingerprintJS.get((components: any[]) => {
      const values = components.map((component) => component.value);
      const deviceId = FingerprintJS.x64hash128(values.join(''), 31);
      resolve(deviceId);
    });
  });
};

export const getLoggedInUserRole = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('role') || '';
  }
  return '';
};

export const filterUsersByAge = (users: any[]) => {
  const today = new Date();

  return users.reduce(
    (result, user) => {
      if (!user || !user.dob) {
        // If user has no dob, push them into "above18" (assuming unknown age is treated as adult)
        result.below18.push(user);
        return result;
      }

      const birthDate = new Date(user.dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();

      // Adjust age if birthday hasn't occurred yet this year
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
      }

      if (age >= 18) {
        result.above18.push(user);
      } else {
        result.below18.push(user);
      }

      return result;
    },
    { above18: [], below18: [] } // Initial value for the accumulator
  );
};
export const getAge = (dobString: any) => {
  console.log(dobString);
  const dob = new Date(dobString);
  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }
  console.log(age);
  return age;
};
export const getAgeInMonths = (dobString: any) => {
  console.log(dobString);
  const dob = new Date(dobString);
  const today = new Date();

  const monthsOld =
    (today.getFullYear() - dob.getFullYear()) * 12 +
    (today.getMonth() - dob.getMonth());

  console.log(monthsOld);
  return monthsOld;
};
export const countUsersByFilter = ({
  users,
  filter,
}: {
  users: any[];
  filter: string;
}) => {
  let counts: Record<string, number> = {};
  let result: { date?: string; month?: string; count: number }[] = [];
  const today = new Date();

  if (filter === DateFilter.THIS_MONTH) {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    for (let d = new Date(firstDay); d <= today; d.setDate(d.getDate() + 1)) {
      let formattedDate = `${d.getDate().toString().padStart(2, '0')}/${(
        d.getMonth() + 1
      )
        .toString()
        .padStart(2, '0')}`;
      counts[formattedDate] = 0;
    }

    users.forEach((user: any) => {
      let date = new Date(user.createdAt);
      let formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(
        date.getMonth() + 1
      )
        .toString()
        .padStart(2, '0')}`;
      if (counts.hasOwnProperty(formattedDate)) {
        counts[formattedDate]++;
      }
    });

    result = Object.entries(counts).map(([key, count]) => ({
      date: key,
      count,
    }));
  } else if (
    filter === DateFilter.LAST_SIX_MONTHS ||
    filter === DateFilter.LAST_TWELEVE_MONTHS
  ) {
    let monthsToInclude = filter === DateFilter.LAST_SIX_MONTHS ? 6 : 12;

    for (let i = monthsToInclude; i > 0; i--) {
      // Start from monthsToInclude and decrement
      let date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      let formattedMonth = date.toLocaleString('en-US', { month: 'short' });
      counts[formattedMonth] = 0;
    }

    users.forEach((user: any) => {
      let date = new Date(user.createdAt);
      let formattedMonth = date.toLocaleString('en-US', { month: 'short' });
      if (counts.hasOwnProperty(formattedMonth)) {
        counts[formattedMonth]++;
      }
    });

    result = Object.entries(counts).map(([key, count]) => ({
      month: key,
      count,
    }));
  }

  return result;
};

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

export const accessGranted = (
  action: string,
  accessControl: { [key: string]: Role[] },
  currentRole: Role
): boolean => {
  if (accessControl[action]?.includes(currentRole)) {
    return true;
  }
  return false;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const debounced = function (
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ) {
    const context = this;
    clearTimeout(timeout);

    if (immediate && !timeout) func.apply(context, args);

    timeout = setTimeout(() => {
      timeout = undefined;
      if (!immediate) func.apply(context, args);
    }, wait);
  };

  // Add a cancel method to clear any pending timeout
  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = undefined;
  };

  return debounced;
};

export const getVillageUserCounts = (userData: any, villageData: any) => {
  try {
    console.log('User Data:', userData);
    console.log('Village Data:', villageData);

    if (!Array.isArray(villageData)) {
      console.log('Invalid villageData format.');
      throw new Error('Invalid data format: villageData is not an array.');
    }

    const userDetails = userData?.getUserDetails ?? []; // Ensure it's always an array

    const villageMap = villageData.reduce(
      (acc: Record<number, string>, village: any) => {
        if (village?.Id && village?.name) {
          acc[village.Id] = village.name;
        }
        return acc;
      },
      {}
    );

    const villageCounts: Record<
      number,
      { totalUserCount: number; todaysTotalUserCount: number }
    > = {};

    Object.keys(villageMap).forEach((villageId) => {
      villageCounts[Number(villageId)] = {
        totalUserCount: 0,
        todaysTotalUserCount: 0,
      };
    });

    if (userDetails.length === 0) {
      console.log(
        'No user details found. Returning all villages with zero counts.'
      );
      return Object.keys(villageCounts).map((villageId) => ({
        Id: Number(villageId),
        name: villageMap[Number(villageId)],
        totalCount: 0,
        newRegistrations: 0,
      }));
    }

    const today = new Date().toISOString().split('T')[0];

    userDetails.forEach((user: any) => {
      if (!user?.customFields) return;

      const villageField = user.customFields.find(
        (field: any) => field.label === cohortHierarchy.VILLAGE
      );

      if (villageField?.selectedValues?.length > 0) {
        const villageId = villageField.selectedValues?.[0].id;

        if (villageMap[villageId]) {
          villageCounts[villageId].totalUserCount += 1;

          if (user.createdAt.startsWith(today)) {
            villageCounts[villageId].todaysTotalUserCount += 1;
          }
        }
      }
    });

    return Object.keys(villageCounts).map((villageId) => ({
      Id: Number(villageId),
      name: villageMap[Number(villageId)],
      totalCount: villageCounts[Number(villageId)].totalUserCount,
      newRegistrations: villageCounts[Number(villageId)].todaysTotalUserCount,
    }));
  } catch (error) {
    console.error('Error in getVillageUserCounts:', error);
    return [];
  }
};

export const filterData = (data: any[], searchKey: string) => {
  if (!searchKey) return data;

  searchKey = searchKey.toLowerCase();

  return data.filter((item: any) =>
    item.name.toLowerCase().includes(searchKey)
  );
};

export const categorizeUsers = (users: any) => {
  console.log('users', users);
  const volunteerUsers: any = [];
  const youthUsers: any = [];

  users.forEach((user: any) => {
    const isVolunteerField = user.customFields.find(
      (field: any) => field.label === VolunteerField.IS_VOLUNTEER
    );

    if (
      isVolunteerField &&
      isVolunteerField.selectedValues[0] === VolunteerField.YES
    ) {
      volunteerUsers.push({
        userId: user.userId,
        username: user.username,
        email: user.email,
      });
    } else {
      youthUsers.push({
        userId: user.userId,
        username: user.username,
        email: user.email,
      });
    }
  });

  return { volunteerUsers, youthUsers };
};

export const filterSchema = (schemaObj: any) => {
  const locationFields = ['state', 'district', 'block', 'village'];
  const extractedFields: any = {};
  locationFields.forEach((field) => {
    if (schemaObj.schema.properties[field]) {
      extractedFields[field] = {
        title: schemaObj.schema.properties[field].title,
        fieldId: schemaObj.schema.properties[field].fieldId,
        field_type: schemaObj.schema.properties[field].field_type,
        maxSelection: schemaObj.schema.properties[field].maxSelection,
        isMultiSelect: schemaObj.schema.properties[field].isMultiSelect,
        'ui:widget': schemaObj.uiSchema[field]?.['ui:widget'] || 'select',
      };
    }
  });

  // Deep copy the schema object
  const newSchema = JSON.parse(JSON.stringify(schemaObj));

  locationFields.forEach((field) => {
    // Remove from schema properties
    delete newSchema.schema.properties[field];
    // Remove from uiSchema
    delete newSchema.uiSchema[field];

    // Remove from required array if exists
    const requiredIndex = newSchema.schema.required?.indexOf(field);
    if (requiredIndex > -1) {
      newSchema.schema.required.splice(requiredIndex, 1);
    }

    // Remove from ui:order array if exists
    const orderIndex = newSchema.uiSchema['ui:order']?.indexOf(field);
    if (orderIndex > -1) {
      newSchema.uiSchema['ui:order'].splice(orderIndex, 1);
    }
  });

  console.log(newSchema);
  return { newSchema, extractedFields };
};

export const modifiedSchema = (schemaObj: any) => {
  const locationFields = ['block', 'village'];
  const extractedFields: any = {};
  locationFields.forEach((field) => {
    if (schemaObj.schema.properties[field]) {
      extractedFields[field] = {
        title: schemaObj.schema.properties[field].title,
        fieldId: schemaObj.schema.properties[field].fieldId,
        field_type: schemaObj.schema.properties[field].field_type,
        maxSelection: schemaObj.schema.properties[field].maxSelection,
        isMultiSelect: schemaObj.schema.properties[field].isMultiSelect,
        'ui:widget': schemaObj.uiSchema[field]?.['ui:widget'] || 'select',
      };
    }
  });

  // Deep copy the schema object
  const newSchema = JSON.parse(JSON.stringify(schemaObj));

  locationFields.forEach((field) => {
    // Remove from schema properties
    delete newSchema.schema.properties[field];
    // Remove from uiSchema
    delete newSchema.uiSchema[field];

    // Remove from required array if exists
    const requiredIndex = newSchema.schema.required?.indexOf(field);
    if (requiredIndex > -1) {
      newSchema.schema.required.splice(requiredIndex, 1);
    }

    // Remove from ui:order array if exists
    const orderIndex = newSchema.uiSchema['ui:order']?.indexOf(field);
    if (orderIndex > -1) {
      newSchema.uiSchema['ui:order'].splice(orderIndex, 1);
    }
  });

  console.log(newSchema);
  return { newSchema, extractedFields };
};

export const extractVillageIds = (users: any[]): number[] => {
  const villageIds = users.flatMap((user) =>
    user.customFields
      ?.filter((field: any) => field.label === 'VILLAGE')
      .flatMap(
        (field: any) => field.selectedValues?.map((val: any) => val.id) || []
      )
  );

  return Array.from(new Set(villageIds)); // Remove duplicates
};

export const filterOutUserVillages = (
  transformedVillageData: { id: number; name: string }[],
  userVillageIds: number[]
): { id: number; name: string }[] => {
  const userVillageIdSet = new Set(userVillageIds);
  return transformedVillageData.filter(
    (village) => !userVillageIdSet.has(village.id)
  );
};

// Maps the Assessment Type dropdown's internal value ('pre' | 'post' | 'other') to the
// AssessmentType enum value the composite-search `assessmentType` filter expects.
// Ported from scp-teacher-repo's helper of the same name.
export const getAssessmentType = (type: string) => {
  if (type === 'pre') {
    return AssessmentType.PRE_TEST;
  } else if (type === 'post') {
    return AssessmentType.POST_TEST;
  } else {
    return AssessmentType.OTHER;
  }
};

// Formats an ISO date string as "2 Feb, 2024". Ported from scp-teacher-repo; used by the
// Assessments learner-detail page to show when each subject assessment was last updated.
export const format2DigitDate = (dateStr: any) => {
  if (dateStr === undefined || dateStr === null) return '';
  const dateObj = parseISO(dateStr);
  return format(dateObj, 'd MMM, yyyy');
};
