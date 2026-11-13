import React from 'react';
import { CheckCircle2, Lock, Play, PlayCircle } from 'lucide-react';
import type { Course, EnrollmentRequest, VideoLesson } from '../types/academy';
import {
  formatCurrency,
  formatTotalDuration,
  isCourseUnlockedForStudent,
} from '../utils/academyLogic';
import { SafeImage } from './SafeImage';

interface PlaylistOverviewViewProps {
  courses: Course[];
  lessons: VideoLesson[];
  enrollments: EnrollmentRequest[];
  activeStudentEmail: string;
  onSelectCourse: (courseId: string) => void;
  onEnrollCourse: (course: Course) => void;
}

export const PlaylistOverviewView: React.FC<PlaylistOverviewViewProps> = ({
  courses,
  lessons,
  enrollments,
  activeStudentEmail,
  onSelectCourse,
  onEnrollCourse,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-display font-bold text-slate-900 [text-wrap:balance]">
          Course Video Playlists
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
          Inspect the full curriculum playlist for every course. Video lessons unlock immediately
          after your payment screenshot is verified.
        </p>
      </div>

      <div className="space-y-8">
        {courses.map((course) => {
          const courseLessons = lessons
            .filter((l) => l.courseId === course.id)
            .sort((a, b) => a.order - b.order);
          const unlocked = isCourseUnlockedForStudent(enrollments, course.id, activeStudentEmail);

          return (
            <section
              key={course.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/70">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-20 h-16 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                    <SafeImage src={course.imageUrl} alt={course.title} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{course.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{courseLessons.length} Lessons</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatTotalDuration(courseLessons)}</span>
                    </div>
                    <h2 className="mt-1 text-xl font-display font-semibold text-slate-900 truncate">
                      {course.title}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                    {formatCurrency(course.price)}
                  </span>
                  {unlocked ? (
                    <button
                      type="button"
                      onClick={() => onSelectCourse(course.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      Watch Unlocked Playlist
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectCourse(course.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <PlayCircle className="w-4 h-4" aria-hidden="true" />
                      Open Course
                    </button>
                  )}
                </div>
              </div>

              {/* Horizontal / Grid Lesson Playlist Thumbnails */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {courseLessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => (unlocked ? onSelectCourse(course.id) : onEnrollCourse(course))}
                    className="group text-left bg-slate-50 border border-slate-200 rounded-lg overflow-hidden hover:border-slate-300 transition-colors"
                  >
                    <div className="relative aspect-video bg-slate-200 overflow-hidden">
                      <SafeImage
                        src={lesson.thumbnailUrl || course.imageUrl}
                        alt={lesson.title}
                        className={`w-full h-full object-cover ${unlocked ? '' : 'brightness-75'}`}
                      />
                      <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center">
                        {unlocked ? (
                          <span className="w-9 h-9 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow">
                            <Play className="w-4 h-4 ml-0.5" aria-hidden="true" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-950/85 text-white text-[11px] font-medium">
                            <Lock className="w-3 h-3" aria-hidden="true" />
                            Locked
                          </span>
                        )}
                      </div>
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-950/85 text-white font-mono text-[11px] tabular-nums">
                        {lesson.duration}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-slate-900 line-clamp-2 group-hover:text-blue-700 transition-colors">
                        {lesson.title}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
