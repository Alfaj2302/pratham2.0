import { getCohortList } from '@/services/CohortServices';
import { createEvent, editEvent, getEventList } from '@/services/EventService';
import { CenterType, sessionMode, sessionType } from '@/utils/app.constant';
import { BatchInfo, flattenBatches } from '@/utils/crossCenter';
import {
  getAfterDate,
  getBeforeDate,
  getOptionsByCategory,
} from '@/utils/helper';
import { CreateEvent } from '@/utils/Interfaces';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DesktopTimePicker } from '@mui/x-date-pickers/DesktopTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { useTranslation } from 'next-i18next';
import React, { useEffect, useRef, useState } from 'react';
import {
  DaysOfWeek,
  eventDaysLimit,
  frameworkId,
  idealTimeForSession,
} from '../../app.config';
import CenterSessionModal from './CenterSessionModal';
import ConfirmationModal from './ConfirmationModal';
import Schedule from './Schedule';
import SessionMode from './SessionMode';
import { showToastMessage } from './Toastify';
import WeekDays from './WeekDays';

interface CrossCenterScheduleWizardProps {
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
  /** When set, the wizard edits this existing event (PATCH) instead of
   * creating a new one — pre-filled from its current data, still starting
   * on the batches step. */
  editingEvent?: any;
}

