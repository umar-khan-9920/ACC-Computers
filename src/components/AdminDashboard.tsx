import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  Clock,
  Database,
  Edit3,
  ExternalLink,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import type {
  Course,
  EnrollmentRequest,
  EnrollmentStatus,
  PaymentSettings,
  SheetSyncConfig,
  VideoLesson,
} from '../types/academy';
import { formatCurrency, validateCourseForm } from '../utils/academyLogic';
import { COURSE_IMAGES } from '../data/seedData';
import { compressPaymentScreenshot } from '../services/googleSheetsDb';
import { ConfirmModal } from './ConfirmModal';
import { QrCodeDisplay } from './QrCodeDisplay';
import { SafeImage } from './SafeImage';

type AdminTab = 'requests' | 'courses' | 'students' | 'sheets';

interface ConfirmState {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'primary' | 'danger';
  action: () => void | Promise<void>;
}

interface AdminDashboardProps {
  courses: Course[];
  lessons: VideoLesson[];
  enrollments: EnrollmentRequest[];
  paymentSettings: PaymentSettings;
  sheetConfig: SheetSyncConfig;
  googleUser: User | null;
  hasAccessToken: boolean;
  isSyncingSheets: boolean;
  sheetFeedback: { type: 'success' | 'error'; message: string } | null;
  onGoogleSignIn: () => void;
  onCreateSpreadsheet: () => Promise<void>;
  onConnectSpreadsheet: (spreadsheetId: string) => Promise<void>;
  onPullFromSheet: () => Promise<void>;
  onPushToSheet: () => Promise<void>;
  onUpdateEnrollmentStatus: (id: string, status: EnrollmentStatus) => Promise<void>;
  onUpdateStudentDetails: (
    id: string,
    updates: Pick<EnrollmentRequest, 'fullName' | 'mobile' | 'email' | 'address'>
  ) => Promise<void>;
  onDeleteEnrollment: (id: string) => Promise<void>;
  onSaveCourse: (course: Course, courseLessons: VideoLesson[], isNew: boolean) => Promise<void>;
  onDeleteCourse: (courseId: string) => Promise<void>;
  onSavePaymentSettings: (settings: PaymentSettings) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  courses,
  lessons,
  enrollments,
  paymentSettings,
  sheetConfig,
  googleUser,
  hasAccessToken,
  isSyncingSheets,
  sheetFeedback,
  onGoogleSignIn,
  onCreateSpreadsheet,
  onConnectSpreadsheet,
  onPullFromSheet,
  onPushToSheet,
  onUpdateEnrollmentStatus,
  onUpdateStudentDetails,
  onDeleteEnrollment,
  onSaveCourse,
  onDeleteCourse,
  onSavePaymentSettings,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('requests');
  const [statusFilter, setStatusFilter] = useState<'all' | EnrollmentStatus>('all');
  const [studentQuery, setStudentQuery] = useState('');
  const [lightboxRequest, setLightboxRequest] = useState<EnrollmentRequest | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  // Course Editor Modal State
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCategory, setCourseCategory] = useState('Filmmaking');
  const [courseInstructor, setCourseInstructor] = useState('');
  const [coursePrice, setCoursePrice] = useState('2499');
  const [courseLevel, setCourseLevel] = useState('Intermediate');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseImageUrl, setCourseImageUrl] = useState<string>(COURSE_IMAGES.cinematography);
  const [courseLessonsDraft, setCourseLessonsDraft] = useState<VideoLesson[]>([]);
  const [courseErrors, setCourseErrors] = useState<Record<string, string>>({});

  // Student Edit Modal State
  const [editingStudent, setEditingStudent] = useState<EnrollmentRequest | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentMobile, setEditStudentMobile] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');
  const [editStudentAddress, setEditStudentAddress] = useState('');

  // Sheets & Payment Settings State
  const [sheetIdInput, setSheetIdInput] = useState(sheetConfig.spreadsheetId);
  const [upiId, setUpiId] = useState(paymentSettings.upiId);
  const [payeeName, setPayeeName] = useState(paymentSettings.payeeName);
  const [instructions, setInstructions] = useState(paymentSettings.instructions);
  const [customQrUrl, setCustomQrUrl] = useState(paymentSettings.customQrUrl);

  const pendingCount = enrollments.filter((e) => e.status === 'pending').length;
  const approvedCount = enrollments.filter((e) => e.status === 'approved').length;

  const filteredRequests = enrollments.filter((e) =>
    statusFilter === 'all' ? true : e.status === statusFilter
  );

  const filteredStudents = enrollments.filter((e) => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.mobile.toLowerCase().includes(q) ||
      e.courseTitle.toLowerCase().includes(q)
    );
  });

  const openNewCourseEditor = () => {
    const newId = `course-${Date.now()}`;
    setEditingCourseId(null);
    setCourseTitle('');
    setCourseCategory('Filmmaking');
    setCourseInstructor('');
    setCoursePrice('2499');
    setCourseLevel('Intermediate');
    setCourseDescription('');
    setCourseImageUrl(COURSE_IMAGES.cinematography);
    setCourseLessonsDraft([
      {
        id: `les-${Date.now()}-1`,
        courseId: newId,
        order: 1,
        title: '01. Course Introduction & Setup',
        duration: '12:00',
        thumbnailUrl: COURSE_IMAGES.cinematography,
        videoUrl: '',
        summary: 'Overview of tools, workflow, and project goals.',
      },
    ]);
    setCourseErrors({});
    setIsCourseModalOpen(true);
  };

  const openExistingCourseEditor = (course: Course) => {
    setEditingCourseId(course.id);
    setCourseTitle(course.title);
    setCourseCategory(course.category);
    setCourseInstructor(course.instructor);
    setCoursePrice(String(course.price));
    setCourseLevel(course.level);
    setCourseDescription(course.description);
    setCourseImageUrl(course.imageUrl);
    const existingLessons = lessons
      .filter((l) => l.courseId === course.id)
      .sort((a, b) => a.order - b.order);
    setCourseLessonsDraft(existingLessons.map((l) => ({ ...l })));
    setCourseErrors({});
    setIsCourseModalOpen(true);
  };

  const handleAddDraftLesson = () => {
    const nextOrder = courseLessonsDraft.length + 1;
    const targetCourseId = editingCourseId || courseLessonsDraft[0]?.courseId || `course-${Date.now()}`;
    setCourseLessonsDraft((prev) => [
      ...prev,
      {
        id: `les-${Date.now()}-${nextOrder}`,
        courseId: targetCourseId,
        order: nextOrder,
        title: `${String(nextOrder).padStart(2, '0')}. New Video Lesson`,
        duration: '15:00',
        thumbnailUrl: courseImageUrl,
        videoUrl: '',
        summary: 'Lesson overview and practical demonstration.',
      },
    ]);
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateCourseForm({
      title: courseTitle,
      category: courseCategory,
      instructor: courseInstructor,
      price: coursePrice,
      level: courseLevel,
      description: courseDescription,
      imageUrl: courseImageUrl,
    });
    if (Object.keys(errors).length > 0) {
      setCourseErrors(errors);
      return;
    }

    const isNew = editingCourseId === null;
    const courseId = editingCourseId || courseLessonsDraft[0]?.courseId || `course-${Date.now()}`;
    const savedCourse: Course = {
      id: courseId,
      title: courseTitle.trim(),
      category: courseCategory.trim(),
      instructor: courseInstructor.trim(),
      price: Number(coursePrice),
      level: courseLevel,
      description: courseDescription.trim(),
      imageUrl: courseImageUrl.trim(),
      createdAt:
        courses.find((c) => c.id === courseId)?.createdAt || new Date().toISOString(),
    };

    const normalizedLessons: VideoLesson[] = courseLessonsDraft.map((l, idx) => ({
      ...l,
      courseId,
      order: idx + 1,
      thumbnailUrl: l.thumbnailUrl.trim() || savedCourse.imageUrl,
    }));

    const executeSave = async () => {
      await onSaveCourse(savedCourse, normalizedLessons, isNew);
      setIsCourseModalOpen(false);
    };

    if (!isNew) {
      setConfirmState({
        title: 'Save Course Changes?',
        description: `Update "${savedCourse.title}" (${formatCurrency(
          savedCourse.price
        )}) and its ${normalizedLessons.length} video lesson(s)?${
          sheetConfig.spreadsheetId ? ' This will update your connected Google Sheet.' : ''
        }`,
        confirmLabel: 'Save Course',
        tone: 'primary',
        action: async () => {
          await executeSave();
          setConfirmState(null);
        },
      });
    } else {
      await executeSave();
    }
  };

  const handleCustomQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressPaymentScreenshot(file);
    setCustomQrUrl(compressed);
  };

  const openEditStudent = (student: EnrollmentRequest) => {
    setEditingStudent(student);
    setEditStudentName(student.fullName);
    setEditStudentMobile(student.mobile);
    setEditStudentEmail(student.email);
    setEditStudentAddress(student.address);
  };

  const handleSaveStudentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const target = editingStudent;
    setConfirmState({
      title: 'Update Student Record?',
      description: `Save updated contact details for ${editStudentName}?${
        sheetConfig.spreadsheetId ? ' This will update the Enrollments tab in Google Sheets.' : ''
      }`,
      confirmLabel: 'Save Student',
      tone: 'primary',
      action: async () => {
        await onUpdateStudentDetails(target.id, {
          fullName: editStudentName.trim(),
          mobile: editStudentMobile.trim(),
          email: editStudentEmail.trim(),
          address: editStudentAddress.trim(),
        });
        setEditingStudent(null);
        setConfirmState(null);
      },
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header & Summary Strip */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Admin Studio</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Verify student payment receipts, manage video course playlists, edit student access,
            and sync with Google Sheets.
          </p>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-slate-500">Pending</span>
            <p className="font-mono text-xl font-bold text-amber-700 tabular-nums">
              {pendingCount}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200" aria-hidden="true" />
          <div>
            <span className="text-slate-500">Approved</span>
            <p className="font-mono text-xl font-bold text-emerald-700 tabular-nums">
              {approvedCount}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200" aria-hidden="true" />
          <div>
            <span className="text-slate-500">Courses</span>
            <p className="font-mono text-xl font-bold text-slate-900 tabular-nums">
              {courses.length}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="Admin sections"
        className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3"
      >
        {(
          [
            { id: 'requests', label: `Enrollment Requests (${pendingCount} Pending)` },
            { id: 'courses', label: `Manage Courses (${courses.length})` },
            { id: 'students', label: `Students (${enrollments.length})` },
            { id: 'sheets', label: 'Google Sheets & Payment QR' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ENROLLMENT REQUESTS */}
      {activeTab === 'requests' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                    statusFilter === status
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
              No enrollment requests match this filter.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => (
                <article
                  key={req.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* Payment Receipt Thumbnail */}
                    <button
                      type="button"
                      onClick={() => setLightboxRequest(req)}
                      aria-label={`Inspect payment screenshot for ${req.fullName}`}
                      className="relative w-20 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 group"
                    >
                      <SafeImage
                        src={req.screenshotDataUrl}
                        alt={`Receipt from ${req.fullName}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      </span>
                    </button>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {req.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Approved
                          </span>
                        ) : req.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                            Pending Verification
                          </span>
                        )}
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono text-slate-600 tabular-nums">
                          UTR: {req.transactionId}
                        </span>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(req.amount)}
                        </span>
                      </div>

                      <h3 className="text-base font-display font-semibold text-slate-900">
                        {req.fullName}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          ({req.gender}, {req.age} yrs)
                        </span>
                      </h3>

                      <p className="text-xs font-medium text-blue-800">{req.courseTitle}</p>

                      <p className="text-xs text-slate-600">
                        Email: <span className="font-mono">{req.email}</span> · Mobile:{' '}
                        <span className="font-mono tabular-nums">{req.mobile}</span>
                      </p>
                      <p className="text-xs text-slate-500 truncate">Address: {req.address}</p>
                    </div>
                  </div>

                  {/* Verification Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setLightboxRequest(req)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      View Receipt
                    </button>

                    {req.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmState({
                            title: 'Approve Enrollment Request?',
                            description: `Verify payment UTR ${req.transactionId} and unlock "${req.courseTitle}" for ${req.fullName} (${req.email})?`,
                            confirmLabel: 'Approve Access',
                            tone: 'primary',
                            action: async () => {
                              await onUpdateEnrollmentStatus(req.id, 'approved');
                              setConfirmState(null);
                            },
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Approve
                      </button>
                    )}

                    {req.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmState({
                            title: 'Reject Enrollment Request?',
                            description: `Mark ${req.fullName}'s payment submission (${req.transactionId}) as rejected and keep videos locked?`,
                            confirmLabel: 'Reject Request',
                            tone: 'danger',
                            action: async () => {
                              await onUpdateEnrollmentStatus(req.id, 'rejected');
                              setConfirmState(null);
                            },
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        Reject
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: MANAGE COURSES */}
      {activeTab === 'courses' && (
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              Create, edit, or delete video courses and customize each course playlist.
            </p>
            <button
              type="button"
              onClick={openNewCourseEditor}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add New Course
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Lessons</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {courses.map((course) => {
                    const count = lessons.filter((l) => l.courseId === course.id).length;
                    return (
                      <tr key={course.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-10 rounded bg-slate-100 overflow-hidden shrink-0">
                              <SafeImage src={course.imageUrl} alt={course.title} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate max-w-xs">
                                {course.title}
                              </p>
                              <p className="text-xs text-slate-500">By {course.instructor}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">{course.category}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-700 tabular-nums">
                          {count} Videos
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(course.price)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openExistingCourseEditor(course)}
                              aria-label={`Edit ${course.title}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmState({
                                  title: `Delete "${course.title}"?`,
                                  description: `This will permanently remove "${course.title}" and its ${count} video lesson(s) from the catalog${
                                    sheetConfig.spreadsheetId ? ' and Google Sheets' : ''
                                  }.`,
                                  confirmLabel: 'Delete Course',
                                  tone: 'danger',
                                  action: async () => {
                                    await onDeleteCourse(course.id);
                                    setConfirmState(null);
                                  },
                                })
                              }
                              aria-label={`Delete ${course.title}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: MANAGE STUDENTS */}
      {activeTab === 'students' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-md flex-1">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                aria-label="Search students"
                placeholder="Search by student name, email, mobile, or course..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              Showing {filteredStudents.length} of {enrollments.length} records
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Access</th>
                    <th className="py-3 px-4 text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{student.fullName}</p>
                        <p className="text-xs text-slate-500">
                          {student.gender} · {student.age} yrs
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-xs font-mono text-slate-700">{student.email}</p>
                        <p className="text-xs font-mono text-slate-500 tabular-nums">
                          {student.mobile}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-xs font-medium text-slate-900 max-w-xs truncate">
                          {student.courseTitle}
                        </p>
                        <p className="text-xs font-mono text-slate-500">
                          {student.transactionId}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        {student.status === 'approved' ? (
                          <span className="text-xs font-semibold text-emerald-700">Approved</span>
                        ) : student.status === 'pending' ? (
                          <span className="text-xs font-semibold text-amber-700">Pending</span>
                        ) : (
                          <span className="text-xs font-semibold text-rose-700">Rejected</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditStudent(student)}
                            aria-label={`Edit student ${student.fullName}`}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
                          >
                            Edit
                          </button>
                          {student.status === 'approved' ? (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmState({
                                  title: 'Revoke Student Access?',
                                  description: `Set ${student.fullName}'s enrollment for "${student.courseTitle}" back to Pending?`,
                                  confirmLabel: 'Revoke Access',
                                  tone: 'danger',
                                  action: async () => {
                                    await onUpdateEnrollmentStatus(student.id, 'pending');
                                    setConfirmState(null);
                                  },
                                })
                              }
                              className="px-2.5 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg"
                            >
                              Revoke
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmState({
                                  title: 'Grant Student Access?',
                                  description: `Approve ${student.fullName} for "${student.courseTitle}"?`,
                                  confirmLabel: 'Grant Access',
                                  tone: 'primary',
                                  action: async () => {
                                    await onUpdateEnrollmentStatus(student.id, 'approved');
                                    setConfirmState(null);
                                  },
                                })
                              }
                              className="px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmState({
                                title: `Remove ${student.fullName}?`,
                                description: `Delete this student enrollment record permanently?`,
                                confirmLabel: 'Remove Student',
                                tone: 'danger',
                                action: async () => {
                                  await onDeleteEnrollment(student.id);
                                  setConfirmState(null);
                                },
                              })
                            }
                            aria-label={`Remove ${student.fullName}`}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: GOOGLE SHEETS SYNC & ADMIN PAYMENT QR */}
      {activeTab === 'sheets' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Google Sheets Database Configuration */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-display font-semibold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-700" aria-hidden="true" />
                  Google Sheets Database Integration
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Store and sync Courses, Lessons, Enrollments, and Settings directly with a Google
                  Spreadsheet via the Google Sheets API.
                </p>
              </div>
            </div>

            {sheetFeedback && (
              <div
                className={`p-3 rounded-lg text-xs font-medium border ${
                  sheetFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {sheetFeedback.message}
              </div>
            )}

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-900">Linked Database Spreadsheet</span>
                {sheetConfig.spreadsheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                  >
                    Open Google Sheet
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
              <p className="font-mono text-slate-700 break-all">
                {sheetConfig.spreadsheetId || 'No spreadsheet linked'}
              </p>
              {sheetConfig.availableTabs.length > 0 && (
                <p className="text-slate-500">
                  Detected Tabs: {sheetConfig.availableTabs.join(', ')}
                </p>
              )}
            </div>

            {!googleUser || !hasAccessToken ? (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <p className="text-sm font-semibold text-slate-900">
                  Connect Your Google Account to Sync Sheets
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sign in with Google to read live courses and enrollment submissions from your
                  linked Google Sheet and write updates directly via the Sheets API.
                </p>
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  className="gsi-material-button"
                >
                  <div className="gsi-material-button-content-wrapper">
                    <span className="gsi-material-button-contents">Sign in with Google</span>
                  </div>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <p className="font-semibold text-slate-900">
                    Connected Google Account: {googleUser.email}
                  </p>
                  <p className="text-slate-600">
                    Active Spreadsheet:{' '}
                    {sheetConfig.spreadsheetId ? (
                      <span className="font-mono text-slate-900">
                        {sheetConfig.spreadsheetTitle} ({sheetConfig.spreadsheetId})
                      </span>
                    ) : (
                      'Not linked yet — create one or paste an existing ID below.'
                    )}
                  </p>
                  {sheetConfig.lastSyncedAt && (
                    <p className="text-slate-500">
                      Last synced: {new Date(sheetConfig.lastSyncedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {sheetConfig.spreadsheetId &&
                  ['Courses', 'Lessons', 'Enrollments', 'Settings'].some(
                    (tab) => !sheetConfig.availableTabs.includes(tab)
                  ) && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5">
                      <p className="text-xs font-semibold text-amber-900">
                        Database Tabs Not Yet Initialized in Linked Sheet
                      </p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Create the required Courses, Lessons, Enrollments, and Settings tabs in
                        your connected Google Sheet and populate starter records.
                      </p>
                      <button
                        type="button"
                        disabled={isSyncingSheets}
                        onClick={() =>
                          setConfirmState({
                            title: 'Initialize Database Tabs in Google Sheet?',
                            description: `This will create Courses, Lessons, Enrollments, and Settings tabs inside "${sheetConfig.spreadsheetTitle}" and write your current courses and settings.`,
                            confirmLabel: 'Initialize Tabs & Sync',
                            tone: 'primary',
                            action: async () => {
                              await onPushToSheet();
                              setConfirmState(null);
                            },
                          })
                        }
                        className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                      >
                        Initialize Database Tabs in Sheet
                      </button>
                    </div>
                  )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={isSyncingSheets}
                    onClick={onCreateSpreadsheet}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-60"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    {isSyncingSheets
                      ? 'Working...'
                      : 'Create New Course Database Sheet'}
                  </button>

                  {sheetConfig.spreadsheetId && (
                    <>
                      <button
                        type="button"
                        disabled={isSyncingSheets}
                        onClick={onPullFromSheet}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-60"
                      >
                        <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                        Pull from Sheet
                      </button>

                      <button
                        type="button"
                        disabled={isSyncingSheets}
                        onClick={() =>
                          setConfirmState({
                            title: 'Overwrite Google Sheet with Local Data?',
                            description: `This will update the Courses, Lessons, Enrollments, and Settings tabs inside "${sheetConfig.spreadsheetTitle}" with your current studio records.`,
                            confirmLabel: 'Push to Google Sheet',
                            tone: 'primary',
                            action: async () => {
                              await onPushToSheet();
                              setConfirmState(null);
                            },
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-60"
                      >
                        Push to Sheet
                      </button>
                    </>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <label
                    htmlFor="sheet-id-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Or Connect Existing Google Spreadsheet URL / ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="sheet-id-input"
                      type="text"
                      value={sheetIdInput}
                      onChange={(e) => setSheetIdInput(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiM..."
                      className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                    />
                    <button
                      type="button"
                      disabled={isSyncingSheets || !sheetIdInput.trim()}
                      onClick={() => onConnectSpreadsheet(sheetIdInput)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      Connect & Load
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Admin Payment QR Settings */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-display font-semibold text-slate-900 border-b border-slate-100 pb-3">
              Admin Payment QR Settings
            </h2>

            <div className="flex justify-center py-2">
              <QrCodeDisplay
                upiId={upiId}
                payeeName={payeeName}
                amount={2999}
                customQrUrl={customQrUrl}
                size={150}
              />
            </div>

            <div>
              <label htmlFor="qr-payee" className="block text-xs font-semibold text-slate-700 mb-1">
                Payee / Business Name
              </label>
              <input
                id="qr-payee"
                type="text"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="qr-upi" className="block text-xs font-semibold text-slate-700 mb-1">
                Admin UPI ID
              </label>
              <input
                id="qr-upi"
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor="qr-instructions"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Checkout Instructions
              </label>
              <textarea
                id="qr-instructions"
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor="custom-qr-upload"
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                {customQrUrl ? 'Replace Custom QR Image' : 'Upload Custom Admin QR Image'}
              </label>
              <input
                id="custom-qr-upload"
                type="file"
                accept="image/*"
                onChange={handleCustomQrUpload}
                className="sr-only"
              />
              {customQrUrl && (
                <button
                  type="button"
                  onClick={() => setCustomQrUrl('')}
                  className="mt-1.5 text-xs text-slate-500 hover:text-slate-900 underline"
                >
                  Revert to Auto-Generated UPI QR
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setConfirmState({
                  title: 'Update Payment QR Settings?',
                  description: `Apply updated UPI ID (${upiId}) and QR checkout instructions across all courses?`,
                  confirmLabel: 'Save Payment Settings',
                  tone: 'primary',
                  action: async () => {
                    await onSavePaymentSettings({
                      upiId: upiId.trim(),
                      payeeName: payeeName.trim(),
                      instructions: instructions.trim(),
                      customQrUrl,
                    });
                    setConfirmState(null);
                  },
                })
              }
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
            >
              Save Payment QR Settings
            </button>
          </div>
        </section>
      )}

      {/* PAYMENT SCREENSHOT LIGHTBOX MODAL */}
      {lightboxRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-[2px] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Payment receipt inspection"
        >
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Payment Receipt · {lightboxRequest.fullName}
                </h3>
                <p className="text-xs font-mono text-slate-500">
                  UTR: {lightboxRequest.transactionId} · {formatCurrency(lightboxRequest.amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxRequest(null)}
                aria-label="Close receipt preview"
                className="p-1 text-slate-400 hover:text-slate-900 rounded-lg"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-5 bg-slate-50 flex justify-center max-h-[70vh] overflow-auto">
              <SafeImage
                src={lightboxRequest.screenshotDataUrl}
                alt={`Uploaded transaction screenshot for ${lightboxRequest.fullName}`}
                className="max-w-full max-h-[60vh] object-contain rounded-lg border border-slate-200 bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* COURSE EDITOR MODAL */}
      {isCourseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="course-editor-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full my-8 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 id="course-editor-title" className="text-lg font-display font-semibold text-slate-900">
                {editingCourseId ? 'Edit Course & Playlist' : 'Add New Video Course'}
              </h2>
              <button
                type="button"
                onClick={() => setIsCourseModalOpen(false)}
                aria-label="Close course editor"
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCourseSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="course-title-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Course Title *
                  </label>
                  <input
                    id="course-title-input"
                    type="text"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="e.g. Color Grading for Commercial Cinema"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  {courseErrors.title && (
                    <p className="mt-1 text-xs text-rose-600">{courseErrors.title}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="course-price-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Price (INR) *
                  </label>
                  <input
                    id="course-price-input"
                    type="number"
                    min={0}
                    value={coursePrice}
                    onChange={(e) => setCoursePrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                  {courseErrors.price && (
                    <p className="mt-1 text-xs text-rose-600">{courseErrors.price}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="course-category-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Category *
                  </label>
                  <input
                    id="course-category-input"
                    type="text"
                    value={courseCategory}
                    onChange={(e) => setCourseCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  {courseErrors.category && (
                    <p className="mt-1 text-xs text-rose-600">{courseErrors.category}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="course-instructor-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Instructor Name *
                  </label>
                  <input
                    id="course-instructor-input"
                    type="text"
                    value={courseInstructor}
                    onChange={(e) => setCourseInstructor(e.target.value)}
                    placeholder="e.g. Kabir Verma"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  {courseErrors.instructor && (
                    <p className="mt-1 text-xs text-rose-600">{courseErrors.instructor}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="course-level-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Level
                  </label>
                  <select
                    id="course-level-input"
                    value={courseLevel}
                    onChange={(e) => setCourseLevel(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="All Levels">All Levels</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="course-image-select"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Cover Image Asset or URL *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      id="course-image-select"
                      value={
                        Object.values(COURSE_IMAGES).includes(courseImageUrl as never)
                          ? courseImageUrl
                          : 'custom'
                      }
                      onChange={(e) => {
                        if (e.target.value !== 'custom') {
                          setCourseImageUrl(e.target.value);
                        }
                      }}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value={COURSE_IMAGES.cinematography}>Studio Camera Cover</option>
                      <option value={COURSE_IMAGES.uiArchitecture}>Design Desk Cover</option>
                      <option value={COURSE_IMAGES.soundDesign}>Audio Studio Cover</option>
                      <option value={COURSE_IMAGES.fullstackSystems}>Engineering Desk Cover</option>
                      <option value={COURSE_IMAGES.brandTypography}>Typography Cover</option>
                      <option value="custom">Custom URL</option>
                    </select>
                    <input
                      type="text"
                      aria-label="Course cover image URL"
                      value={courseImageUrl}
                      onChange={(e) => setCourseImageUrl(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="course-desc-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Description *
                  </label>
                  <textarea
                    id="course-desc-input"
                    rows={3}
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    placeholder="Describe what students will master across these video lessons..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  {courseErrors.description && (
                    <p className="mt-1 text-xs text-rose-600">{courseErrors.description}</p>
                  )}
                </div>
              </div>

              {/* Video Lessons Playlist Builder */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Video Lesson Playlist ({courseLessonsDraft.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddDraftLesson}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    Add Video Lesson
                  </button>
                </div>

                <div className="space-y-3">
                  {courseLessonsDraft.map((lesson, idx) => (
                    <div
                      key={lesson.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-semibold text-slate-600">
                          Lesson #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCourseLessonsDraft((prev) => prev.filter((l) => l.id !== lesson.id))
                          }
                          className="text-xs text-rose-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <input
                          type="text"
                          aria-label={`Lesson ${idx + 1} title`}
                          value={lesson.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCourseLessonsDraft((prev) =>
                              prev.map((l) => (l.id === lesson.id ? { ...l, title: val } : l))
                            );
                          }}
                          placeholder="Lesson title"
                          className="sm:col-span-2 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                        />
                        <input
                          type="text"
                          aria-label={`Lesson ${idx + 1} duration`}
                          value={lesson.duration}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCourseLessonsDraft((prev) =>
                              prev.map((l) => (l.id === lesson.id ? { ...l, duration: val } : l))
                            );
                          }}
                          placeholder="15:00"
                          className="px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          aria-label={`Lesson ${idx + 1} summary`}
                          value={lesson.summary}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCourseLessonsDraft((prev) =>
                              prev.map((l) => (l.id === lesson.id ? { ...l, summary: val } : l))
                            );
                          }}
                          placeholder="Lesson summary"
                          className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                        />
                        <input
                          type="text"
                          aria-label={`Lesson ${idx + 1} video URL`}
                          value={lesson.videoUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCourseLessonsDraft((prev) =>
                              prev.map((l) => (l.id === lesson.id ? { ...l, videoUrl: val } : l))
                            );
                          }}
                          placeholder="Optional MP4/YouTube URL (blank = Studio Player)"
                          className="px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                >
                  {editingCourseId ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT EDIT MODAL */}
      {editingStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-student-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="edit-student-title" className="text-base font-display font-semibold text-slate-900">
                Edit Student Record
              </h3>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                aria-label="Close student editor"
                className="text-slate-400 hover:text-slate-900"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSaveStudentEdit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile</label>
                <input
                  type="tel"
                  required
                  value={editStudentMobile}
                  onChange={(e) => setEditStudentMobile(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email ID</label>
                <input
                  type="email"
                  required
                  value={editStudentEmail}
                  onChange={(e) => setEditStudentEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                <textarea
                  rows={2}
                  required
                  value={editStudentAddress}
                  onChange={(e) => setEditStudentAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY CONFIRMATION DIALOG */}
      <ConfirmModal
        isOpen={confirmState !== null}
        title={confirmState?.title || ''}
        description={confirmState?.description || ''}
        confirmLabel={confirmState?.confirmLabel || 'Confirm'}
        tone={confirmState?.tone || 'primary'}
        onConfirm={() => {
          void confirmState?.action();
        }}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
};
