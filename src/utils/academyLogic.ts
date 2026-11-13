import type {
  Course,
  CourseFormInput,
  EnrollmentFormInput,
  EnrollmentRequest,
  EnrollmentStatus,
  GenderOption,
  VideoLesson,
} from '../types/academy';

export function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(safe);
}

export function parseDurationToSeconds(duration: string): number {
  const parts = duration
    .trim()
    .split(':')
    .map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) {
    return 0;
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export function formatTotalDuration(lessons: VideoLesson[]): string {
  const totalSeconds = lessons.reduce((sum, l) => sum + parseDurationToSeconds(l.duration), 0);
  if (totalSeconds <= 0) return '0m';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.ceil((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function validateEnrollmentForm(input: EnrollmentFormInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.fullName.trim() || input.fullName.trim().length < 2) {
    errors.fullName = 'Please enter your full name (at least 2 characters).';
  }

  const digitsOnly = input.mobile.replace(/\D/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    errors.mobile = 'Enter a valid 10 to 15 digit mobile number.';
  }

  if (!input.address.trim() || input.address.trim().length < 6) {
    errors.address = 'Please enter your complete billing/contact address.';
  }

  const allowedGenders: string[] = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];
  if (!allowedGenders.includes(input.gender)) {
    errors.gender = 'Please select a gender option.';
  }

  const ageNum = Number(input.age);
  if (!Number.isInteger(ageNum) || ageNum < 10 || ageNum > 110) {
    errors.age = 'Enter a valid age between 10 and 110.';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(input.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!input.transactionId.trim() || input.transactionId.trim().length < 4) {
    errors.transactionId = 'Enter the payment UTR or transaction reference ID.';
  }

  if (!input.screenshotDataUrl.trim()) {
    errors.screenshotDataUrl = 'Please upload your payment transaction screenshot for verification.';
  }

  return errors;
}

export function validateCourseForm(input: CourseFormInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.title.trim() || input.title.trim().length < 3) {
    errors.title = 'Course title must be at least 3 characters.';
  }
  if (!input.category.trim()) {
    errors.category = 'Category is required.';
  }
  if (!input.instructor.trim()) {
    errors.instructor = 'Instructor name is required.';
  }
  const priceNum = Number(input.price);
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    errors.price = 'Price must be 0 or greater.';
  }
  if (!input.description.trim() || input.description.trim().length < 10) {
    errors.description = 'Description must be at least 10 characters.';
  }
  if (!input.imageUrl.trim()) {
    errors.imageUrl = 'Course cover image URL is required.';
  }

  return errors;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getLatestEnrollmentForCourse(
  enrollments: EnrollmentRequest[],
  courseId: string,
  studentEmail?: string
): EnrollmentRequest | undefined {
  const targetEmail = studentEmail ? normalizeEmail(studentEmail) : '';
  const matching = enrollments.filter((req) => {
    if (req.courseId !== courseId) return false;
    if (!targetEmail) return false;
    return normalizeEmail(req.email) === targetEmail;
  });

  if (matching.length === 0) return undefined;

  // Prefer approved if any exist, otherwise most recent by submittedAt
  const approved = matching.find((m) => m.status === 'approved');
  if (approved) return approved;

  return [...matching].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
}

export function isCourseUnlockedForStudent(
  enrollments: EnrollmentRequest[],
  courseId: string,
  studentEmail?: string
): boolean {
  if (!studentEmail) return false;
  const targetEmail = normalizeEmail(studentEmail);
  return enrollments.some(
    (req) =>
      req.courseId === courseId &&
      req.status === 'approved' &&
      normalizeEmail(req.email) === targetEmail
  );
}

// --- Google Sheets Row Serialization ---

export const COURSES_HEADER = [
  'id',
  'title',
  'category',
  'instructor',
  'price',
  'description',
  'imageUrl',
  'level',
  'createdAt',
];

export const LESSONS_HEADER = [
  'id',
  'courseId',
  'order',
  'title',
  'duration',
  'thumbnailUrl',
  'videoUrl',
  'summary',
];

export const ENROLLMENTS_HEADER = [
  'id',
  'courseId',
  'courseTitle',
  'amount',
  'fullName',
  'mobile',
  'address',
  'gender',
  'age',
  'email',
  'transactionId',
  'screenshotDataUrl',
  'status',
  'submittedAt',
  'reviewedAt',
];

export const SETTINGS_HEADER = ['key', 'value'];

export function courseToSheetRow(course: Course): string[] {
  return [
    course.id,
    course.title,
    course.category,
    course.instructor,
    String(course.price),
    course.description,
    course.imageUrl,
    course.level,
    course.createdAt,
  ];
}

export function sheetRowToCourse(row: string[]): Course | null {
  if (!row[0] || row[0] === 'id') return null;
  const price = Number(row[4] ?? 0);
  return {
    id: row[0],
    title: row[1] || 'Untitled Course',
    category: row[2] || 'General',
    instructor: row[3] || 'Atelier Faculty',
    price: Number.isFinite(price) ? price : 0,
    description: row[5] || '',
    imageUrl: row[6] || '',
    level: row[7] || 'All Levels',
    createdAt: row[8] || new Date().toISOString(),
  };
}

export function lessonToSheetRow(lesson: VideoLesson): string[] {
  return [
    lesson.id,
    lesson.courseId,
    String(lesson.order),
    lesson.title,
    lesson.duration,
    lesson.thumbnailUrl,
    lesson.videoUrl,
    lesson.summary,
  ];
}

export function sheetRowToLesson(row: string[]): VideoLesson | null {
  if (!row[0] || row[0] === 'id' || !row[1]) return null;
  const order = Number(row[2] ?? 1);
  return {
    id: row[0],
    courseId: row[1],
    order: Number.isFinite(order) ? order : 1,
    title: row[3] || 'Untitled Lesson',
    duration: row[4] || '10:00',
    thumbnailUrl: row[5] || '',
    videoUrl: row[6] || '',
    summary: row[7] || '',
  };
}

export function enrollmentToSheetRow(req: EnrollmentRequest): string[] {
  return [
    req.id,
    req.courseId,
    req.courseTitle,
    String(req.amount),
    req.fullName,
    req.mobile,
    req.address,
    req.gender,
    String(req.age),
    req.email,
    req.transactionId,
    req.screenshotDataUrl,
    req.status,
    req.submittedAt,
    req.reviewedAt || '',
  ];
}

export function sheetRowToEnrollment(row: string[]): EnrollmentRequest | null {
  if (!row[0] || row[0] === 'id' || !row[1]) return null;
  const statusRaw = (row[12] || 'pending').toLowerCase();
  const status: EnrollmentStatus =
    statusRaw === 'approved' || statusRaw === 'rejected' ? statusRaw : 'pending';
  const genderRaw = row[7] || 'Prefer not to say';
  const gender: GenderOption =
    genderRaw === 'Female' ||
    genderRaw === 'Male' ||
    genderRaw === 'Non-binary' ||
    genderRaw === 'Prefer not to say'
      ? genderRaw
      : 'Prefer not to say';

  return {
    id: row[0],
    courseId: row[1],
    courseTitle: row[2] || '',
    amount: Number(row[3] ?? 0) || 0,
    fullName: row[4] || '',
    mobile: row[5] || '',
    address: row[6] || '',
    gender,
    age: Number(row[8] ?? 18) || 18,
    email: row[9] || '',
    transactionId: row[10] || '',
    screenshotDataUrl: row[11] || '',
    status,
    submittedAt: row[13] || new Date().toISOString(),
    reviewedAt: row[14] || undefined,
  };
}

// Deterministic crisp QR-like matrix for Admin UPI QR display (21x21 Version 1 structure)
export function generateQrMatrix(payload: string, size = 21): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const placeFinder = (startR: number, startC: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = startR + r;
        const cc = startC + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        reserved[rr][cc] = true;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          matrix[rr][cc] = false;
        } else {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          matrix[rr][cc] = isBorder || isCenter;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    reserved[6][i] = true;
    reserved[i][6] = true;
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Deterministic hash stream from payload
  let seed = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    seed ^= payload.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      seed ^= (r * 31 + c * 17) & 0xff;
      seed = Math.imul(seed, 16777619) >>> 0;
      matrix[r][c] = (seed & 1) === 1;
    }
  }

  return matrix;
}

export function buildUpiPaymentUri(params: {
  upiId: string;
  payeeName: string;
  amount?: number;
}): string {
  const pa = params.upiId.trim();
  const pn = encodeURIComponent(params.payeeName.trim());
  const base = `upi://pay?pa=${pa}&pn=${pn}`;
  if (typeof params.amount === 'number' && Number.isFinite(params.amount) && params.amount > 0) {
    return `${base}&am=${params.amount}&cu=INR`;
  }
  return base;
}
