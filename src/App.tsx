import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { ArrowRight, CheckCircle2, Lock, PlayCircle, Search } from 'lucide-react';
import type {
  Course,
  EnrollmentRequest,
  EnrollmentStatus,
  PaymentSettings,
  SheetSyncConfig,
  VideoLesson,
} from './types/academy';
import {
  HERO_BANNER_IMAGE,
  INITIAL_COURSES,
  INITIAL_ENROLLMENTS,
  INITIAL_LESSONS,
  INITIAL_PAYMENT_SETTINGS,
} from './data/seedData';
import {
  DEFAULT_SPREADSHEET_ID,
  getLatestEnrollmentForCourse,
  isCourseUnlockedForStudent,
} from './utils/academyLogic';
import {
  getCachedAccessToken,
  initGoogleAuth,
  signInWithGoogleSheets,
  signOutGoogle,
} from './services/googleAuth';
import {
  createAcademySpreadsheet,
  fetchAcademyDataFromSheet,
  pushAllDataToSheet,
  syncCoursesAndLessonsToSheet,
  syncEnrollmentsToSheet,
  syncSettingsToSheet,
} from './services/googleSheetsDb';
import { Header, type AppView } from './components/Header';
import { SafeImage } from './components/SafeImage';
import { CourseCard } from './components/CourseCard';
import { CourseDetailView } from './components/CourseDetailView';
import { EnrollmentModal } from './components/EnrollmentModal';
import { PlaylistOverviewView } from './components/PlaylistOverviewView';
import { MyAccessView } from './components/MyAccessView';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminPasswordModal } from './components/AdminPasswordModal';

