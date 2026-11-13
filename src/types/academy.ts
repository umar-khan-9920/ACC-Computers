export type EnrollmentStatus = 'pending' | 'approved' | 'rejected';

export type GenderOption = 'Female' | 'Male' | 'Non-binary' | 'Prefer not to say';

export interface VideoLesson {
  id: string;
  courseId: string;
  order: number;
  title: string;
  duration: string; // e.g., "14:20"
  thumbnailUrl: string;
  videoUrl: string; // optional mp4/webm/youtube URL; interactive studio player handles built-in lessons
  summary: string;
}

export interface Course {
  id: string;
  title: string;
  category: string;
  instructor: string;
  price: number;
  description: string;
  imageUrl: string;
  level: string;
  createdAt: string;
}

export interface EnrollmentRequest {
  id: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  fullName: string;
  mobile: string;
  address: string;
  gender: GenderOption;
  age: number;
  email: string;
  transactionId: string;
  screenshotDataUrl: string;
  status: EnrollmentStatus;
  submittedAt: string;
  reviewedAt?: string;
}

export interface PaymentSettings {
  upiId: string;
  payeeName: string;
  instructions: string;
  customQrUrl: string;
}

export interface SheetSyncConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  lastSyncedAt: string | null;
  availableTabs: string[];
}

export interface EnrollmentFormInput {
  fullName: string;
  mobile: string;
  address: string;
  gender: string;
  age: string;
  email: string;
  transactionId: string;
  screenshotDataUrl: string;
}

export interface CourseFormInput {
  title: string;
  category: string;
  instructor: string;
  price: string;
  level: string;
  description: string;
  imageUrl: string;
}
