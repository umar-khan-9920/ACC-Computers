import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUpiPaymentUri,
  courseToSheetRow,
  enrollmentToSheetRow,
  formatCurrency,
  formatTotalDuration,
  generateQrMatrix,
  getLatestEnrollmentForCourse,
  isCourseUnlockedForStudent,
  lessonToSheetRow,
  parseDurationToSeconds,
  sheetRowToCourse,
  sheetRowToEnrollment,
  sheetRowToLesson,
  validateCourseForm,
  validateEnrollmentForm,
} from './academyLogic';
import type { Course, EnrollmentRequest, VideoLesson } from '../types/academy';

test('parseDurationToSeconds and formatTotalDuration compute playlist durations accurately', () => {
  assert.equal(parseDurationToSeconds('12:30'), 750);
  assert.equal(parseDurationToSeconds('1:05:10'), 3910);
  assert.equal(parseDurationToSeconds('invalid'), 0);

  const lessons: VideoLesson[] = [
    {
      id: 'l1',
      courseId: 'c1',
      order: 1,
      title: 'Intro',
      duration: '35:00',
      thumbnailUrl: '',
      videoUrl: '',
      summary: '',
    },
    {
      id: 'l2',
      courseId: 'c1',
      order: 2,
      title: 'Deep Dive',
      duration: '40:00',
      thumbnailUrl: '',
      videoUrl: '',
      summary: '',
    },
  ];
  assert.equal(formatTotalDuration(lessons), '1h 15m');
});

test('validateEnrollmentForm catches missing fields and passes valid submission', () => {
  const emptyErrors = validateEnrollmentForm({
    fullName: '',
    mobile: '123',
    address: 'Short',
    gender: '',
    age: '5',
    email: 'bad-email',
    transactionId: '12',
    screenshotDataUrl: '',
  });
  assert.ok(emptyErrors.fullName);
  assert.ok(emptyErrors.mobile);
  assert.ok(emptyErrors.address);
  assert.ok(emptyErrors.gender);
  assert.ok(emptyErrors.age);
  assert.ok(emptyErrors.email);
  assert.ok(emptyErrors.transactionId);
  assert.ok(emptyErrors.screenshotDataUrl);

  const validErrors = validateEnrollmentForm({
    fullName: 'Aarav Mehta',
    mobile: '9876543210',
    address: '42 MG Road, Indiranagar, Bengaluru 560038',
    gender: 'Male',
    age: '26',
    email: 'aarav@example.com',
    transactionId: 'UTR429018492011',
    screenshotDataUrl: 'data:image/jpeg;base64,/9j/4AAQ',
  });
  assert.deepEqual(validErrors, {});
});

test('validateCourseForm validates course creation inputs', () => {
  const invalid = validateCourseForm({
    title: 'Hi',
    category: '',
    instructor: '',
    price: '-10',
    level: 'Beginner',
    description: 'Too short',
    imageUrl: '',
  });
  assert.ok(invalid.title);
  assert.ok(invalid.category);
  assert.ok(invalid.instructor);
  assert.ok(invalid.price);
  assert.ok(invalid.description);
  assert.ok(invalid.imageUrl);

  const valid = validateCourseForm({
    title: 'Cinema Lighting Masterclass',
    category: 'Cinematography',
    instructor: 'Rohan Kapoor',
    price: '2999',
    level: 'Intermediate',
    description: 'Comprehensive guide to narrative lighting ratios and tungsten key setups.',
    imageUrl: '/src/assets/images/course_cinematography_1794535953971.jpg',
  });
  assert.deepEqual(valid, {});
});