const STORAGE_KEYS = {
  courses: 'acc_computer_courses_v1',
  lessons: 'acc_computer_lessons_v1',
  enrollments: 'acc_computer_enrollments_v1',
  paymentSettings: 'acc_computer_payment_v1',
  sheetConfig: 'acc_computer_sheet_cfg_v2',
  studentEmail: 'acc_computer_student_email_v1',
} as const;

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    if (
      typeof fallback === 'object' &&
      !Array.isArray(fallback) &&
      (typeof parsed !== 'object' || Array.isArray(parsed))
    ) {
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('home');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(INITIAL_COURSES[0].id);
  const [enrollTargetCourse, setEnrollTargetCourse] = useState<Course | null>(null);

  const [courses, setCourses] = useState<Course[]>(() =>
    readStorage(STORAGE_KEYS.courses, INITIAL_COURSES)
  );
  const [lessons, setLessons] = useState<VideoLesson[]>(() =>
    readStorage(STORAGE_KEYS.lessons, INITIAL_LESSONS)
  );
  const [enrollments, setEnrollments] = useState<EnrollmentRequest[]>(() =>
    readStorage(STORAGE_KEYS.enrollments, INITIAL_ENROLLMENTS)
  );
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(() =>
    readStorage(STORAGE_KEYS.paymentSettings, INITIAL_PAYMENT_SETTINGS)
  );
  const [sheetConfig, setSheetConfig] = useState<SheetSyncConfig>(() =>
    readStorage(STORAGE_KEYS.sheetConfig, {
      spreadsheetId: DEFAULT_SPREADSHEET_ID,
      spreadsheetTitle: 'ACC Computer Linked Database',
      lastSyncedAt: null,
      availableTabs: [],
    })
  );
  const [activeStudentEmail, setActiveStudentEmail] = useState<string>(() =>
    readStorage(STORAGE_KEYS.studentEmail, '')
  );

  // Storefront search & category filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [toastBanner, setToastBanner] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isAdminPromptOpen, setIsAdminPromptOpen] = useState(false);

  // Google Auth & Sheets state (token kept strictly in memory via googleAuth.ts)
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetFeedback, setSheetFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.courses, JSON.stringify(courses));
    } catch {
      // ignore quota errors
    }
  }, [courses]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.lessons, JSON.stringify(lessons));
    } catch {
      // ignore
    }
  }, [lessons]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.enrollments, JSON.stringify(enrollments));
    } catch {
      // ignore
    }
  }, [enrollments]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.paymentSettings, JSON.stringify(paymentSettings));
    } catch {
      // ignore
    }
  }, [paymentSettings]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.sheetConfig, JSON.stringify(sheetConfig));
    } catch {
      // ignore
    }
  }, [sheetConfig]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.studentEmail, JSON.stringify(activeStudentEmail));
    } catch {
      // ignore
    }
  }, [activeStudentEmail]);

  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user) => {
        setGoogleUser(user);
        setHasAccessToken(Boolean(getCachedAccessToken()));
      },
      () => {
        setGoogleUser(null);
        setHasAccessToken(false);
      }
    );
    return unsubscribe;
  }, []);

  const showToast = (msg: string) => {
    setToastBanner(msg);
    window.setTimeout(() => {
      setToastBanner((prev) => (prev === msg ? null : prev));
    }, 5000);
  };

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setSheetFeedback(null);
    try {
      const result = await signInWithGoogleSheets();
      setGoogleUser(result.user);
      setHasAccessToken(true);
      showToast(`Connected Google account: ${result.user.email || 'Authenticated'}`);

      // If a spreadsheet was previously linked, auto-pull live data from Google Sheets
      if (sheetConfig.spreadsheetId) {
        await pullFromSheetWithToken(result.accessToken, sheetConfig.spreadsheetId);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google Sign-In was cancelled or failed.';
      setSheetFeedback({ type: 'error', message });
      showToast(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogle();
    setGoogleUser(null);
    setHasAccessToken(false);
    showToast('Signed out of Google Sheets session.');
  };

  const pullFromSheetWithToken = async (token: string, spreadsheetId: string) => {
    setIsSyncingSheets(true);
    setSheetFeedback(null);
    try {
      const data = await fetchAcademyDataFromSheet(token, spreadsheetId);
      if (data.courses.length > 0) setCourses(data.courses);
      if (data.lessons.length > 0) setLessons(data.lessons);
      if (data.enrollments.length > 0) setEnrollments(data.enrollments);
      if (Object.keys(data.settings).length > 0) {
        setPaymentSettings((prev) => ({ ...prev, ...data.settings }));
      }
      setSheetConfig({
        spreadsheetId: data.spreadsheetId,
        spreadsheetTitle: data.title,
        lastSyncedAt: new Date().toISOString(),
        availableTabs: data.tabNames,
      });

      if (data.missingRequiredTabs.length > 0) {
        setSheetFeedback({
          type: 'error',
          message: `Connected "${data.title}", but it is missing database tab(s): ${data.missingRequiredTabs.join(
            ', '
          )}. Click "Initialize Database Tabs in Sheet" below to set up the tables.`,
        });
      } else {
        setSheetFeedback({
          type: 'success',
          message: `Synced ${data.courses.length} courses and ${data.enrollments.length} enrollments from "${data.title}".`,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data from Google Sheet.';
      setSheetFeedback({ type: 'error', message });
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleCreateSpreadsheet = async () => {
    const token = getCachedAccessToken();
    if (!token) {
      setSheetFeedback({ type: 'error', message: 'Please sign in with Google first.' });
      return;
    }
    setIsSyncingSheets(true);
    setSheetFeedback(null);
    try {
      const created = await createAcademySpreadsheet(token, {
        courses,
        lessons,
        enrollments,
        settings: paymentSettings,
      });
      setSheetConfig({
        spreadsheetId: created.spreadsheetId,
        spreadsheetTitle: created.title,
        lastSyncedAt: new Date().toISOString(),
        availableTabs: created.tabNames,
      });
      setSheetFeedback({
        type: 'success',
        message: `Created "${created.title}" in Google Sheets and synced all course data.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not create spreadsheet.';
      setSheetFeedback({ type: 'error', message });
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleConnectSpreadsheet = async (rawId: string) => {
    const token = getCachedAccessToken();
    if (!token) {
      setSheetFeedback({ type: 'error', message: 'Please sign in with Google first.' });
      return;
    }
    await pullFromSheetWithToken(token, rawId);
  };

  const handlePullFromSheet = async () => {
    const token = getCachedAccessToken();
    if (!token || !sheetConfig.spreadsheetId) return;
    await pullFromSheetWithToken(token, sheetConfig.spreadsheetId);
  };

  const handlePushToSheet = async () => {
    const token = getCachedAccessToken();
    if (!token || !sheetConfig.spreadsheetId) return;
    setIsSyncingSheets(true);
    setSheetFeedback(null);
    try {
      await pushAllDataToSheet(token, sheetConfig.spreadsheetId, {
        courses,
        lessons,
        enrollments,
        settings: paymentSettings,
      });
      setSheetConfig((prev) => ({
        ...prev,
        lastSyncedAt: new Date().toISOString(),
        availableTabs: ['Courses', 'Lessons', 'Enrollments', 'Settings'],
      }));
      setSheetFeedback({
        type: 'success',
        message: 'Synced Courses, Lessons, Enrollments, and Settings tabs in Google Sheets.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to push data to Google Sheets.';
      setSheetFeedback({ type: 'error', message });
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // --- Domain Mutation Handlers (Local + Auto-Sync to Google Sheets when connected) ---

  const handleSubmitEnrollment = async (request: EnrollmentRequest) => {
    const nextEnrollments = [request, ...enrollments];
    setEnrollments(nextEnrollments);
    setActiveStudentEmail(request.email);
    showToast(
      `Enrollment submitted for ${request.courseTitle}. Admin will verify UTR ${request.transactionId}.`
    );

    const token = getCachedAccessToken();
    if (token && sheetConfig.spreadsheetId) {
      try {
        await syncEnrollmentsToSheet(token, sheetConfig.spreadsheetId, nextEnrollments);
        setSheetConfig((prev) => ({ ...prev, lastSyncedAt: new Date().toISOString() }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sheet sync failed.';
        setSheetFeedback({ type: 'error', message });
      }
    }
  };

  const handleUpdateEnrollmentStatus = async (id: string, status: EnrollmentStatus) => {
    const nextEnrollments = enrollments.map((e) =>
      e.id === id ? { ...e, status, reviewedAt: new Date().toISOString() } : e
    );
    setEnrollments(nextEnrollments);
    showToast(`Enrollment marked as ${status}.`);

    const token = getCachedAccessToken();
    if (token && sheetConfig.spreadsheetId) {
      try {
        await syncEnrollmentsToSheet(token, sheetConfig.spreadsheetId, nextEnrollments);
        setSheetConfig((prev) => ({ ...prev, lastSyncedAt: new Date().toISOString() }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sheet sync failed.';
        setSheetFeedback({ type: 'error', message });
      }
    }
  };

  const handleUpdateStudentDetails = async (
    id: string,
    updates: Pick<EnrollmentRequest, 'fullName' | 'mobile' | 'email' | 'address'>
  ) => {
    const nextEnrollments = enrollments.map((e) => (e.id === id ? { ...e, ...updates } : e));
    setEnrollments(nextEnrollments);
    showToast(`Updated student record for ${updates.fullName}.`);

    const token = getCachedAccessToken();
    if (token && sheetConfig.spreadsheetId) {
      try {
        await syncEnrollmentsToSheet(token, sheetConfig.spreadsheetId, nextEnrollments);
        setSheetConfig((prev) => ({ ...prev, lastSyncedAt: new Date().toISOString() }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sheet sync failed.';
        setSheetFeedback({ type: 'error', message });
      }
    }
  };

  const handleDeleteEnrollment = async (id: string) => {
    const nextEnrollments = enrollments.filter((e) => e.id !== id);
    setEnrollments(nextEnrollments);
    showToast('Student enrollment record removed.');

    const token = getCachedAccessToken();
    if (token && sheetConfig.spreadsheetId) {
      try {
        await syncEnrollmentsToSheet(token, sheetConfig.spreadsheetId, nextEnrollments);
        setSheetConfig((prev) => ({ ...prev, lastSyncedAt: new Date().toISOString() }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sheet sync failed.';
        setSheetFeedback({ type: 'error', message });
      }
    }
  };

  const handleSaveCourse = async (
    savedCourse: Course,
    courseLessons: VideoLesson[],
    isNew: boolean
  ) => {
    const nextCourses = isNew
      ? [savedCourse, ...courses]
      : courses.map((c) => (c.id === savedCourse.id ? savedCourse : c));
    const otherLessons = lessons.filter((l) => l.courseId !== savedCourse.id);
    const nextLessons = [...otherLessons, ...courseLessons];

    setCourses(nextCourses);
    setLessons(nextLessons);
    showToast(isNew ? `Added "${savedCourse.title}" to catalog.` : `Updated "${savedCourse.title}".`);

    const token = getCachedAccessToken();
    if (token && sheetConfig.spreadsheetId) {
      try {
        await syncCoursesAndLessonsToSheet(
          token,
          sheetConfig.spreadsheetId,
          nextCourses,
          nextLessons
        );
        setSheetConfig((prev) => ({ ...prev, lastSyncedAt: new Date().toISOString() }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sheet sync failed.';
        setSheetFeedback({ type: 'error', message });
      }
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    const nextCourses = courses.filter((c) => c.id !== courseId);
    const nextLessons = lessons.filter((l) => l.courseId !== courseId);
    setCourses(nextCourses);
    setLessons(nextLessons);
    if (selectedCourseId === courseId && nextCourses[0]) {
      setSelectedCourseId(nextCourses[0].id);
    }
    showToast('Course deleted from catalog.');

    const token = getCachedAccessToken();
    if (token && sheetConfig.spreadsheetId) {
      try {
        await syncCoursesAndLessonsToSheet(
          token,
          sheetConfig.spreadsheetId,
          nextCourses,
          nextLessons
        );
        setSheetConfig((prev) => ({ ...prev, lastSyncedAt: new Date().toISOString() }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sheet sync failed.';
        setSheetFeedback({ type: 'error', message });
      }
    }
  };

  const handleSavePaymentSettings = async (settings: PaymentSettings) => {
    setPaymentSettings(settings);
    showToast('Admin Payment QR settings updated.');

    const token = getCachedAccessToken();
    if (token && sheetConfig.spreadsheetId) {
      try {
        await syncSettingsToSheet(token, sheetConfig.spreadsheetId, settings);
        setSheetConfig((prev) => ({ ...prev, lastSyncedAt: new Date().toISOString() }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sheet sync failed.';
        setSheetFeedback({ type: 'error', message });
      }
    }
  };

  const categories = useMemo(() => {
    const unique = Array.from(new Set(courses.map((c) => c.category)));
    return ['All', ...unique];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return courses.filter((c) => {
      const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;
      const matchesSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.instructor.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [courses, categoryFilter, searchQuery]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  const openCourseDetail = (courseId: string) => {
    setSelectedCourseId(courseId);
    setActiveView('course');
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        activeView={activeView}
        onNavigate={(view) => {
          if (view === 'admin' && !isAdminAuthenticated) {
            setIsAdminPromptOpen(true);
            return;
          }
          setActiveView(view);
          window.scrollTo(0, 0);
        }}
        googleUser={googleUser}
        isLoggingIn={isLoggingIn}
        isAdminAuthenticated={isAdminAuthenticated}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
      />

      {toastBanner && (
        <div
          role="status"
          className="bg-slate-900 text-white text-xs font-medium px-4 py-2.5 text-center border-b border-slate-800"
        >
          {toastBanner}
        </div>
      )}

      <main className="flex-1">
        {/* HOME STOREFRONT */}
        {activeView === 'home' && (
          <div>
            {/* Editorial Storefront Hero (2-Column Balanced Split) */}
            <section className="bg-white border-b border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
                <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                  <p className="text-sm font-semibold text-blue-700">
                    Structured Studio Curriculum
                  </p>
                  <h1 className="text-4xl sm:text-5xl font-display font-bold text-slate-900 tracking-tight leading-[1.1] [text-wrap:balance]">
                    Craft-led video courses with full lesson playlists.
                  </h1>
                  <p className="text-base text-slate-600 max-w-xl leading-relaxed">
                    Browse studio-recorded video courses across filmmaking, UI systems, sound
                    design, and cloud engineering. Inspect every playlist before you enroll via QR
                    verification.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <a
                      href="#course-catalog"
                      className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Explore Courses
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setActiveView('playlists')}
                      className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <PlayCircle className="w-4 h-4" aria-hidden="true" />
                      Browse All Playlists
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div className="relative aspect-[16/10] lg:h-full w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <SafeImage
                      src={HERO_BANNER_IMAGE}
                      alt="ACC Computer studio workstation displaying video editing timeline"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Course Catalog Grid */}
            <section id="course-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
                    Available Video Courses
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Select any course card to inspect its video lesson thumbnails and playlist.
                  </p>
                </div>

                {/* Search Input */}
                <div className="relative w-full md:w-72">
                  <Search
                    className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search courses"
                    placeholder="Search courses or instructors..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              {/* Interactive Category Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg w-fit">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      categoryFilter === cat
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {filteredCourses.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No courses match your current search or category filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('All');
                    }}
                    className="mt-3 text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                  {filteredCourses.map((course) => {
                    const courseLessons = lessons
                      .filter((l) => l.courseId === course.id)
                      .sort((a, b) => a.order - b.order);
                    const latest = getLatestEnrollmentForCourse(
                      enrollments,
                      course.id,
                      activeStudentEmail
                    );
                    return (
                      <CourseCard
                        key={course.id}
                        course={course}
                        lessons={courseLessons}
                        enrollmentStatus={latest?.status}
                        onSelectCourse={openCourseDetail}
                      />
                    );
                  })}
                </div>
              )}

              {/* Compact Home Playlist Access Strip */}
              <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-display font-semibold text-slate-900">
                    Want to preview every course playlist at once?
                  </h3>
                  <p className="text-xs text-slate-600">
                    Each course includes multi-part video thumbnails and instant playback once your
                    payment receipt is verified.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {activeStudentEmail && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      Active Student: {activeStudentEmail}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveView('playlists')}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Open Full Playlists Directory
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* COURSE DETAIL & VIDEO PLAYLIST */}
        {activeView === 'course' && selectedCourse && (
          <CourseDetailView
            course={selectedCourse}
            lessons={lessons.filter((l) => l.courseId === selectedCourse.id)}
            activeStudentEmail={activeStudentEmail}
            latestEnrollment={getLatestEnrollmentForCourse(
              enrollments,
              selectedCourse.id,
              activeStudentEmail
            )}
            isUnlocked={isCourseUnlockedForStudent(
              enrollments,
              selectedCourse.id,
              activeStudentEmail
            )}
            onBack={() => setActiveView('home')}
            onOpenEnrollModal={() => setEnrollTargetCourse(selectedCourse)}
            onChangeActiveEmail={(email) => {
              setActiveStudentEmail(email);
              if (email) {
                showToast(`Checking unlocked courses for ${email}`);
              }
            }}
          />
        )}

        {/* PLAYLISTS DIRECTORY */}
        {activeView === 'playlists' && (
          <PlaylistOverviewView
            courses={courses}
            lessons={lessons}
            enrollments={enrollments}
            activeStudentEmail={activeStudentEmail}
            onSelectCourse={openCourseDetail}
            onEnrollCourse={(course) => setEnrollTargetCourse(course)}
          />
        )}

        {/* MY ACCESS LOOKUP */}
        {activeView === 'access' && (
          <MyAccessView
            enrollments={enrollments}
            courses={courses}
            activeStudentEmail={activeStudentEmail}
            onChangeActiveEmail={(email) => setActiveStudentEmail(email)}
            onOpenCourse={openCourseDetail}
          />
        )}

        {/* ADMIN DASHBOARD (Password Protected) */}
        {activeView === 'admin' && isAdminAuthenticated && (
          <div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsAdminAuthenticated(false);
                  setActiveView('home');
                  window.scrollTo(0, 0);
                  showToast('Admin panel locked.');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-colors"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                Lock Admin
              </button>
            </div>
            <AdminDashboard
              courses={courses}
              lessons={lessons}
              enrollments={enrollments}
              paymentSettings={paymentSettings}
              sheetConfig={sheetConfig}
              googleUser={googleUser}
              hasAccessToken={hasAccessToken}
              isSyncingSheets={isSyncingSheets}
              sheetFeedback={sheetFeedback}
              onGoogleSignIn={handleGoogleSignIn}
              onCreateSpreadsheet={handleCreateSpreadsheet}
              onConnectSpreadsheet={handleConnectSpreadsheet}
              onPullFromSheet={handlePullFromSheet}
              onPushToSheet={handlePushToSheet}
              onUpdateEnrollmentStatus={handleUpdateEnrollmentStatus}
              onUpdateStudentDetails={handleUpdateStudentDetails}
              onDeleteEnrollment={handleDeleteEnrollment}
              onSaveCourse={handleSaveCourse}
              onDeleteCourse={handleDeleteCourse}
              onSavePaymentSettings={handleSavePaymentSettings}
            />
          </div>
        )}
      </main>

      {/* Clean Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ACC Computer. All course rights reserved.</p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => {
                setActiveView('home');
                window.scrollTo(0, 0);
              }}
              className="hover:text-slate-900 transition-colors"
            >
              Courses
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('playlists');
                window.scrollTo(0, 0);
              }}
              className="hover:text-slate-900 transition-colors"
            >
              Playlists
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('access');
                window.scrollTo(0, 0);
              }}
              className="hover:text-slate-900 transition-colors"
            >
              Student Access
            </button>
          </div>
        </div>
      </footer>

      {/* Tiny discreet Admin access sign in left-bottom corner */}
      <button
        type="button"
        onClick={() => {
          if (isAdminAuthenticated) {
            setActiveView('admin');
            window.scrollTo(0, 0);
          } else {
            setIsAdminPromptOpen(true);
          }
        }}
        aria-label="Admin Sign In"
        title="Admin Sign In"
        className="fixed bottom-3 left-3 z-40 w-7 h-7 rounded-md flex items-center justify-center bg-white/75 hover:bg-white text-slate-400 hover:text-slate-800 border border-slate-200/70 hover:border-slate-300 shadow-xs opacity-50 hover:opacity-100 transition-all focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-blue-700"
      >
        <Lock className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      {/* Admin Password Prompt Modal */}
      <AdminPasswordModal
        isOpen={isAdminPromptOpen}
        onClose={() => setIsAdminPromptOpen(false)}
        onUnlock={() => {
          setIsAdminAuthenticated(true);
          setIsAdminPromptOpen(false);
          setActiveView('admin');
          window.scrollTo(0, 0);
          showToast('Admin Studio unlocked.');
        }}
      />

      {/* Enrollment Checkout Modal */}
      <EnrollmentModal
        isOpen={enrollTargetCourse !== null}
        course={enrollTargetCourse}
        paymentSettings={paymentSettings}
        defaultEmail={activeStudentEmail}
        onClose={() => setEnrollTargetCourse(null)}
        onSubmitEnrollment={handleSubmitEnrollment}
      />
    </div>
  );
}
