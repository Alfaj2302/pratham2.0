import { CustomField, SessionsCardProps } from '@/utils/Interfaces';
import { Box, Snackbar, Typography } from '@mui/material';
import { canEditSession, convertUTCToIST, toPascalCase } from '@/utils/helper';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditOutlined from '@mui/icons-material/EditOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'next-i18next';
import React, { useEffect } from 'react';
import CenterSessionModal from './CenterSessionModal';
import PlannedSession from './PlannedSession';
import ConfirmationModal from './ConfirmationModal';
import CheckCircleTwoToneIcon from '@mui/icons-material/CheckCircleTwoTone';
import SensorsTwoToneIcon from '@mui/icons-material/SensorsTwoTone';
import CircleTwoToneIcon from '@mui/icons-material/CircleTwoTone';
import { EventStatus } from '@/utils/app.constant';
import { getMyCohortMemberList } from '@/services/MyClassDetailsService';
import useNotification from '@/hooks/useNotification';
import { useRouter } from 'next/router';
import { Role } from '@/utils/app.constant';
import { usePathname } from 'next/navigation';

const SessionsCard: React.FC<SessionsCardProps> = ({
  data,
  showCenterName = false,
  children,
  isEventDeleted,
  isEventUpdated,
  StateName,
  board,
  medium,
  grade,
}) => {
  const theme = useTheme<any>();
  const { t } = useTranslation();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [eventDeleted, setEventDeleted] = React.useState(false);
  const [eventEdited, setEventEdited] = React.useState(false);
  const [startTime, setStartTime] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState<boolean>(false);
  const [editSelection, setEditSelection] = React.useState('EDIT_SESSION');
  const [updateEvent, setUpdateEvent] = React.useState(false);
  const [showEdit, setShowEdit] = React.useState(false);
  const [editSession, setEditSession] = React.useState();
  const [eventStatus, setEventStatus] = React.useState('');
  const [multiBatchConfirmOpen, setMultiBatchConfirmOpen] =
    React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState<string>('');
  const [currentUserRole, setCurrentUserRole] = React.useState<string>('');
  const router = useRouter();
  const { cohortId }: any = router.query;
  const dashboard = pathname === '/dashboard';
  const { getNotification } = useNotification();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      setCurrentUserId(localStorage.getItem('userId') || '');
      setCurrentUserRole(
        localStorage.getItem('role') || localStorage.getItem('roleName') || ''
      );
    }
  }, []);

  // A facilitator may only edit the sessions they scheduled themselves, while a
  // Team Leader may edit any session on their own centers' batches - see
  // canEditSession() for the full rule.
  const sessionCreatorId = data?.createdBy ?? data?.metadata?.createdBy;
  const isSessionEditable = canEditSession({
    creatorId: sessionCreatorId,
    currentUserId,
    role: currentUserRole,
    allowWhenCreatorUnknown: true,
  });
  // "You" is only shown on an id match. `createdBy` is absent on older events, and
  // falling back to a name match there would read "You" for any namesake in the center.
  const isCurrentUserCreator =
    !!sessionCreatorId && !!currentUserId && sessionCreatorId === currentUserId;
  const sessionCreatorName = isCurrentUserCreator
    ? t('COMMON.YOU')
    : data?.metadata?.teacherName;

  const handleEditSelection = (selection: string) => {
    setEditSelection(selection);
  };
  const handleOpen = (eventData: any) => {
    // A multi-batch session is managed centrally from Cross-Center Sessions —
    // editing it inline here would let a facilitator change time/subject
    // without realising it applies to every other batch on the session too.
    if (eventData?.metadata?.multiSession) {
      setMultiBatchConfirmOpen(true);
      return;
    }
    setOpen(true);
    setEditSession(eventData);
    setEventEdited(true);
  };

  const handleClose = () => setOpen(false);

  // board/medium/grade are already resolved once by the page and passed down.
  // Fetching them again per card meant one cohort-hierarchy request for every
  // session on screen. They can arrive as `{ value }` objects, so unwrap them.
  const unwrapBMG = (v: any) => (v && typeof v === 'object' ? v.value : v);
  const sessionBoard = dashboard ? unwrapBMG(board) : board;
  const sessionMedium = dashboard ? unwrapBMG(medium) : medium;
  const sessionGrade = dashboard ? unwrapBMG(grade) : grade;

  const handleCohortNotification = async (
    cohortId: string,
    notificationType: string,
    replacements: Record<string, string>
  ) => {
    const filters = { cohortId };

    try {
      const response = await getMyCohortMemberList({ filters });

      if (response?.result?.userDetails) {
        const deviceIds = response.result.userDetails
          .filter((user: { role: Role; deviceId?: string | null }) =>
            [Role.TEACHER, Role.STUDENT].includes(user.role)
          )
          .flatMap((user: any) => user.deviceId || [])
          .filter((id: any) => id !== null);

        if (deviceIds.length > 0) {
          getNotification(deviceIds, notificationType, replacements);
        } else {
          console.warn(
            'No valid device IDs found. Skipping notification API call.'
          );
        }
      }
    } catch (error) {
      console.error(
        `Error fetching cohort member list for ${notificationType}:`,
        error
      );
    }
  };

  const onEventDeleted = async () => {
    setOpen(false);
    setEventDeleted(true);
    if (isEventDeleted) {
      isEventDeleted();
    }

    if (cohortId) {
      const replacements = {
        '{sessionName}':
          subject && sessionTitle
            ? `${toPascalCase(subject)} - ${sessionTitle}`
            : subject
            ? toPascalCase(subject)
            : toPascalCase(sessionTitle),
      };
      await handleCohortNotification(
        cohortId,
        'SESSION_DELETION_NOTIFICATION',
        replacements
      );
    }
  };

  const onEventUpdated = () => {
    setOpen(false);
    if (isEventUpdated) {
      isEventUpdated();
    }
    setUpdateEvent(false);
  };

  const handleSnackbarClose = () => setSnackbarOpen(false);

  const handleCopyUrl = () => {
    if (data?.meetingDetails?.url) {
      navigator.clipboard
        .writeText(data.meetingDetails.url)
        .then(() => {
          setSnackbarOpen(true);
        })
        .catch((err) => {
          console.error('Failed to copy: ', err);
        });
    }
  };

  useEffect(() => {
    const startDateTime = convertUTCToIST(data?.startDateTime);
    const startDate = startDateTime.date;
    const startTime = startDateTime.time;
    setStartTime(startTime);
    setStartDate(startDate);

    const endDateTime = convertUTCToIST(data?.endDateTime);
    const endDate = endDateTime.date;
    const endTime = endDateTime.time;
    setEndTime(endTime);

    const currentTime = new Date();
    const eventStart = new Date(data?.startDateTime);
    const eventEnd = new Date(data?.endDateTime);

    if (currentTime < eventStart) {
      setEventStatus(EventStatus.UPCOMING);
    } else if (currentTime >= eventStart && currentTime <= eventEnd) {
      setEventStatus(EventStatus.LIVE);
    } else if (currentTime > eventEnd) {
      setEventStatus(EventStatus.PASSED);
    }
  }, [data]);

  const getStatusIcon = () => {
    switch (eventStatus) {
      case EventStatus.UPCOMING:
        return <CircleTwoToneIcon sx={{ color: 'grey' }} />;
      case EventStatus.LIVE:
        return (
          <img
            src="/scp-teacher-repo/images/live-classes.gif"
            alt="Live Icon"
            style={{ width: 24, height: 24 }}
          />
        );

      case EventStatus.PASSED:
        return <CheckCircleTwoToneIcon sx={{ color: 'green' }} />;
      default:
        return null;
    }
  };

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const sessionDate = new Date(`${startDate} ${currentYear}`);
    const currentDate = new Date();
    sessionDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
    if (currentDate <= sessionDate) {
      setShowEdit(true);
    } else {
      setShowEdit(false);
    }
  }, [startDate]);

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleEditModal = () => {
    setModalOpen(true);
  };

  const onUpdateClick = async () => {
    setUpdateEvent(true);
    if (cohortId) {
      const replacements = {
        '{sessionName}':
          subject && sessionTitle
            ? `${toPascalCase(subject)} - ${sessionTitle}`
            : subject
            ? toPascalCase(subject)
            : toPascalCase(sessionTitle),
      };
      await handleCohortNotification(
        cohortId,
        'SESSION_UPDATE_NOTIFICATION',
        replacements
      );
    }
  };

  const subject = data?.metadata?.subject;
  const sessionTitle = data?.shortDescription;

  const getSessionTitle = (subject: string, sessionTitle: string) => {
    return subject && sessionTitle
      ? `${toPascalCase(subject)} - ${sessionTitle}`
      : subject
      ? toPascalCase(subject)
      : toPascalCase(sessionTitle);
  };

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.warning['A100']}`,
        borderRadius: '8px',
        minHeight: '158px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 16px 4px',
        }}
      >
        <Box>
          <Box display={'flex'} gap={1.5}>
            {/* {data?.isRecurring === false ? getStatusIcon() : ''} */}
            {getStatusIcon()}
            <Typography
              color={theme.palette.warning['300']}
              fontWeight={'400'}
              textAlign={'left'}
              fontSize={'16px'}
              className="one-line-text"
            >
              {getSessionTitle(subject, sessionTitle)}
            </Typography>
          </Box>
          <Typography
            fontWeight={'400'}
            textAlign={'left'}
            fontSize={'14px'}
            display={'flex'}
            sx={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '4px',
            }}
            gap={'4px'}
            className="one-line-text"
          >
            {data?.isRecurring === false && (
              <>
                <CalendarMonthIcon sx={{ fontSize: '18px' }} /> {startDate},{' '}
              </>
            )}
            {startTime} - {endTime}
          </Typography>
          {showCenterName && (
            <Typography
              className="one-line-text"
              fontWeight={'400'}
              textAlign={'left'}
              fontSize={'14px'}
            >
              {data?.location}
            </Typography>
          )}
          {/* The creator's name is stamped into the event metadata when the session is
              scheduled, so sessions created before that stamp existed simply show nothing. */}
          {sessionCreatorName && (
            <Typography
              className="one-line-text"
              fontWeight={'400'}
              textAlign={'left'}
              fontSize={'14px'}
              sx={{ color: theme.palette.warning['400'] }}
            >
              {t('CENTER_SESSION.CREATED_BY')}: {sessionCreatorName}
            </Typography>
          )}
        </Box>
        {eventStatus === EventStatus.UPCOMING && isSessionEditable && (
          <EditOutlined
            onClick={() => handleOpen(data)}
            sx={{ cursor: 'pointer' }}
          />
        )}
        {eventStatus === EventStatus.PASSED && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              color: theme.palette.warning['400'],
            }}
          >
            <LockOutlined sx={{ fontSize: '16px' }} />
            <Typography fontSize={'12px'}>
              {t('CENTER_SESSION.COMPLETED')}
            </Typography>
          </Box>
        )}
      </Box>
      <Box
        sx={{
          padding: '0px 16px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '30px',
          width: '100%',
        }}
        onClick={handleCopyUrl}
      >
        <Box
          sx={{
            fontSize: '14px',
            color: theme.palette.secondary.main,
            fontWeight: '500',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            width: '100%',
            cursor: 'pointer',
          }}
          className="one-line-text"
        >
          <a
            href={data?.meetingDetails?.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: theme.palette.secondary.main,
              textDecoration: 'none',
            }}
          >
            {data?.meetingDetails?.url}
          </a>{' '}
        </Box>
        {data?.meetingDetails?.url && (
          <ContentCopyIcon
            sx={{
              fontSize: '18px',
              color: theme.palette.secondary.main,
              cursor: 'pointer',
            }}
            onClick={handleCopyUrl}
          />
        )}
      </Box>
      <CenterSessionModal
        open={open}
        handleClose={handleClose}
        title={
          subject && sessionTitle
            ? `${toPascalCase(subject)} - ${sessionTitle}`
            : subject
            ? toPascalCase(subject)
            : toPascalCase(sessionTitle)
        }
        primary={eventEdited ? 'Update' : 'Schedule'}
        handleEditModal={handleEditModal}
      >
        <PlannedSession
          editSession={editSession}
          handleEditSelection={handleEditSelection}
          onEventDeleted={onEventDeleted}
          onEventUpdated={onEventUpdated}
          eventDeleted={eventDeleted}
          eventData={data}
          updateEvent={updateEvent}
          // StateName={StateName}
          board={sessionBoard}
          medium={sessionMedium}
          grade={sessionGrade}
        />
      </CenterSessionModal>

      <ConfirmationModal
        message={t('CENTER_SESSION.UPDATE_CHANGES')}
        buttonNames={{
          primary: t('COMMON.YES'),
          secondary: t('COMMON.NO_GO_BACK'),
        }}
        handleCloseModal={handleCloseModal}
        handleAction={onUpdateClick}
        modalOpen={modalOpen}
      />
      <ConfirmationModal
        message={t('CENTER_SESSION.MULTI_BATCH_EDIT_REDIRECT_MSG')}
        buttonNames={{
          primary: t('COMMON.OK'),
        }}
        handleCloseModal={() => setMultiBatchConfirmOpen(false)}
        modalOpen={multiBatchConfirmOpen}
      />
      {/* Footer sits in flow, not absolute, so it can't overlap the meeting link */}
      <Box sx={{ marginTop: 'auto', paddingBottom: '2px', width: '100%' }}>
        {children}
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        message="URL copied to clipboard"
      />
    </Box>
  );
};

export default SessionsCard;
