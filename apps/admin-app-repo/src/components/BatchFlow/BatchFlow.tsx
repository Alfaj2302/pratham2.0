// @ts-nocheck
import React, { useEffect, useState } from 'react';
import DynamicForm from '@/components/DynamicForm/DynamicForm';
import Loader from '@/components/Loader';
import { useTranslation } from 'react-i18next';
import {
  CohortTypes,
  Status,
  resolveFrameworkPlaceholders,
  TenantName,
} from '@/utils/app.constant';
import { Box, Typography } from '@mui/material';
import PaginatedTable from '@/components/PaginatedTable/PaginatedTable';
import { Button } from '@mui/material';
import SimpleModal from '@/components/SimpleModal';
import editIcon from '../../../public/images/editIcon.svg';
import deleteIcon from '../../../public/images/deleteIcon.svg';
import Image from 'next/image';
import {
  extractMatchingKeys,
  fetchForm,
  searchListData,
} from '@/components/DynamicForm/DynamicFormCallback';
import { FormContext } from '@/components/DynamicForm/DynamicFormConstant';
import AddEditUser from '@/components/EntityForms/AddEditUser/AddEditUser';
import {
  BatchSearchSchema,
  BatchSearchUISchema,
} from '@/constant/Forms/BatchSearchNew';
import { L2BatchCreate } from '@/constant/Forms/L2BatchCreate';
import {
  BatchCreateSchema,
  BatchCreateUISchema,
} from '@/constant/Forms/BatchCreate';
import {
  PathwaysBatchCreateSchema,
  PathwaysBatchCreateUISchema,
} from '@/constant/Forms/PathwaysBatchCreate';
import {
  fetchCohortMemberList,
  getCohortList,
} from '@/services/CohortService/cohortService';
import { transformLabel } from '@/utils/helper';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import CenterLabel from '@/components/Centerlabel';
import CenteredLoader from '@/components/CenteredLoader/CenteredLoader';
import ActiveArchivedLearner from '@/components/ActiveArchivedLearner';
import ConfirmationPopup from '@/components/ConfirmationPopup';
import { updateCohort } from '@/services/MasterDataService';
import useStore from '@/store/store';
import {
  pageActionBarSx,
  pageTableSectionSx,
} from '@/utils/filterTableActionsForAcademicYear';

interface BatchFlowProps {
  initialParentId?: string;
  centerBoards?: string[];
  centerMediums?: string[];
  centerGrades?: string[];
  centerIndustries?: string[];
  centerSkills?: string[];
  centerStreams?: string[];
  centerType?: string | null;
}