const CrossCenterScheduleWizard: React.FC<CrossCenterScheduleWizardProps> = ({
  open,
  onClose,
  onScheduled,
  editingEvent,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<any>();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [myBatches, setMyBatches] = useState<BatchInfo[]>([]);
  const [search, setSearch] = useState('');
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(
    new Set()
  );
  const [batchValidationError, setBatchValidationError] = useState('');
  // Purely a toggle for its own click — does not reactively reflect the
  // current selection made via per-center "Select All" or individual
  // checkboxes, by design.
  const [selectAllChecked, setSelectAllChecked] = useState(false);

  const [sessionTypeKey, setSessionTypeKey] = useState<string | null>(null);

  const [mode, setMode] = useState<string>(sessionMode.OFFLINE);
  const [date, setDate] = useState<Dayjs | null>(null);
  const [recurEndDate, setRecurEndDate] = useState<Dayjs | null>(null);
  const [selectedWeekDays, setSelectedWeekDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  const [courseType, setCourseType] = useState<string>('');
  const [courseTypes, setCourseTypes] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>('');
  const [subjectLists, setSubjectLists] = useState<string[]>([]);
  const [bmgMissing, setBmgMissing] = useState(false);
  const [subTopic, setSubTopic] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingLinkError, setMeetingLinkError] = useState('');
  const [meetingPasscode, setMeetingPasscode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  const conflictDecisionResolver = useRef<
    ((decision: 'yes' | 'no') => void) | null
  >(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const resetState = () => {
    setStep(1);
    setSearch('');
    setSelectedBatchIds(new Set());
    setSelectAllChecked(false);
    setBatchValidationError('');
    setSessionTypeKey(null);
    setMode(sessionMode.OFFLINE);
    setDate(null);
    setRecurEndDate(null);
    setSelectedWeekDays([]);
    setStartTime(null);
    setEndTime(null);
    setCourseType('');
    setCourseTypes([]);
    setSubject('');
    setSubjectLists([]);
    setBmgMissing(false);
    setSubTopic('');
    setMeetingLink('');
    setMeetingLinkError('');
    setMeetingPasscode('');
    setSubmitting(false);
    setConflictMessage('');
  };

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    if (editingEvent) {
      const meta = editingEvent.metadata || {};
      setSelectedBatchIds(
        new Set(
          meta.cohortIds || (meta.cohortId ? [meta.cohortId] : [])
        )
      );
      setSessionTypeKey(
        meta.type === sessionType.PLANNED ? 'PLANNED_SESSION' : 'EXTRA_SESSION'
      );
      setMode(editingEvent.eventType || sessionMode.OFFLINE);
      const start = dayjs(editingEvent.startDateTime);
      const end = dayjs(editingEvent.endDateTime);
      setDate(start);
      setStartTime(start);
      setEndTime(end);
      setCourseType(meta.courseType || '');
      setSubject(meta.subject || '');
      setSubTopic(editingEvent.shortDescription || '');
      setMeetingLink(editingEvent.meetingDetails?.url || '');
      setMeetingPasscode(editingEvent.meetingDetails?.password || '');
      if (editingEvent.isRecurring && editingEvent.recurrencePattern) {
        const dayNameByIndex: Record<number, string> = {};
        Object.entries(DaysOfWeek).forEach(([name, idx]) => {
          dayNameByIndex[idx] = name;
        });
        const days = (editingEvent.recurrencePattern.daysOfWeek || [])
          .map((idx: number) => dayNameByIndex[idx])
          .filter(Boolean);
        setSelectedWeekDays(days);
      }
      // The edit icon addresses one occurrence (its own eventRepetitionId),
      // not the series, so End Date must default to that occurrence's own
      // day - same as the single-batch flow's "Edit this session" scope -
      // rather than the series' recurrencePattern.endCondition.value, which
      // would show the series' last day and make every edit look like it's
      // about to shrink the whole recurrence down to one day.
      setRecurEndDate(start);
    }

    const loadBatches = async () => {
      setBatchesLoading(true);
      try {
        const userId =
          typeof window !== 'undefined'
            ? localStorage.getItem('userId') || ''
            : '';
        if (!userId) {
          setMyBatches([]);
          return;
        }
        const centerTree = await getCohortList(userId, {
          customField: 'true',
        });
        setMyBatches(flattenBatches(centerTree || []));
      } catch (error) {
        console.error('Error loading batches for scheduling', error);
        setMyBatches([]);
      } finally {
        setBatchesLoading(false);
      }
    };
    loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Curriculum-driven subject list, sourced from the first selected batch's
  // board/medium/grade — read from the already-fetched batch tree (`myBatches`),
  // no extra API call needed. All selected batches share the same board and
  // medium by the time this runs (enforced at the batch-selection step), but
  // Grade is not part of that rule, so Grade specifically still only reflects
  // the first selected batch — a known simplification.
  useEffect(() => {
    const firstBatchId = Array.from(selectedBatchIds)[0];
    if (step !== 3 || !firstBatchId) return;

    const loadSubjects = async () => {
      try {
        const bmg = myBatches.find((b) => b.batchId === firstBatchId)?.bmg;
        if (!bmg?.board || !bmg?.medium || !bmg?.grade) {
          setSubjectLists([]);
          setCourseTypes([]);
          setBmgMissing(true);
          return;
        }
        setBmgMissing(false);

        // Different tenants (e.g. Pathways vs the main Second Chance Program)
        // use different taxonomy frameworks - Header.tsx stores the current
        // tenant's own id in localStorage at login. Falling back to the
        // hardcoded default here (as this used to) queries the wrong
        // tenant's board/medium/grade/subject terms, so Course Type (a
        // generic category present in most frameworks) would still load
        // while Subject - which requires an exact name match per term -
        // silently came back empty. Mirrors PlannedSession.tsx and every
        // other framework-read call site in the app.
        const url =
          process.env.NEXT_PUBLIC_MIDDLEWARE_URL +
          `/api/framework/v1/read/${localStorage.getItem('collectionFramework') || frameworkId}`;
        const boardData = await fetch(url).then((res) => res.json());
        const frameworks = boardData?.result?.framework;

        const getBoards = getOptionsByCategory(frameworks, 'board');
        const matchBoard = getBoards.find(
          (item: any) => item.name === bmg.board
        );
        const getMedium = getOptionsByCategory(frameworks, 'medium');
        const matchMedium = getMedium.find(
          (item: any) => item.name === bmg.medium
        );
        const getGrades = getOptionsByCategory(frameworks, 'gradeLevel');
        const matchGrade = getGrades.find(
          (item: any) => item.name === bmg.grade
        );

        const getCourseTypes = getOptionsByCategory(frameworks, 'courseType');
        setCourseTypes(getCourseTypes?.map((type: any) => type.name) || []);

        const getSubjects = getOptionsByCategory(frameworks, 'subject');
        const commonAssociations = getSubjects
          ?.filter((subj: any) => subj?.status !== 'Retired')
          ?.filter(
            (assoc: any) =>
              matchBoard?.associations.filter(
                (item: any) => item.code === assoc.code
              )?.length &&
              matchMedium?.associations.filter(
                (item: any) => item.code === assoc.code
              )?.length &&
              matchGrade?.associations.filter(
                (item: any) => item.code === assoc.code
              )?.length
          );
        setSubjectLists(
          commonAssociations?.map((subj: any) => subj?.name) || []
        );
      } catch (error) {
        console.error('Error fetching subject list', error);
        setSubjectLists([]);
        setCourseTypes([]);
      }
    };
    loadSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Default End Date to Start Date (matching the real single-batch flow's
  // implicit default), and keep it from falling behind Start Date if that
  // changes — the user only needs to touch End Date when they actually want
  // the Planned session to recur past a single day.
  useEffect(() => {
    if (date && (!recurEndDate || recurEndDate.isBefore(date, 'day'))) {
      setRecurEndDate(date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const filteredBatches = myBatches.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.batchName.toLowerCase().includes(q) ||
      b.centerName.toLowerCase().includes(q)
    );
  });

  const batchesByCenter = filteredBatches.reduce<Record<string, BatchInfo[]>>(
    (acc, batch) => {
      const centerBatches = acc[batch.centerId] || [];
      centerBatches.push(batch);
      acc[batch.centerId] = centerBatches;
      return acc;
    },
    {}
  );

  const totalCenterCount = new Set(myBatches.map((b) => b.centerId)).size;
  const selectedCenterCount = new Set(
    Array.from(selectedBatchIds)
      .map((id) => myBatches.find((b) => b.batchId === id)?.centerId)
      .filter(Boolean)
  ).size;

  const toggleBatch = (batchId: string) => {
    setBatchValidationError('');
    setSelectedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  };

  const toggleCenter = (batches: BatchInfo[]) => {
    setBatchValidationError('');
    const allSelected = batches.every((b) => selectedBatchIds.has(b.batchId));
    setSelectedBatchIds((prev) => {
      const next = new Set(prev);
      batches.forEach((b) => {
        if (allSelected) next.delete(b.batchId);
        else next.add(b.batchId);
      });
      return next;
    });
  };

  const toggleSelectAll = () => {
    setBatchValidationError('');
    const turnOn = !selectAllChecked;
    setSelectAllChecked(turnOn);
    setSelectedBatchIds(
      turnOn ? new Set(myBatches.map((b) => b.batchId)) : new Set()
    );
  };

  const handleBatchStepNext = () => {
    if (selectedBatchIds.size === 0) return;
    // Only the create flow requires 2+ batches - when editing an existing
    // cross-center session down to 1 batch, it's still saved here via PATCH
    // (per US-4 AC), not blocked.
    if (selectedBatchIds.size === 1 && !editingEvent) {
      setBatchValidationError(
        t('CENTER_SESSION.CROSS_CENTER_MIN_BATCH_ERROR')
      );
      return;
    }

    setBatchValidationError('');

    // Every batch's Board/Medium/Grade was already read once when the batch
    // tree was fetched (see `flattenBatches`/`BatchInfo.bmg`) — comparing
    // them here is a pure client-side check with no extra API calls, however
    // many batches are selected.
    const selectedBatches = Array.from(selectedBatchIds)
      .map((batchId) => myBatches.find((b) => b.batchId === batchId))
      .filter((b): b is BatchInfo => Boolean(b));

    // const batchesByCenterLog = selectedBatches.reduce<
    //   Record<string, { batchName: string; bmg: BatchInfo['bmg'] }[]>
    // >((acc, batch) => {
    //   const centerBatches = acc[batch.centerName] || [];
    //   centerBatches.push({ batchName: batch.batchName, bmg: batch.bmg });
    //   acc[batch.centerName] = centerBatches;
    //   return acc;
    // }, {});
    // console.log('Selected batches by center:', batchesByCenterLog);

    const bmgList = selectedBatches.map((b) => b.bmg);
    const firstBmg = bmgList[0];
    const allMatch = bmgList.every(
      (bmg) =>
        bmg?.board &&
        bmg?.medium &&
        bmg.board === firstBmg?.board &&
        bmg.medium === firstBmg?.medium
    );

    if (!allMatch) {
      setBatchValidationError(t('CENTER_SESSION.BATCH_BOARD_MEDIUM_MISMATCH'));
      return;
    }

    setStep(2);
  };

  const handleMeetingLinkChange = (value: string) => {
    setMeetingLink(value);
    if (!value) {
      setMeetingLinkError(t('CENTER_SESSION.MEETING_LINK_REQUIRED'));
    } else if (value.includes('zoom') || value.includes('google')) {
      setMeetingLinkError('');
    } else {
      setMeetingLinkError(t('CENTER_SESSION.ENTER_VALID_MEETING_LINK'));
    }
  };

  // Returns the ids of whichever selected batches already have an
  // overlapping live session — not just a yes/no — so the confirmation can
  // name exactly which batch(es)/center(s) are already booked, instead of a
  // generic "a session already exists" message.
  const findConflictingBatchIds = async (
    batchIds: string[],
    startIso: string,
    endIso: string
  ) => {
    const dateStr = dayjs(startIso).format('YYYY-MM-DD');
    const filters = {
      cohortIds: batchIds,
      startDate: { after: getAfterDate(dateStr) },
      endDate: { before: getBeforeDate(dateStr) },
      status: ['live'],
    };
    const result = await getEventList({ limit: 0, offset: 0, filters });
    const events: any[] = result?.events || [];
    const newStartMs = new Date(startIso).getTime();
    const newEndMs = new Date(endIso).getTime();
    const conflictingBatchIds = new Set<string>();

    events.forEach((existingEvent) => {
      // Editing a session must not flag it as conflicting with itself.
      if (
        editingEvent &&
        existingEvent?.eventRepetitionId === editingEvent.eventRepetitionId
      ) {
        return;
      }
      const existingStartMs = new Date(existingEvent?.startDateTime).getTime();
      const existingEndMs = new Date(existingEvent?.endDateTime).getTime();
      if (isNaN(existingStartMs) || isNaN(existingEndMs)) return;
      const overlaps =
        newStartMs < existingEndMs && newEndMs > existingStartMs;
      if (!overlaps) return;

      // Which of THIS event's batches does the existing conflicting event
      // actually belong to? cohortIds filter above matches on "any", so the
      // existing event may include batches we didn't select at all.
      const existingBatchIds: string[] =
        existingEvent?.metadata?.cohortIds ||
        (existingEvent?.metadata?.cohortId
          ? [existingEvent.metadata.cohortId]
          : []);
      batchIds.forEach((id) => {
        if (existingBatchIds.includes(id)) conflictingBatchIds.add(id);
      });
    });

    return Array.from(conflictingBatchIds);
  };

  // Mirrors `validateEventBody` in PlannedSession.tsx: the button stays
  // enabled once a type is picked, and clicking it validates with a specific
  // toast per missing/invalid field — rather than silently disabling the
  // button, which gives no indication of what's still needed.
  const handleSubmit = async () => {
    const isPlannedType = sessionTypeKey === 'PLANNED_SESSION';
    const showError = (message: string) => {
      showToastMessage(message, 'error');
    };

    if (mode === sessionMode.ONLINE && !meetingLink) {
      showError(t('CENTER_SESSION.MEETING_URL_ERROR'));
      return;
    }

    if (!date || !startTime || !endTime) {
      showError(
        isPlannedType
          ? t('CENTER_SESSION.PLANNED_SESSION_DATE_TIME_REQUIRED_ERROR')
          : t('CENTER_SESSION.EXTRA_SESSION_DATE_TIME_REQUIRED_ERROR')
      );
      return;
    }

    // A Planned session only actually recurs when its End Date is set to a
    // day after the Start Date — leaving End Date blank/same-as-Start-Date
    // (like the real single-batch flow's implicit default) schedules a
    // single Planned occurrence, same as an Extra session, and doesn't
    // require picking any weekday.
    const isRecurring =
      isPlannedType && !!recurEndDate && !recurEndDate.isSame(date, 'day');

    if (isRecurring && selectedWeekDays.length === 0) {
      showError(t('CENTER_SESSION.WEEKDAY_ERROR'));
      return;
    }

    const startDatetime = date
      .hour(startTime.hour())
      .minute(startTime.minute())
      .second(0)
      .toISOString();
    const endDatetime = date
      .hour(endTime.hour())
      .minute(endTime.minute())
      .second(0)
      .toISOString();

    if (new Date(startDatetime).getTime() < Date.now()) {
      showError(t('CENTER_SESSION.SESSION_START_TIME_IN_PAST_ERROR'));
      return;
    }
    if (new Date(endDatetime).getTime() <= new Date(startDatetime).getTime()) {
      showError(t('CENTER_SESSION.END_TIME_ERROR'));
      return;
    }

    setSubmitting(true);
    try {
      const batchIds = Array.from(selectedBatchIds);

      const conflictingBatchIds = await findConflictingBatchIds(
        batchIds,
        startDatetime,
        endDatetime
      );
      if (conflictingBatchIds.length > 0) {
        // Selected batches always come from `myBatches`, so every conflicting
        // id here is expected to resolve — the id itself is a last-resort
        // fallback in case that ever isn't true.
        const conflictingBatchLabels = conflictingBatchIds
          .map((id) => {
            const b = myBatches.find((batch) => batch.batchId === id);
            return b ? `${b.batchName} (${b.centerName})` : id;
          })
          .join(', ');
        setConflictMessage(
          t('CENTER_SESSION.CROSS_CENTER_SLOT_CONFLICT_MSG', {
            batches: conflictingBatchLabels,
          })
        );
        setConflictModalOpen(true);
        const decision = await new Promise<'yes' | 'no'>((resolve) => {
          conflictDecisionResolver.current = resolve;
        });
        setConflictModalOpen(false);
        conflictDecisionResolver.current = null;
        if (decision === 'no') {
          setSubmitting(false);
          return;
        }
      }

      const userId =
        typeof window !== 'undefined'
          ? localStorage.getItem('userId') || ''
          : '';
      const userName =
        typeof window !== 'undefined'
          ? localStorage.getItem('userName') || ''
          : '';

      const title =
        sessionTypeKey === 'PLANNED_SESSION'
          ? mode === sessionMode.ONLINE
            ? t('CENTER_SESSION.RECURRING_ONLINE')
            : t('CENTER_SESSION.RECURRING_OFFLINE')
          : mode === sessionMode.ONLINE
          ? t('CENTER_SESSION.EXTRA_ONLINE')
          : t('CENTER_SESSION.EXTRA_OFFLINE');

      const batchNames = batchIds
        .map((id) => myBatches.find((b) => b.batchId === id)?.batchName)
        .filter(Boolean)
        .join(', ');

      const metaData = {
        category: title,
        courseType,
        subject,
        teacherName: userName,
        cohortIds: batchIds,
        cycleId: '',
        tenantId: '',
        type:
          sessionTypeKey === 'PLANNED_SESSION'
            ? sessionType.PLANNED
            : sessionType.EXTRA,
      };

      const recurrencePattern =
        isRecurring && recurEndDate
          ? (() => {
              const daysOfWeekNumeric = selectedWeekDays.map(
                (day) => DaysOfWeek[day as keyof typeof DaysOfWeek]
              );
              const endConditionValue = recurEndDate
                .hour(endTime.hour())
                .minute(endTime.minute())
                .second(0)
                .toISOString();
              return {
                frequency:
                  daysOfWeekNumeric.length === eventDaysLimit
                    ? 'daily'
                    : 'weekly',
                interval: 1,
                daysOfWeek: daysOfWeekNumeric,
                endCondition: { type: 'endDate', value: endConditionValue },
                recurringStartDate: startDatetime,
              };
            })()
          : undefined;

      const onlineMeetingFields =
        mode === sessionMode.ONLINE
          ? {
              onlineProvider: meetingLink.includes('zoom')
                ? t('CENTER_SESSION.ZOOM')
                : t('CENTER_SESSION.GOOGLEMEET'),
              isMeetingNew: false,
              meetingDetails: {
                url: meetingLink,
                password: meetingPasscode,
                id: '',
              },
            }
          : null;

      if (editingEvent) {
        const apiBody: any = {
          updatedBy: userId,
          // This wizard has no "this and following sessions" scope (unlike
          // the single-batch flow) - the edit icon always addresses one
          // occurrence. `isMainEvent: false` tells the backend to patch only
          // that occurrence; `true` would make it redefine the series, which
          // is also why `recurrencePattern` is never sent here - doing so
          // previously collapsed the whole series down to whatever End Date
          // was showing (e.g. editing just the 14 Oct occurrence silently
          // deleted the 21/28 Oct occurrences that followed it).
          isMainEvent: !editingEvent.isRecurring,
          title,
          shortDescription: subTopic || '',
          // No `eventType` here — the backend rejects edits that change it
          // ("Event type change not supported"), which is also why the mode
          // toggle is disabled above while editing.
          status: 'live',
          startDatetime,
          endDatetime,
          metadata: metaData,
          // Edit sends only `meetingDetails` (provider nested inside): the
          // top-level `onlineProvider`/`isMeetingNew` pair is create-only and
          // makes the update API demand an `onlineDetails` object it rejects.
          ...(mode === sessionMode.ONLINE
            ? {
                meetingDetails: {
                  id: editingEvent?.meetingDetails?.id || '',
                  onlineProvider:
                    editingEvent?.meetingDetails?.onlineProvider ||
                    (meetingLink.includes('zoom')
                      ? t('CENTER_SESSION.ZOOM')
                      : t('CENTER_SESSION.GOOGLEMEET')),
                  password: meetingPasscode || '',
                  providerGenerated:
                    editingEvent?.meetingDetails?.providerGenerated || false,
                  url: meetingLink,
                },
              }
            : {}),
        };

        const response = await editEvent(editingEvent.eventRepetitionId, apiBody);
        if (response?.responseCode === 'OK') {
          showToastMessage(
            t('CENTER_SESSION.SESSION_EDITED_SUCCESSFULLY'),
            'success'
          );
          onScheduled();
          onClose();
        } else {
          showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
        }
        return;
      }

      const apiBody: CreateEvent = {
        title,
        shortDescription: subTopic || '',
        description: '',
        eventType: mode,
        isRestricted: true,
        autoEnroll: true,
        location: batchNames,
        maxAttendees: 0,
        attendees: [],
        status: 'live',
        createdBy: userId,
        updatedBy: userId,
        idealTime: idealTimeForSession,
        isRecurring,
        startDatetime,
        endDatetime,
        registrationStartDate: '',
        registrationEndDate: '',
        metaData,
        ...(recurrencePattern ? { recurrencePattern } : {}),
        ...(onlineMeetingFields ?? {}),
      };

      const response = await createEvent(apiBody);
      if (response?.responseCode === 'OK' || response?.result) {
        showToastMessage(
          t('COMMON.SESSION_SCHEDULED_SUCCESSFULLY'),
          'success'
        );
        onScheduled();
        onClose();
      } else {
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
      }
    } catch (error) {
      console.error('Error scheduling cross-center session', error);
      showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    setDeleting(true);
    try {
      const userId =
        typeof window !== 'undefined'
          ? localStorage.getItem('userId') || ''
          : '';
      const response = await editEvent(editingEvent.eventRepetitionId, {
        isMainEvent: true,
        status: 'archived',
        updatedBy: userId,
      });
      if (response?.responseCode === 'OK') {
        showToastMessage(
          t('CENTER_SESSION.SESSION_DELETED_SUCCESSFULLY'),
          'success'
        );
        onScheduled();
        onClose();
      } else {
        showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
      }
    } catch (error) {
      console.error('Error deleting cross-center session', error);
      showToastMessage(t('COMMON.SOMETHING_WENT_WRONG'), 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const title =
    step === 1
      ? t('CENTER_SESSION.WHO_IS_THIS_SESSION_FOR')
      : step === 2
      ? t('CENTER_SESSION.SCHEDULE')
      : sessionTypeKey === 'PLANNED_SESSION'
      ? t('CENTER_SESSION.PLANNED_SESSION')
      : 'Extra Session';

  const primaryLabel =
    step === 3
      ? editingEvent
        ? t('COMMON.UPDATE')
        : t('CENTER_SESSION.SCHEDULE')
      : t('COMMON.NEXT');

  const primaryDisabled =
    step === 1
      ? selectedBatchIds.size === 0
      : step === 2
      ? !sessionTypeKey
      : submitting;

  const handlePrimary =
    step === 1
      ? handleBatchStepNext
      : step === 2
      ? () => setStep(3)
      : handleSubmit;

  return (
    <>
      <CenterSessionModal
        open={open}
        handleClose={onClose}
        title={title}
        primary={primaryLabel}
        handlePrimaryModel={handlePrimary}
        handleBack={step > 1 ? () => setStep((s) => (s === 3 ? 2 : 1)) : undefined}
        disable={primaryDisabled}
        width="700px"
        maxHeight="720px"
      >
        <Box sx={{ display: 'flex', gap: '6px', px: 2, pt: 1.5, pb: 0.5 }}>
          {[1, 2, 3].map((s) => (
            <Box
              key={s}
              sx={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                backgroundColor:
                  s <= step
                    ? theme.palette.primary.main
                    : theme.palette.warning['A100'],
              }}
            />
          ))}
        </Box>

        {step === 1 && (
          <Box sx={{ padding: '10px 16px' }}>
            <TextField
              fullWidth
              size="small"
              placeholder={t('COMMON.SEARCH')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ endAdornment: <SearchIcon fontSize="small" /> }}
              sx={{ mb: 2 }}
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: `1px solid ${theme.palette.warning['A100']}`,
                borderRadius: '8px',
                padding: '8px 12px',
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox checked={selectAllChecked} onChange={toggleSelectAll} />
                <Typography fontSize={'14px'} fontWeight={500}>
                  {t('CENTER_SESSION.SELECT_ALL_CENTERS_BATCHES')}
                </Typography>
              </Box>
              <Typography fontSize={'12px'} color={theme.palette.warning['400']}>
                {selectedBatchIds.size > 0
                  ? t('CENTER_SESSION.BATCHES_ACROSS_CENTERS', {
                      batchCount: selectedBatchIds.size,
                      centerCount: selectedCenterCount,
                    })
                  : t('CENTER_SESSION.BATCHES_ACROSS_CENTERS', {
                      batchCount: myBatches.length,
                      centerCount: totalCenterCount,
                    })}
              </Typography>
            </Box>

            {batchValidationError && (
              <Box
                sx={{
                  // Stays visible while the batch list below is scrolled,
                  // instead of scrolling away with it - this list can run
                  // long (many centers/batches), and the error is otherwise
                  // easy to lose track of once dismissed from view.
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  mb: 2,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: theme.palette.error.light,
                  color: theme.palette.error.contrastText,
                  fontSize: '13px',
                }}
              >
                {batchValidationError}
              </Box>
            )}

            {batchesLoading ? (
              <Typography>{t('COMMON.LOADING')}</Typography>
            ) : Object.keys(batchesByCenter).length === 0 ? (
              <Typography>{t('CENTER_SESSION.NO_BATCHES_FOUND')}</Typography>
            ) : (
              Object.entries(batchesByCenter).map(([centerId, batches]) => {
                const allSelectedInCenter = batches.every((b) =>
                  selectedBatchIds.has(b.batchId)
                );
                return (
                <Box key={centerId} sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography fontSize={'14px'} fontWeight={600}>
                      {batches[0]?.centerName}
                    </Typography>
                    <Typography
                      fontSize={'13px'}
                      fontWeight={500}
                      sx={{
                        color: theme.palette.secondary.main,
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleCenter(batches)}
                    >
                      {allSelectedInCenter
                        ? t('COMMON.CLEAR_ALL')
                        : t('COMMON.SELECT_ALL')}
                    </Typography>
                  </Box>
                  {batches.map((batch) => (
                    <Box
                      key={batch.batchId}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        border: `1px solid ${theme.palette.warning['A100']}`,
                        borderRadius: '8px',
                        padding: '4px 8px',
                        mt: 1,
                      }}
                    >
                      <Checkbox
                        checked={selectedBatchIds.has(batch.batchId)}
                        onChange={() => toggleBatch(batch.batchId)}
                      />
                      <Typography fontSize={'14px'}>
                        {batch.batchName}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                );
              })
            )}
          </Box>
        )}

        {step === 2 && (
          <Box>
            {!sessionTypeKey && (
              <Typography sx={{ m: 2 }}>
                {t('CENTER_SESSION.SELECT_SESSION')}
              </Typography>
            )}
            <Schedule clickedBox={sessionTypeKey} handleClick={setSessionTypeKey} />
            {sessionTypeKey === 'PLANNED_SESSION' && (
              <Box
                sx={{
                  mx: 2,
                  mb: 2,
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: theme.palette.warning['A700'],
                  fontSize: '13px',
                  color: theme.palette.warning['400'],
                }}
              >
                {t('CENTER_SESSION.CROSS_CENTER_PLANNED_WARNING')}
              </Box>
            )}
          </Box>
        )}

        {step === 3 && (
          <Box sx={{ padding: '10px 16px' }}>
            <Typography
              fontSize={'12px'}
              fontWeight={500}
              color={theme.palette.warning['400']}
            >
              {t('CENTER_SESSION.SCHEDULING_FOR')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px', mt: 1, mb: 2 }}>
              {Array.from(selectedBatchIds).map((id) => {
                const batch = myBatches.find((b) => b.batchId === id);
                if (!batch) return null;
                return (
                  <Chip
                    key={id}
                    size="small"
                    label={`${batch.batchName} · ${batch.centerName}`}
                  />
                );
              })}
            </Box>

            {bmgMissing && (
              <Box
                sx={{
                  padding: '0.5rem',
                  backgroundColor: theme?.palette?.primary['light'],
                }}
              >
                <Typography>
                  {t('CENTER_SESSION.BOARD_MEDIUM_GRADE_NOT_ASSIGNED')}
                </Typography>
              </Box>
            )}

            <SessionMode
              mode={mode}
              handleSessionModeChange={(e) => setMode(e.target.value)}
              sessions={{
                tile: t('CENTER_SESSION.MODE_OF_SESSION'),
                mode1: t('CENTER_SESSION.ONLINE'),
                mode2: t('CENTER_SESSION.OFFLINE'),
              }}
              cohortType={CenterType.UNKNOWN}
              // The backend rejects an edit that changes eventType ("Event
              // type change not supported") — the existing single-batch edit
              // flow (PlannedSession.tsx) disables this the same way.
              disabled={!!editingEvent}
            />

            {mode === sessionMode.ONLINE && (
              <>
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label={t('CENTER_SESSION.MEETING_LINK')}
                    value={meetingLink}
                    onChange={(e) => handleMeetingLinkChange(e.target.value)}
                    error={!!meetingLinkError}
                    helperText={meetingLinkError}
                    required
                  />
                </Box>
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label={t('CENTER_SESSION.MEETING_PASSCODE')}
                    value={meetingPasscode}
                    onChange={(e) => setMeetingPasscode(e.target.value)}
                  />
                </Box>
              </>
            )}

            {!bmgMissing && (
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="cross-center-course-type-label">
                    {t('CENTER_SESSION.COURSE_TYPE')}
                  </InputLabel>
                  <Select
                    labelId="cross-center-course-type-label"
                    label={t('CENTER_SESSION.COURSE_TYPE')}
                    value={courseType}
                    onChange={(e) => setCourseType(e.target.value as string)}
                  >
                    {courseTypes.map((ct) => (
                      <MenuItem key={ct} value={ct}>
                        {ct}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {!bmgMissing && (
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="cross-center-subject-label">
                    {sessionTypeKey === 'PLANNED_SESSION'
                      ? t('CENTER_SESSION.SUBJECT')
                      : t('CENTER_SESSION.SUBJECT_OPTIONAL')}
                  </InputLabel>
                  <Select
                    labelId="cross-center-subject-label"
                    label={
                      sessionTypeKey === 'PLANNED_SESSION'
                        ? t('CENTER_SESSION.SUBJECT')
                        : t('CENTER_SESSION.SUBJECT_OPTIONAL')
                    }
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as string)}
                  >
                    {subjectLists.length === 0 ? (
                      <MenuItem value="" disabled>
                        {t('CENTER_SESSION.SELECT_SUBJECT_PLACEHOLDER')}
                      </MenuItem>
                    ) : (
                      subjectLists.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label={
                  sessionTypeKey === 'PLANNED_SESSION'
                    ? t('CENTER_SESSION.SESSION_TITLE_OPTIONAL')
                    : t('CENTER_SESSION.SESSION_TITLE')
                }
                value={subTopic}
                onChange={(e) => setSubTopic(e.target.value)}
              />
            </Box>

            {sessionTypeKey === 'PLANNED_SESSION' && (
              <Box sx={{ mt: 2 }}>
                <Typography
                  fontSize={'14px'}
                  color={theme.palette.warning['A200']}
                >
                  {t('COMMON.HELD_EVERY_WEEK_ON', {
                    days: selectedWeekDays.join(', '),
                  })}
                </Typography>
                <WeekDays
                  multiselect
                  selectedDays={selectedWeekDays.map(
                    (day) => DaysOfWeek[day as keyof typeof DaysOfWeek]
                  )}
                  onSelectionChange={(newSelectedDays) =>
                    setSelectedWeekDays(newSelectedDays)
                  }
                />
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                {sessionTypeKey !== 'PLANNED_SESSION' && (
                  <MobileDatePicker
                    label={t('COMMON.DATE')}
                    value={date}
                    onChange={(newValue) => setDate(newValue)}
                    format="DD MMM, YYYY"
                    sx={{ width: '100%', mb: 2 }}
                  />
                )}
                <Box sx={{ display: 'flex', gap: '12px', mb: 2 }}>
                  <DesktopTimePicker
                    label={t('CENTER_SESSION.START_TIME')}
                    value={startTime}
                    onChange={(newValue) => setStartTime(newValue)}
                    sx={{ width: '100%' }}
                    slotProps={{ textField: { placeholder: 'HH:MM AM/PM' } }}
                  />
                  <DesktopTimePicker
                    label={t('CENTER_SESSION.END_TIME')}
                    value={endTime}
                    onChange={(newValue) => setEndTime(newValue)}
                    sx={{ width: '100%' }}
                    slotProps={{ textField: { placeholder: 'HH:MM AM/PM' } }}
                  />
                </Box>
                {sessionTypeKey === 'PLANNED_SESSION' && (
                  <Box sx={{ display: 'flex', gap: '12px', mb: 2 }}>
                    <MobileDatePicker
                      label={t('CENTER_SESSION.START_DATE')}
                      value={date}
                      onChange={(newValue) => setDate(newValue)}
                      format="DD MMM, YYYY"
                      sx={{ width: '100%' }}
                    />
                    <MobileDatePicker
                      label={t('CENTER_SESSION.END_DATE')}
                      value={recurEndDate}
                      onChange={(newValue) => setRecurEndDate(newValue)}
                      format="DD MMM, YYYY"
                      sx={{ width: '100%' }}
                    />
                  </Box>
                )}
              </LocalizationProvider>
            </Box>

            <Box
              sx={{
                mt: 2,
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: theme.palette.warning['A700'],
                fontSize: '13px',
                color: theme.palette.warning['400'],
              }}
            >
              {t('CENTER_SESSION.ONE_LINK_NOTE')}
            </Box>

            {editingEvent && (
              <Box
                sx={{
                  display: 'flex',
                  gap: '5px',
                  mt: 2,
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Box
                  sx={{
                    fontSize: '14px',
                    color: theme?.palette?.secondary.main,
                    fontWeight: '500',
                  }}
                >
                  {t('CENTER_SESSION.DELETE_THIS_SESSION')}
                </Box>
                <DeleteOutlineIcon
                  sx={{ fontSize: '18px', color: theme?.palette?.error.main }}
                />
              </Box>
            )}
          </Box>
        )}
      </CenterSessionModal>

      <ConfirmationModal
        message={
          conflictMessage || t('CENTER_SESSION.SESSION_SLOT_CONFLICT_MSG')
        }
        buttonNames={{
          primary: t('COMMON.YES'),
          secondary: t('COMMON.NO'),
        }}
        handleCloseModal={() => conflictDecisionResolver.current?.('no')}
        handleAction={() => conflictDecisionResolver.current?.('yes')}
        modalOpen={conflictModalOpen}
      />

      <ConfirmationModal
        message={t('CENTER_SESSION.DELETE_SESSION_MSG')}
        buttonNames={{
          primary: t('COMMON.YES'),
          secondary: t('COMMON.NO_GO_BACK'),
        }}
        handleCloseModal={() => setDeleteConfirmOpen(false)}
        handleAction={handleDelete}
        modalOpen={deleteConfirmOpen}
      />
    </>
  );
};

export default CrossCenterScheduleWizard;
