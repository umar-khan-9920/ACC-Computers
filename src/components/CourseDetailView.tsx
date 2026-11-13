import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Lock,
  Play,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { Course, EnrollmentRequest, VideoLesson } from '../types/academy';
import { formatCurrency, formatTotalDuration } from '../utils/academyLogic';
import { SafeImage } from './SafeImage';
import { VideoLessonPlayer } from './VideoLessonPlayer';

interface CourseDetailViewProps {
  course: Course;
  lessons: VideoLesson[];
  activeStudentEmail: string;
  latestEnrollment?: EnrollmentRequest;
  isUnlocked: boolean;
  onBack: () => void;
  onOpenEnrollModal: () => void;
  onChangeActiveEmail: (email: string) => void;
}

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  course,
  lessons,
  activeStudentEmail,
  latestEnrollment,
  isUnlocked,
  onBack,
  onOpenEnrollModal,
  onChangeActiveEmail,
}) => {
  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);
  const [playingLessonId, setPlayingLessonId] = useState<string | null>(
    isUnlocked && sortedLessons[0] ? sortedLessons[0].id : null
  );
  const [emailInput, setEmailInput] = useState(activeStudentEmail);

  const activeLessonIndex = sortedLessons.findIndex((l) => l.id === playingLessonId);
  const activeLesson =
    isUnlocked && activeLessonIndex >= 0
      ? sortedLessons[activeLessonIndex]
      : isUnlocked
        ? sortedLessons[0]
        : undefined;

  const handleLessonClick = (lesson: VideoLesson) => {
    if (!isUnlocked) {
      onOpenEnrollModal();
      return;
    }
    setPlayingLessonId(lesson.id);
  };

  const handleVerifyEmailCheck = (e: React.FormEvent) => {
    e.preventDefault();
    onChangeActiveEmail(emailInput.trim());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to All Courses
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Main Stage: Video Player / Cover + Lesson Playlist */}
        <div className="lg:col-span-8 space-y-8">
          {/* Active Player if unlocked, otherwise Course Showcase Banner */}
          {isUnlocked && activeLesson ? (
            <VideoLessonPlayer
              lesson={activeLesson}
              hasPrevious={activeLessonIndex > 0}
              hasNext={activeLessonIndex >= 0 && activeLessonIndex < sortedLessons.length - 1}
              onPrevious={() => {
                if (activeLessonIndex > 0) {
                  setPlayingLessonId(sortedLessons[activeLessonIndex - 1].id);
                }
              }}
              onNext={() => {
                if (activeLessonIndex < sortedLessons.length - 1) {
                  setPlayingLessonId(sortedLessons[activeLessonIndex + 1].id);
                }
              }}
            />
          ) : (
            <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
              <SafeImage
                src={course.imageUrl}
                alt={course.title}
                className="w-full h-full object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent" />
              <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end text-white">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                  <span>{course.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{course.level}</span>
                  <span aria-hidden="true">·</span>
                  <span>{sortedLessons.length} Video Lessons</span>
                </div>
                <h1 className="mt-2 text-2xl sm:text-4xl font-display font-bold leading-tight [text-wrap:balance]">
                  {course.title}
                </h1>
                <p className="mt-3 text-sm sm:text-base text-slate-200 max-w-2xl leading-relaxed">
                  {course.description}
                </p>
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={onOpenEnrollModal}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-600 rounded-lg transition-colors shadow-sm"
                  >
                    <Lock className="w-4 h-4" aria-hidden="true" />
                    Enroll & Unlock {sortedLessons.length} Videos
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Course Description when unlocked */}
          {isUnlocked && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span>{course.category}</span>
                <span aria-hidden="true">·</span>
                <span>{course.level}</span>
                <span aria-hidden="true">·</span>
                <span>Instructor: {course.instructor}</span>
              </div>
              <h1 className="mt-1.5 text-2xl font-display font-bold text-slate-900">
                {course.title}
              </h1>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{course.description}</p>
            </div>
          )}

          {/* Video Lesson Playlist */}
          <section aria-labelledby="playlist-heading" className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 id="playlist-heading" className="text-lg font-display font-semibold text-slate-900">
                  Course Video Playlist
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isUnlocked
                    ? 'All video lessons are unlocked. Select any lesson thumbnail below to play.'
                    : 'Preview lesson thumbnails below. Click any lesson to complete enrollment and unlock playback.'}
                </p>
              </div>
              <span className="text-xs font-mono font-medium text-slate-600 tabular-nums">
                {sortedLessons.length} Lessons · {formatTotalDuration(sortedLessons)}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {sortedLessons.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No video lessons have been added to this course yet.
                </div>
              ) : (
                sortedLessons.map((lesson) => {
                  const isCurrent = isUnlocked && activeLesson?.id === lesson.id;
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => handleLessonClick(lesson)}
                      aria-label={
                        isUnlocked
                          ? `Play lesson ${lesson.title}`
                          : `Unlock to watch ${lesson.title}`
                      }
                      className={`w-full text-left p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors focus-visible:outline-2 focus-visible:outline-blue-700 ${
                        isCurrent ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Video Thumbnail with Lock or Play State */}
                      <div className="relative w-full sm:w-44 aspect-video rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
                        <SafeImage
                          src={lesson.thumbnailUrl || course.imageUrl}
                          alt={`Thumbnail for ${lesson.title}`}
                          className={`w-full h-full object-cover ${
                            isUnlocked ? '' : 'brightness-75'
                          }`}
                        />
                        <div className="absolute inset-0 bg-slate-950/35 flex items-center justify-center">
                          {isUnlocked ? (
                            <span className="w-10 h-10 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow">
                              <Play className="w-4 h-4 ml-0.5" aria-hidden="true" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/85 text-white text-xs font-medium">
                              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                              Locked
                            </span>
                          )}
                        </div>
                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-950/85 text-white font-mono text-[11px] tabular-nums">
                          {lesson.duration}
                        </span>
                      </div>

                      {/* Lesson Metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3
                            className={`text-sm sm:text-base font-semibold truncate ${
                              isCurrent ? 'text-blue-800' : 'text-slate-900'
                            }`}
                          >
                            {lesson.title}
                          </h3>
                          {isCurrent && (
                            <span className="text-xs font-semibold text-blue-700 shrink-0">
                              Now Playing
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                          {lesson.summary}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Right Sticky Purchase & Verification Status Module */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-baseline justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Full Lifetime Access</p>
                <p className="text-3xl font-display font-bold text-slate-900 tabular-nums mt-1">
                  {formatCurrency(course.price)}
                </p>
              </div>
              <span className="text-xs font-medium text-slate-600">
                {course.level}
              </span>
            </div>

            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Instructor</dt>
                <dd className="font-medium text-slate-900">{course.instructor}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Video Lessons</dt>
                <dd className="font-mono font-medium text-slate-900 tabular-nums">
                  {sortedLessons.length} Lessons
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Total Runtime</dt>
                <dd className="font-mono font-medium text-slate-900 tabular-nums">
                  {formatTotalDuration(sortedLessons)}
                </dd>
              </div>
            </dl>

            {/* Enrollment Status Box */}
            {isUnlocked ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Enrollment Approved</span>
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Verified for <span className="font-medium">{activeStudentEmail}</span>. Click any
                  lesson thumbnail to watch.
                </p>
              </div>
            ) : latestEnrollment?.status === 'pending' ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Pending Admin Verification</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Receipt <span className="font-mono">{latestEnrollment.transactionId}</span> for{' '}
                  {latestEnrollment.email} is awaiting approval in the Admin Dashboard.
                </p>
              </div>
            ) : latestEnrollment?.status === 'rejected' ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                  <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Verification Rejected</span>
                </div>
                <p className="text-xs text-rose-700 leading-relaxed">
                  Your previous submission could not be verified. Please resubmit with a clear
                  transaction receipt.
                </p>
                <button
                  type="button"
                  onClick={onOpenEnrollModal}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                >
                  Resubmit Enrollment Form
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenEnrollModal}
                className="w-full py-3 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shadow-sm"
              >
                Enroll & Pay via QR
              </button>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Manual UTR & screenshot verification ensures secure, instant course activation once
                approved.
              </span>
            </div>
          </div>

          {/* Student Email Access Check */}
          <form
            onSubmit={handleVerifyEmailCheck}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
          >
            <label
              htmlFor="check-access-email"
              className="block text-xs font-semibold text-slate-700"
            >
              Already enrolled? Check access by Email ID
            </label>
            <div className="flex gap-2">
              <input
                id="check-access-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="vikram@atelierstudent.in"
                className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
              <button
                type="submit"
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Check
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
};
