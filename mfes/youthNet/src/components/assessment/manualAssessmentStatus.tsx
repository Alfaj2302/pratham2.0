import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import RemoveIcon from '@mui/icons-material/Remove';

// Answer-sheet status helpers for the Manual Assessment (Trainer) flow.
//
// These live here rather than being exported from a page file (as the volunteer flow does, where the
// learner page imports them from its sibling `[assessmentId]/index.tsx`). Importing runtime helpers
// across Next.js page modules drags one page's bundle into another; a plain component module does not.

export type AnswerSheetStatus = 'Not_Started' | 'Image_Uploaded' | 'Completed';

export type InternalStatus =
  | 'completed'
  | 'in_progress'
  | 'not_started'
  | 'awaiting_approval';

const statusMapping: Record<AnswerSheetStatus, string> = {
  Not_Started: 'Not Started',
  Image_Uploaded: 'Image Uploaded',
  Completed: 'Marks Approved',
};

export const getStatusLabel = (answerSheetStatus: AnswerSheetStatus): string =>
  statusMapping[answerSheetStatus] || 'Not Submitted';

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon sx={{ color: '#4CAF50', fontSize: 24 }} />;
    case 'in_progress':
      return <MoreHorizIcon sx={{ color: '#FF9800', fontSize: 24 }} />;
    case 'awaiting_approval':
      return <ErrorIcon sx={{ color: '#2196F3', fontSize: 24 }} />;
    case 'not_started':
      return <RemoveIcon sx={{ color: '#9E9E9E', fontSize: 24 }} />;
    default:
      return null;
  }
};

export const mapAnswerSheetStatusToInternalStatus = (
  answerSheetStatus: AnswerSheetStatus
): InternalStatus => {
  switch (answerSheetStatus) {
    case 'Completed':
      return 'completed';
    case 'Not_Started':
      return 'not_started';
    case 'Image_Uploaded':
      return 'awaiting_approval';
    default:
      return 'not_started';
  }
};