test('enrollment unlock logic isolates student email and respects approval status', () => {
  const enrollments: EnrollmentRequest[] = [
    {
      id: 'enr-1',
      courseId: 'c1',
      courseTitle: 'Course 1',
      amount: 2499,
      fullName: 'Sara',
      mobile: '9999999999',
      address: '12 Park Street',
      gender: 'Female',
      age: 24,
      email: 'sara@example.com',
      transactionId: 'UTR1111',
      screenshotDataUrl: 'data:image/png;base64,abc',
      status: 'pending',
      submittedAt: '2026-11-12T10:00:00Z',
    },
    {
      id: 'enr-2',
      courseId: 'c1',
      courseTitle: 'Course 1',
      amount: 2499,
      fullName: 'Vikram',
      mobile: '8888888888',
      address: '88 Marine Drive',
      gender: 'Male',
      age: 29,
      email: 'vikram@example.com',
      transactionId: 'UTR2222',
      screenshotDataUrl: 'data:image/png;base64,xyz',
      status: 'approved',
      submittedAt: '2026-11-12T11:00:00Z',
    },
  ];

  assert.equal(isCourseUnlockedForStudent(enrollments, 'c1', 'sara@example.com'), false);
  assert.equal(isCourseUnlockedForStudent(enrollments, 'c1', 'VIKRAM@example.com'), true);
  assert.equal(isCourseUnlockedForStudent(enrollments, 'c2', 'vikram@example.com'), false);
  assert.equal(getLatestEnrollmentForCourse(enrollments, 'c1', 'sara@example.com')?.status, 'pending');
});

test('Google Sheets row serialization round-trips Course, Lesson, and Enrollment cleanly', () => {
  const course: Course = {
    id: 'course-101',
    title: 'Editorial UI Architecture',
    category: 'Product Design',
    instructor: 'Ananya Sen',
    price: 3499,
    description: 'Design scalable design systems with strict typographic hierarchy.',
    imageUrl: '/img/ui.jpg',
    level: 'Intermediate',
    createdAt: '2026-11-12T00:00:00Z',
  };
  const roundCourse = sheetRowToCourse(courseToSheetRow(course));
  assert.deepEqual(roundCourse, course);

  const lesson: VideoLesson = {
    id: 'lesson-1',
    courseId: 'course-101',
    order: 2,
    title: 'Grid Proportions',
    duration: '18:45',
    thumbnailUrl: '/img/thumb.jpg',
    videoUrl: '',
    summary: 'Modular spatial grids for desktop apps.',
  };
  const roundLesson = sheetRowToLesson(lessonToSheetRow(lesson));
  assert.deepEqual(roundLesson, lesson);

  const enrollment: EnrollmentRequest = {
    id: 'enr-99',
    courseId: 'course-101',
    courseTitle: 'Editorial UI Architecture',
    amount: 3499,
    fullName: 'Meera Nair',
    mobile: '9876501234',
    address: '21 Residency Road, Kochi',
    gender: 'Female',
    age: 27,
    email: 'meera@example.com',
    transactionId: 'UTR99887766',
    screenshotDataUrl: 'data:image/jpeg;base64,test',
    status: 'approved',
    submittedAt: '2026-11-12T09:30:00Z',
    reviewedAt: '2026-11-12T10:15:00Z',
  };
  const roundEnrollment = sheetRowToEnrollment(enrollmentToSheetRow(enrollment));
  assert.deepEqual(roundEnrollment, enrollment);
});

test('generateQrMatrix and buildUpiPaymentUri produce standard ACC Computer UPI links', () => {
  const baseUri = buildUpiPaymentUri({
    upiId: 'computerbyahmad-1@okicici',
    payeeName: 'ACC Computer',
  });
  assert.equal(baseUri, 'upi://pay?pa=computerbyahmad-1@okicici&pn=ACC%20Computer');

  const pricedUri = buildUpiPaymentUri({
    upiId: 'computerbyahmad-1@okicici',
    payeeName: 'ACC Computer',
    amount: 3499,
  });
  assert.equal(
    pricedUri,
    'upi://pay?pa=computerbyahmad-1@okicici&pn=ACC%20Computer&am=3499&cu=INR'
  );

  const m1 = generateQrMatrix(pricedUri);
  const m2 = generateQrMatrix(pricedUri);
  assert.equal(m1.length, 21);
  assert.equal(m1[0].length, 21);
  assert.deepEqual(m1, m2);
  assert.equal(m1[0][0], true);
  assert.equal(m1[1][1], false);
  assert.equal(m1[3][3], true);
  assert.ok(formatCurrency(2499).includes('2,499'));
});
