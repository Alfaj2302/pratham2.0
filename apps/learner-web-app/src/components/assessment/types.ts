export interface UploadOptionsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  uploadedImages?: UploadedImage[];
  onImageUpload?: (image: UploadedImage) => void;
  onImageRemove?: (imageId: string) => void;
  userId?: string;
  questionSetId?: string;
  identifier?: string;
  onSubmissionSuccess?: () => void;
  isReUploadMode?: boolean;
  setAssessmentTrackingData?: (data: any) => void;
  parentId?: string;
  /** Hard cap on image count. `null` lifts the cap (mobile has none). */
  customMaxImages?: number | null;
  /** Per-image size limit in MB. Mobile enforces 10. */
  maxFileSizeMb?: number;
  /** Soft limit: a warning is shown above this count, but the upload proceeds. */
  recommendedMaxImages?: number | null;
  /** i18n key for the "Format: jpg, size: …" line under the header. */
  formatHintKey?: string;
  /** Show the "cannot be resubmitted" warning (flows with a single submission). */
  showResubmitWarning?: boolean;
}

export interface UploadedImage {
  id: string;
  url: string;
  previewUrl?: string;
  name: string;
  size?: number;
  uploadedAt: string;
}

