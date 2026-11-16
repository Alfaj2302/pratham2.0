export interface trackDataPorps {
  courseId: string;
  status: string;
  percentage: string | number;
  completed: number;
  completed_list: string[];
  in_progress: number;
  in_progress_list: string[];
}
export function calculateCourseStatus({
  statusData,
  allCourseIds,
  courseId,
}: {
  statusData: { completed_list: string[]; in_progress_list: string[] };
  allCourseIds: string[];
  courseId: string;
}): trackDataPorps {
  const completedList = new Set(statusData.completed_list || []);
  const inProgressList = new Set(statusData.in_progress_list || []);

  let completedCount = 0;
  let inProgressCount = 0;
  const completed_list: string[] = [];
  const in_progress_list: string[] = [];

  for (const id of allCourseIds) {
    if (completedList.has(id)) {
      completedCount++;
      completed_list.push(id);
    } else if (inProgressList.has(id)) {
      inProgressCount++;
      in_progress_list.push(id);
    }
  }

  const total = allCourseIds.length;
  let status = 'not started';

  if (completedCount === total && total > 0) {
    status = 'completed';
  } else if (completedCount > 0 || inProgressCount > 0) {
    status = 'in progress';
  }

  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return {
    completed_list,
    in_progress_list,
    completed: completedCount,
    in_progress: inProgressCount,
    courseId,
    status,
    percentage: percentage,
  };
}

export const calculateTrackData = (newTrack: any, children: any) => {
  const newTrackData = children?.map((item: any) => {
    return calculateTrackDataItem(newTrack, item);
  });
  return newTrackData;
};

export const calculateTrackDataItem = (newTrack: any, item: any) => {
  if (item?.mimeType === 'application/vnd.ekstep.content-collection') {
    const result = calculateCourseStatus({
      statusData: newTrack,
      allCourseIds: item?.leafNodes ?? [],
      courseId: item.identifier,
    });
    return result;
  } else {
    const result = calculateCourseStatus({
      statusData: newTrack,
      allCourseIds: item.identifier ? [item.identifier] : [],
      courseId: item.identifier,
    });
    return result;
  }
};

type KeyFormat = string | { key: string; format?: string; suffix: string };

export function findCourseUnitPath({
  node,
  targetId,
  keyArray,
  contentBaseUrl,
  path = [],
}: {
  node: any;
  targetId: string;
  keyArray: KeyFormat[];
  contentBaseUrl?: string;
  path?: any[];
}): any[] | null {
  // Build current node's object by processing keyArray
  const currentObj = keyArray.reduce((acc, keyItem) => {
    if (typeof keyItem === 'string') {
      // simple key, just pick the value if exists
      if (node[keyItem] !== undefined) acc[keyItem] = node[keyItem];
    } else if (typeof keyItem === 'object' && keyItem.key) {
      let formattedValue = '';
      if (keyItem.key === 'link') {
        if (
          path?.length > 0 &&
          node.mimeType === 'application/vnd.ekstep.content-collection'
        ) {
          formattedValue = `${contentBaseUrl ?? '/content'}/${
            path?.[0]?.identifier
          }/${node.identifier}${keyItem?.suffix ?? ''}`;
        } else {
          formattedValue = `${contentBaseUrl ?? '/content'}/${node.identifier}${
            keyItem?.suffix ?? ''
          }`;
        }
      }
      if (keyItem.format) {
        // Replace ${id} or any ${key} in format with node[key]
        formattedValue = keyItem.format.replace(
          /\$\{(\w+)\}/g,
          (_, k) => node[k] ?? ''
        );
      }
      acc[keyItem.key] = formattedValue;
    }
    return acc;
  }, {} as Record<string, any>);

  const newPath = [...path, currentObj];

  if (node.identifier === targetId) {
    return newPath;
  }

  const children = node.children;

  if (Array.isArray(children)) {
    for (const child of children) {
      const result = findCourseUnitPath({
        node: child,
        targetId,
        keyArray,
        contentBaseUrl,
        path: newPath,
      });
      if (result) return result;
    }
  }

  return null;
}

type NameMapEntry = string | { key: string; replaceCode: string };

export function sortJsonByArray({
  jsonArray,
  nameArray,
  key = 'code',
  onlyMatched = true,
}: {
  jsonArray: any[];
  nameArray?: NameMapEntry[];
  key?: string;
  onlyMatched?: boolean;
}) {
  if (nameArray === undefined || nameArray.length === 0) return jsonArray;
  const orderMap = new Map<string, { index: number; replaceCode?: string }>();
  nameArray.forEach((entry, index) => {
    if (typeof entry === 'string') {
      orderMap.set(entry, { index });
    } else {
      orderMap.set(entry.key, { index, replaceCode: entry.replaceCode });
    }
  });

  return jsonArray
    .filter((item) => {
      const val = String(item[key]);
      return !onlyMatched || orderMap.has(val);
    })
    .sort((a, b) => {
      const aIndex = orderMap.get(String(a[key]))?.index ?? Infinity;
      const bIndex = orderMap.get(String(b[key]))?.index ?? Infinity;
      return aIndex - bIndex;
    })
    .map((item) => {
      const val = String(item[key]);
      const entry = orderMap.get(val);

      if (entry?.replaceCode) {
        return {
          ...item,
          [key]: entry.replaceCode.replace('{code}', val),
          [`old_${key}`]: val,
        };
      }

      return item;
    });
}

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

export const getOverallStatus = (cohortData?: any[]): string => {
  if (!cohortData || cohortData.length === 0) return '';

  // collect statuses present
  const has = (s: string) =>
    cohortData.some((c) => c?.cohortMember?.status === s);

  // priority: active > archived > dropout > fallback (first non-empty)
  if (has('active')) return 'active';
  if (has('archived')) return 'archived';
  if (has('dropout')) return 'dropout';

  // fallback: return the first non-empty known status or empty string
  const first = cohortData.find((c) => !!c?.cohortMember?.status);
  return first?.cohortMember?.status ?? '';
}

export const extractWorkingVillageIds = (users: any[]): number[] => {
  const villageIds = users.flatMap((user) =>
    user.customFields
      ?.filter((field: any) => field.label === 'WORKING_VILLAGE')
      .flatMap(
        (field: any) => field.selectedValues?.map((val: any) => val.id) || []
      )
  );

  return Array.from(new Set(villageIds)); // Remove duplicates
};


// SCP and Pathways each capture "interested to join" in their own custom field
export const INTERESTED_TO_JOIN_FIELD_ID: Record<string, string> = {
  'Second Chance Program': 'f8dc1d5f-9b2b-412e-a22a-351bd8f14963',
  Pathways: '46c1b672-19fe-4ea6-ad13-a7b419340da6',
};

// Returns undefined for programs other than SCP and Pathways
export const getInterestedToJoinFieldId = (
  programName?: string
): string | undefined => {
  let name = programName;
  if (!name && typeof window !== 'undefined') {
    try {
      name = JSON.parse(localStorage.getItem('enrolledProgramData') || '{}')?.name;
    } catch {
      name = undefined;
    }
    name = name || localStorage.getItem('userProgram') || '';
  }
  return name ? INTERESTED_TO_JOIN_FIELD_ID[name] : undefined;
};