const BatchFlow: React.FC<BatchFlowProps> = ({
  initialParentId,
  centerBoards = [],
  centerMediums = [],
  centerGrades = [],
  centerIndustries = [],
  centerSkills = [],
  centerStreams = [],
  centerType = null,
}) => {
  const theme = useTheme<any>();
  const isActiveYear = useStore((state) => state.isActiveYearSelected);
  const [isLoading, setIsLoading] = useState(false);
  const [schema, setSchema] = useState(BatchSearchSchema);
  const [uiSchema, setUiSchema] = useState(BatchSearchUISchema);
  const [addSchema, setAddSchema] = useState(null);
  const [addUiSchema, setAddUiSchema] = useState(null);
  const [prefilledAddFormData, setPrefilledAddFormData] = useState({});
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);
  const [prefilledFormData, setPrefilledFormData] = useState({});
  const [response, setResponse] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [openModal, setOpenModal] = React.useState<boolean>(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editableUserId, setEditableUserId] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const { t } = useTranslation();
  const storedProgram =
    typeof window !== 'undefined'
      ? localStorage.getItem('tenantName') ?? localStorage.getItem('program')
      : null;
  const isPathwaysProgram =
    storedProgram === TenantName.SECOND_CHANCE_PROGRAM_PATHWAYS;
  // Vocational Training (YouthNet) centers use the L2 batch form (domain/
  // skills/dates); Pathways uses board/medium/grade/stream; every other
  // program keeps the original SCP board/medium/grade form.
  const useL2Form = storedProgram === TenantName.YOUTHNET;
  const initialFormData =
    typeof window !== 'undefined' && localStorage.getItem('stateId')
      ? { state: [localStorage.getItem('stateId')] }
      : {};
  const searchStoreKey = 'batch';
  const initialFormDataSearch =
    typeof window !== 'undefined' &&
    localStorage.getItem(searchStoreKey) &&
    localStorage.getItem(searchStoreKey) != '{}'
      ? JSON.parse(localStorage.getItem(searchStoreKey))
      : typeof window !== 'undefined' && localStorage.getItem('stateId')
      ? { state: [localStorage.getItem('stateId')] }
      : {};

  useEffect(() => {
    if (response?.result?.totalCount !== 0) {
      searchData(prefilledFormData, 0);
    }
  }, [pageLimit]);

  const buildSchemaAndUi = (
    isEditMode: boolean,
    existingValues?: {
      board?: string[];
      medium?: string[];
      grade?: string[];
      domain?: string[];
      skills?: string[];
      stream?: string[];
      startdate?: string;
      enddate?: string;
    }
  ) => {
    let alterSchema;
    let alterUiSchema;
    if (useL2Form) {
      alterSchema = JSON.parse(JSON.stringify(L2BatchCreate.schema));
      alterUiSchema = JSON.parse(JSON.stringify(L2BatchCreate.uiSchema));
    } else {
      alterSchema = resolveFrameworkPlaceholders(
        structuredClone(
          isPathwaysProgram ? PathwaysBatchCreateSchema : BatchCreateSchema
        )
      );
      alterUiSchema = structuredClone(
        isPathwaysProgram ? PathwaysBatchCreateUISchema : BatchCreateUISchema
      );
    }

    let requiredArray = alterSchema?.required || [];
    // Only force fields that actually exist on this form's schema.
    const mustRequired = ['name', 'board', 'medium', 'grade', 'stream'].filter(
      (key) => key === 'name' || alterSchema?.properties?.[key]
    );
    mustRequired.forEach((item) => {
      if (!requiredArray.includes(item)) {
        requiredArray.push(item);
      }
    });
    alterSchema.required = requiredArray;

    if (alterSchema?.properties?.board) {
      alterSchema.properties.board.maxSelection = 1;
    }
    if (alterSchema?.properties?.medium) {
      alterSchema.properties.medium.maxSelection = 1;
    }
    if (alterSchema?.properties?.grade) {
      alterSchema.properties.grade.maxSelection = 1;
    }
    if (alterSchema?.properties?.stream) {
      alterSchema.properties.stream.maxSelection = 1;
    }

    // The board field's own framework fetch URL (tenant-resolved by
    // resolveFrameworkPlaceholders above) is what the stream field's
    // dependent lookup below needs, so grab it before `overrideEnum`
    // strips `api` off of the board field.
    const boardFrameworkFetchUrl =
      alterSchema?.properties?.board?.api?.payload?.fetchUrl;

    const overrideEnum = (
      fieldKey: 'board' | 'medium' | 'grade' | 'domain' | 'skills' | 'stream',
      centerVals: string[]
    ) => {
      if (alterSchema?.properties?.[fieldKey]) {
        const currentVals = Array.isArray(centerVals) ? centerVals : [];
        const existing = existingValues?.[fieldKey] || [];
        const merged = Array.from(
          new Set([...(currentVals || []), ...(existing || [])])
        ).filter(Boolean);
        if (merged.length) {
          delete alterSchema.properties[fieldKey].api;
          alterSchema.properties[fieldKey].items = {
            type: 'string',
            enum: merged,
            enumNames: merged,
          };
        }
      }
    };
    const mergedBoardValues = Array.from(
      new Set([
        ...(Array.isArray(centerBoards) ? centerBoards : []),
        ...(existingValues?.board || []),
      ])
    ).filter(Boolean);

    overrideEnum('board', centerBoards);
    overrideEnum('medium', centerMediums);
    overrideEnum('grade', centerGrades);

    if (useL2Form) {
      // Domain/Skills options are the center's own configured values (plus
      // the batch's saved ones on edit), resolved through the framework so
      // Skills always follow the selected Domain: Domain is an `initial`
      // lookup and Skills a `dependent` lookup on Domain. On a Domain change
      // the shared DynamicForm clears the selected Skills and refetches the
      // options for the new Domain, so a Skill from another Domain can't be
      // kept or saved. `directOnly` keeps Skills to the Domain's own direct
      // associations (see api/dynamic-form/get-framework.js).
      const mergeValues = (centerVals: string[], existing?: string[]) =>
        Array.from(
          new Set([
            ...(Array.isArray(centerVals) ? centerVals : []),
            ...(existing || []),
          ])
        ).filter(Boolean);
      const allowedDomains = mergeValues(centerIndustries, existingValues?.domain);
      const allowedSkills = mergeValues(centerSkills, existingValues?.skills);
      // Same pos-framework the schema points at, on this environment's own
      // middleware instead of the hardcoded dev host.
      const schemaFrameworkUrl =
        alterSchema?.properties?.skills?.api?.payload?.fetchUrl;
      const frameworkUrl = process.env.NEXT_PUBLIC_MIDDLEWARE_URL
        ? `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/api/framework/v1/read/pos-framework`
        : schemaFrameworkUrl;

      if (alterSchema?.properties?.domain) {
        alterSchema.properties.domain.items = {
          type: 'string',
          enum: ['Select'],
          enumNames: ['Select'],
        };
        alterSchema.properties.domain.api = {
          ...alterSchema.properties.domain.api,
          // Same lookup as the Center form's own Domain field (subjects under
          // Career Exploration), narrowed to the center's domains.
          payload: {
            ...alterSchema.properties.domain.api?.payload,
            fetchUrl: frameworkUrl,
            allowedValues: allowedDomains,
            directOnly: true,
          },
          callType: 'initial',
        };
      }
      if (alterSchema?.properties?.skills) {
        alterSchema.properties.skills.items = {
          type: 'string',
          enum: ['Select'],
          enumNames: ['Select'],
        };
        alterSchema.properties.skills.api = {
          ...alterSchema.properties.skills.api,
          // Same lookup as the Center form's own Skills field (the selected
          // Domain's skills), narrowed to the center's skills.
          payload: {
            ...alterSchema.properties.skills.api?.payload,
            fetchUrl: frameworkUrl,
            allowedValues: allowedSkills,
            directOnly: true,
          },
          callType: 'dependent',
          dependent: 'domain',
        };
      }
    }

    // Neither startdate nor enddate can be in the past. "Today" can't live
    // as a static value in the schema file since it changes daily, so it's
    // injected here (formatMinimum for AJV validation on submit, ui:options
    // minValue to also block past dates in the date picker itself).
    // Local date (not UTC) so "today" matches the user's own calendar day.
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    const toDateKey = (value: any) => {
      const raw = typeof value === 'object' ? value?.value : value;
      return typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)
        ? raw.slice(0, 10)
        : null;
    };
    ['startdate', 'enddate'].forEach((key) => {
      // On edit, a date that has already passed (< today) is locked - today
      // itself stays editable. A locked field is disabled and the "no past
      // dates" rule is skipped for it, otherwise the unchanged saved value
      // would fail validation.
      const savedDate = isEditMode ? toDateKey(existingValues?.[key]) : null;
      const isLocked = !!savedDate && savedDate < today;
      if (alterSchema?.properties?.[key] && !isLocked) {
        alterSchema.properties[key].formatMinimum = today;
      }
      if (alterUiSchema?.[key]) {
        alterUiSchema[key]['ui:options'] = {
          ...alterUiSchema[key]['ui:options'],
          ...(isLocked ? {} : { minValue: today }),
        };
        if (isLocked) {
          alterUiSchema[key]['ui:disabled'] = true;
        }
      }
    });

    // Stream is scoped to the center's own selected streams (same as the
    // other fields above), but must also be filtered by whichever board is
    // currently selected in the batch form - a center associated with
    // several boards can have streams that only apply under some of them
    // via the framework's term associations, so a flat "all of the
    // center's streams" list (as overrideEnum would produce) would leak
    // streams from boards other than the one selected. That ambiguity only
    // exists when the center actually has more than one board to choose
    // from; with a single (or no) board there's nothing else a stream
    // could belong to, so the flat center-scoped list is safe and the
    // board-dependent live lookup (and its API call) can be skipped
    // entirely.
    const isBoardAmbiguous = mergedBoardValues.length > 1;

    if (alterSchema?.properties?.stream) {
      const currentVals = Array.isArray(centerStreams) ? centerStreams : [];
      const existing = existingValues?.stream || [];
      const mergedStreams = Array.from(
        new Set([...(currentVals || []), ...(existing || [])])
      ).filter(Boolean);
      if (mergedStreams.length && isBoardAmbiguous && boardFrameworkFetchUrl) {
        // Start empty - no board selected yet means no valid stream yet.
        // The shared DynamicForm's own dependent-field handling (the same
        // mechanism board->medium already relies on) fetches and fills
        // this in once a board is selected, re-fetches it whenever the
        // board changes, and clears any previously chosen stream when it
        // no longer belongs to the newly selected board - all driven by
        // `api.dependent` below, nothing bespoke needed here. On edit,
        // it's populated from the prefilled board value the same way.
        alterSchema.properties.stream.items = {
          type: 'string',
          enum: ['Select'],
          enumNames: ['Select'],
        };
        alterSchema.properties.stream.api = {
          url: '/api/dynamic-form/get-framework',
          method: 'POST',
          options: {
            label: 'label',
            value: 'value',
            optionObj: 'options',
          },
          payload: {
            code: 'board',
            fetchUrl: boardFrameworkFetchUrl,
            findcode: 'stream',
            selectedvalue: '**',
            allowedValues: mergedStreams,
          },
          callType: 'dependent',
          dependent: 'board',
        };
      } else if (mergedStreams.length) {
        // No framework URL to drive a live board-dependent lookup - fall
        // back to the flat, center-scoped list rather than leaving the
        // field with no options at all.
        alterSchema.properties.stream.items = {
          type: 'string',
          enum: mergedStreams,
          enumNames: mergedStreams,
        };
        delete alterSchema.properties.stream.api;
      }
    }

    // Modify batch_type based on centerType
    if (centerType && alterSchema?.properties?.batch_type) {
      if (centerType === 'remote') {
        // For remote center: show "remote" and "hybrid" options
        alterSchema.properties.batch_type.enum = ['remote', 'hybrid'];
        alterSchema.properties.batch_type.enumNames = ['REMOTE', 'HYBRID'];
        alterSchema.properties.batch_type.default = 'remote';
        if (alterUiSchema?.batch_type?.['ui:disabled']) {
          delete alterUiSchema.batch_type['ui:disabled'];
        }
      } else if (centerType === 'regular') {
        // For regular center: show only "regular" option (disabled)
        alterSchema.properties.batch_type.enum = ['regular'];
        alterSchema.properties.batch_type.enumNames = ['REGULAR'];
        alterSchema.properties.batch_type.default = 'regular';
        if (alterUiSchema?.batch_type) {
          alterUiSchema.batch_type['ui:disabled'] = true;
        }
      }
    }

    if (!isEditMode) {
      if (centerBoards?.length === 1 && alterUiSchema?.board) {
        alterUiSchema.board['ui:disabled'] = true;
      }
      if (centerMediums?.length === 1 && alterUiSchema?.medium) {
        alterUiSchema.medium['ui:disabled'] = true;
      }
      if (centerGrades?.length === 1 && alterUiSchema?.grade) {
        alterUiSchema.grade['ui:disabled'] = true;
      }
      if (centerIndustries?.length === 1 && alterUiSchema?.domain) {
        alterUiSchema.domain['ui:disabled'] = true;
      }
      if (centerSkills?.length === 1 && alterUiSchema?.skills) {
        alterUiSchema.skills['ui:disabled'] = true;
      }
      if (centerStreams?.length === 1 && alterUiSchema?.stream) {
        alterUiSchema.stream['ui:disabled'] = true;
      }
    } else {
      if (alterUiSchema?.board?.['ui:disabled'])
        delete alterUiSchema.board['ui:disabled'];
      if (alterUiSchema?.medium?.['ui:disabled'])
        delete alterUiSchema.medium['ui:disabled'];
      if (alterUiSchema?.grade?.['ui:disabled'])
        delete alterUiSchema.grade['ui:disabled'];
      if (alterUiSchema?.domain?.['ui:disabled'])
        delete alterUiSchema.domain['ui:disabled'];
      if (alterUiSchema?.skills?.['ui:disabled'])
        delete alterUiSchema.skills['ui:disabled'];
      if (alterUiSchema?.stream?.['ui:disabled'])
        delete alterUiSchema.stream['ui:disabled'];
    }

    // Same label on every program's batch form (L2 form's schema says UNIT_NAME).
    if (alterSchema?.properties?.name) {
      alterSchema.properties.name.title = 'Batch Name';
    }

    // YouthNet: once a batch's Start Date has passed (< today), its Domain
    // and Skills (and the Skills-dependent Assessments) can no longer be
    // changed (same rule as the date fields).
    if (useL2Form && isEditMode) {
      const savedStartDate = toDateKey(existingValues?.startdate);
      if (savedStartDate && savedStartDate < today) {
        ['domain', 'skills', 'assessments'].forEach((key) => {
          if (alterUiSchema?.[key]) {
            alterUiSchema[key]['ui:disabled'] = true;
          }
        });
      }
    }

    setAddSchema(alterSchema);
    setAddUiSchema(alterUiSchema);
  };

  useEffect(() => {
    const fetchData = async () => {
      const savedTenantId =
        typeof window !== 'undefined' ? localStorage.getItem('tenantId') : '';
      setTenantId(savedTenantId);

      buildSchemaAndUi(false);
    };

    // Prefill search data
    const baseSearch = initialFormDataSearch || {};
    const withParent = initialParentId
      ? { ...baseSearch, parentId: [initialParentId] }
      : baseSearch;
    setPrefilledAddFormData(
      initialParentId
        ? { ...initialFormData, parentId: [initialParentId] }
        : initialFormData
    );
    setPrefilledFormData(withParent);
    fetchData();
  }, [
    initialParentId,
    centerType,
    centerBoards,
    centerMediums,
    centerGrades,
    centerIndustries,
    centerSkills,
    centerStreams,
  ]);

  const updatedUiSchema = {
    ...uiSchema,
    'ui:submitButtonOptions': {
      norender: true,
    },
  };

  const SubmitaFunction = async (formData: any) => {
    if (formData && Object.keys(formData).length > 0) {
      // Force parentId filter when provided
      const enforcedFormData = initialParentId
        ? { ...formData, parentId: [initialParentId] }
        : formData;
      setPrefilledFormData(enforcedFormData);
      if (typeof window !== 'undefined') {
        localStorage.setItem(searchStoreKey, JSON.stringify(enforcedFormData));
      }
      await searchData(enforcedFormData, 0);
    }
  };

  const searchData = async (formData: any, newPage: any) => {
    if (formData) {
      formData = Object.fromEntries(
        Object.entries(formData).filter(
          ([_, value]) => !Array.isArray(value) || value.length > 0
        )
      );
      const staticFilter = { type: CohortTypes.BATCH };
      const { sortBy } = formData;
      const staticSort = ['name', sortBy || 'asc'];
      delete formData.state;
      delete formData.district;
      delete formData.block;
      delete formData.village;
      if (initialParentId) {
        formData.parentId = [initialParentId];
      } else if (!formData.parentId) {
        formData.parentId = [];
      }
      await searchListData(
        formData,
        newPage,
        staticFilter,
        pageLimit,
        setPageOffset,
        setCurrentPage,
        setResponse,
        getCohortList,
        staticSort
      );
    }
  };

  const deleteCohort = async () => {
    try {
      const resp = await updateCohort(cohortId, { status: Status.ARCHIVED });
      if (resp?.responseCode === 200) {
        searchData(prefilledFormData, currentPage);
      }
      return resp;
    } catch (error) {
      console.error('Error updating cohort:', error);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Batch Name',
      render: (row: any) => transformLabel(row.name),
    },
    {
      key: 'active_learners',
      label: 'Active Learners',
      render: (row) => (
        <ActiveArchivedLearner cohortId={row?.cohortId} type={Status.ACTIVE} />
      ),
    },
    {
      key: 'archived_learners',
      label: 'Archived Learners',
      render: (row) => (
        <ActiveArchivedLearner
          cohortId={row?.cohortId}
          type={Status.ARCHIVED}
        />
      ),
    },
    {
      key: 'center',
      label: 'Center',
      render: (row) => <CenterLabel parentId={row?.parentId} />,
    },
    // Vocational Training batches carry domain/skills instead of board/medium/grade.
    ...(storedProgram === TenantName.YOUTHNET
      ? [
          {
            key: 'domain',
            label: 'Domain',
            render: (row) =>
              transformLabel(
                row.customFields
                  .find((field) => field.label === 'DOMAIN')
                  ?.selectedValues?.join(', ')
              ) || '-',
          },
          {
            key: 'skills',
            label: 'Skills',
            render: (row) =>
              transformLabel(
                row.customFields
                  .find((field) => field.label === 'SKILLS')
                  ?.selectedValues?.join(', ')
              ) || '-',
          },
          {
            key: 'startdate',
            label: 'Start Date',
            render: (row) =>
              row.customFields.find((field) => field.label === 'START_DATE')
                ?.selectedValues?.[0] || '-',
          },
          {
            key: 'enddate',
            label: 'End Date',
            render: (row) =>
              row.customFields.find((field) => field.label === 'END_DATE')
                ?.selectedValues?.[0] || '-',
          },
        ]
      : [
          {
            key: 'board',
            label: 'Boards',
            render: (row) =>
              transformLabel(
                row.customFields
                  .find((field) => field.label === 'BOARD')
                  ?.selectedValues?.join(', ')
              ) || '-',
          },
          {
            key: 'medium',
            label: 'Medium',
            render: (row) =>
              transformLabel(
                row.customFields
                  .find((field) => field.label === 'MEDIUM')
                  ?.selectedValues?.join(', ')
              ) || '-',
          },
          {
            key: 'grade',
            label: 'Grade',
            render: (row) =>
              transformLabel(
                row.customFields
                  .find((field) => field.label === 'GRADE')
                  ?.selectedValues?.join(', ')
              ) || '-',
          },
        ]),
    ...(isPathwaysProgram
      ? [
          {
            key: 'stream',
            label: 'Stream',
            render: (row) =>
              transformLabel(
                row.customFields
                  .find((field) => field.label === 'STREAM')
                  ?.selectedValues?.join(', ')
              ) || '-',
          },
        ]
      : []),
    {
      key: 'status',
      label: 'Status',
      render: (row: any) => transformLabel(row?.status),
    },
  ];

  const actions = [
    {
      icon: (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            backgroundColor: 'rgb(227, 234, 240)',
            padding: '10px',
          }}
        >
          <Image src={editIcon} alt="" />
        </Box>
      ),
      callback: (row: any) => {
        const getSelectedValues = (label: string) =>
          row?.customFields?.find((f: any) => f.label === label)
            ?.selectedValues || [];
        const existingValues = {
          board: getSelectedValues('BOARD'),
          medium: getSelectedValues('MEDIUM'),
          grade: getSelectedValues('GRADE'),
          domain:
            row?.customFields?.find(
              (f: any) => f.label === 'INDUSTRY' || f.label === 'DOMAIN'
            )?.selectedValues || [],
          skills: getSelectedValues('SKILLS'),
          stream: getSelectedValues('STREAM'),
          startdate: getSelectedValues('START_DATE')?.[0],
          enddate: getSelectedValues('END_DATE')?.[0],
        };
        buildSchemaAndUi(true, existingValues);

        // YouthNet L2 batches (domain/skills/dates) keep the fieldId-based
        // extraction against the L2 schema.
        if (useL2Form) {
          const l2FormData = extractMatchingKeys(row, addSchema);
          if (centerType === 'regular') {
            l2FormData.batch_type = 'regular';
          }
          setPrefilledAddFormData(l2FormData);
          setIsEdit(true);
          setEditableUserId(row?.cohortId);
          handleOpenModal();
          return;
        }

        // Build form data directly from the batch's own customFields,
        // matched by label, instead of extractMatchingKeys's fieldId
        // lookup - custom field fieldIds for MEDIUM/GRADE are assigned
        // per tenant/program and don't match the fieldId literals
        // hardcoded in PathwaysBatchCreate.js/BatchCreate.js, so a fieldId
        // match silently drops those values even though the batch has them.
        const tempFormData: Record<string, any> = {
          name: row?.name,
          board: existingValues.board,
          medium: existingValues.medium,
          grade: existingValues.grade,
        };
        if (isPathwaysProgram) {
          tempFormData.stream = existingValues.stream;
        }
        const batchTypeValues = getSelectedValues('TYPE_OF_BATCH');
        const batchTypeValue =
          batchTypeValues.length > 0
            ? typeof batchTypeValues[0] === 'object'
              ? batchTypeValues[0]?.value
              : batchTypeValues[0]
            : undefined;
        if (batchTypeValue) {
          tempFormData.batch_type = batchTypeValue;
        }
        // Force batch_type to "regular" if centerType is "regular"
        if (centerType === 'regular') {
          tempFormData.batch_type = 'regular';
        }
        setPrefilledAddFormData(tempFormData);
        setIsEdit(true);
        setEditableUserId(row?.cohortId);
        handleOpenModal();
      },
      show: (row) => row.status !== 'archived',
    },
    {
      icon: (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            backgroundColor: 'rgb(227, 234, 240)',
            padding: '10px',
          }}
        >
          {' '}
          <Image src={deleteIcon} alt="" />
        </Box>
      ),
      callback: async (row: any) => {
        setEditableUserId(row?.userId);
        setCohortId(row?.cohortId);

        const data = {
          filters: {
            cohortId: row?.cohortId,
            status: ['active'],
            role: 'Learner',
          },
        };
        const response = await fetchCohortMemberList(data);

        let totalCount = response?.result?.totalCount;
        setTotalCount(totalCount);
        setOpen(true);
        setFirstName(row?.name);
      },
      show: (row) => row.status !== 'archived',
    },
  ];

  const handlePageChange = (newPage: any) => {
    searchData(prefilledFormData, newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage: any) => {
    setPageLimit(newRowsPerPage);
  };

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => {
    setOpenModal(false);
  };

  const extraFieldsUpdate = {};
  const extraFields = {
    type: CohortTypes.BATCH,
    parentId: initialParentId || null,
  };
  const successUpdateMessage = 'BATCH.BATCH_UPDATE_SUCCESSFULLY';
  const telemetryUpdateKey = 'batch-updated-successfully';
  const failureUpdateMessage = 'BATCH.BATCH_UPDATE_FAILED';
  const successCreateMessage = 'BATCH.BATCH_CREATED_SUCCESSFULLY';
  const telemetryCreateKey = 'batch-created-successfully';
  const failureCreateMessage = 'BATCH.BATCH_CREATE_FAILED';

  return (
    <>
      <Box display={'flex'} flexDirection={'column'} gap={2}>
        {isLoading ? (
          <Loader showBackdrop={false} loadingText={t('COMMON.LOADING')} />
        ) : (
          schema &&
          uiSchema && (
            <DynamicForm
              schema={schema}
              uiSchema={updatedUiSchema}
              SubmitaFunction={SubmitaFunction}
              isCallSubmitInHandle={true}
              prefilledFormData={prefilledFormData}
            />
          )
        )}
        <Box mt={4} sx={pageActionBarSx}>
          {isActiveYear && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              color="primary"
              sx={{
                textTransform: 'none',
                fontSize: '14px',
                color: theme.palette.primary['100'],
                width: '200px',
              }}
              onClick={() => {
                const addPrefill = initialParentId
                  ? { ...initialFormData, parentId: [initialParentId] }
                  : initialFormData;
                const prefillWithBMGS: any = { ...addPrefill };
                if (centerBoards?.length === 1)
                  prefillWithBMGS.board = [centerBoards[0]];
                if (centerMediums?.length === 1)
                  prefillWithBMGS.medium = [centerMediums[0]];
                if (centerGrades?.length === 1)
                  prefillWithBMGS.grade = [centerGrades[0]];
                if (centerIndustries?.length === 1)
                  prefillWithBMGS.domain = [centerIndustries[0]];
                if (centerSkills?.length === 1)
                  prefillWithBMGS.skills = [centerSkills[0]];
                if (centerStreams?.length === 1)
                  prefillWithBMGS.stream = [centerStreams[0]];

                // Prefill batch_type for remote center
                if (centerType === 'remote') {
                  prefillWithBMGS.batch_type = 'remote';
                }

                buildSchemaAndUi(false);

                setPrefilledAddFormData(prefillWithBMGS);
                setIsEdit(false);
                setEditableUserId('');
                handleOpenModal();
              }}
            >
              {t('COMMON.ADD_NEW')}{' '}
            </Button>
          )}
        </Box>

        <SimpleModal
          open={openModal}
          onClose={handleCloseModal}
          showFooter={true}
          primaryText={isEdit ? t('Update') : t('Create')}
          id="dynamic-form-id"
          modalTitle={isEdit ? t('BATCH.UPDATE_BATCH') : t('BATCH.NEW_BATCH')}
        >
          <AddEditUser
            SuccessCallback={() => {
              // reset filters and reload
              const reloadPrefill = initialParentId
                ? {
                    ...(initialFormDataSearch || {}),
                    parentId: [initialParentId],
                  }
                : initialFormDataSearch || {};
              setPrefilledFormData(reloadPrefill);
              searchData(reloadPrefill, 0);
              setOpenModal(false);
            }}
            schema={addSchema}
            uiSchema={addUiSchema}
            editPrefilledFormData={prefilledAddFormData}
            isEdit={isEdit}
            editableUserId={editableUserId}
            UpdateSuccessCallback={() => {
              setPrefilledFormData(prefilledFormData);
              searchData(prefilledFormData, currentPage);
              setOpenModal(false);
            }}
            extraFields={extraFields}
            extraFieldsUpdate={extraFieldsUpdate}
            successUpdateMessage={successUpdateMessage}
            telemetryUpdateKey={telemetryUpdateKey}
            failureUpdateMessage={failureUpdateMessage}
            successCreateMessage={successCreateMessage}
            telemetryCreateKey={telemetryCreateKey}
            failureCreateMessage={failureCreateMessage}
            isNotificationRequired={false}
            hideSubmit={true}
            type="batch"
          />
        </SimpleModal>

        {response != null ? (
          <>
            {response &&
            response?.result?.results?.cohortDetails?.length > 0 ? (
              <Box sx={pageTableSectionSx}>
                <PaginatedTable
                  count={response?.result?.count}
                  data={response?.result?.results?.cohortDetails}
                  columns={columns}
                  actions={actions}
                  onPageChange={handlePageChange}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  defaultPage={currentPage}
                  defaultRowsPerPage={pageLimit}
                />
              </Box>
            ) : (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="20vh"
              >
                <Typography marginTop="10px" textAlign={'center'}>
                  {t('BATCH.NO_BATCH_FOUND')}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <CenteredLoader />
        )}
      </Box>
      {totalCount > 0 ? (
        <ConfirmationPopup
          open={open}
          onClose={() => setOpen(false)}
          title={`You can't delete the batch because it has ${totalCount} Active Learners`}
          secondary={'Cancel'}
        />
      ) : (
        <ConfirmationPopup
          open={open}
          onClose={() => setOpen(false)}
          title={`Are you sure you want to delete ${firstName} batch?`}
          centerPrimary={t('COMMON.YES')}
          secondary={t('COMMON.CANCEL')}
          onClickPrimary={deleteCohort}
        />
      )}
    </>
  );
};

export default BatchFlow;