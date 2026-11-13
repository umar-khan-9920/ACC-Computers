import React from 'react';
import { ArrowRight, CheckCircle2, Clock, Lock, PlayCircle } from 'lucide-react';
import type { Course, EnrollmentStatus, VideoLesson } from '../types/academy';
import { formatCurrency, formatTotalDuration } from '../utils/academyLogic';
import { SafeImage } from './SafeImage';

interface CourseCardProps {
  course: Course;
  lessons: VideoLesson[];
  enrollmentStatus?: EnrollmentStatus;
  onSelectCourse: (courseId: string) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  lessons,
  enrollmentStatus,
  onSelectCourse,
}) => {
  const totalDuration = formatTotalDuration(lessons);
  const isUnlocked = enrollmentStatus === 'approved';
  const isPending = enrollmentStatus === 'pending';

  return (
    <article className="group bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={() => onSelectCourse(course.id)}
        aria-label={`Open course ${course.title}`}
        className="text-left flex flex-col flex-1 focus-visible:outline-2 focus-visible:outline-blue-700"
      >
        {/* 4:3 Image Frame */}
        <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
          <SafeImage
            src={course.imageUrl}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            fallbackLabel={course.title}
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
            <span className="text-xs font-medium tracking-wide">
              {lessons.length} Video {lessons.length === 1 ? 'Lesson' : 'Lessons'} · {totalDuration}
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums bg-slate-950/85 px-2.5 py-1 rounded-md">
              {formatCurrency(course.price)}
            </span>
          </div>
        </div>

        {/* Clean Unboxed Card Body */}
        <div className="p-5 flex-1 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>{course.category}</span>
              <span aria-hidden="true">·</span>
              <span>{course.level}</span>
            </div>
            <h3 className="mt-1.5 text-lg font-display font-semibold text-slate-900 leading-snug group-hover:text-blue-700 transition-colors">
              {course.title}
            </h3>
            <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">
              {course.description}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-500 truncate">
              By {course.instructor}
            </span>

            {isUnlocked ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap shrink-0">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                Unlocked
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap shrink-0">
                <Clock className="w-4 h-4" aria-hidden="true" />
                Pending Review
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 whitespace-nowrap shrink-0">
                <PlayCircle className="w-4 h-4" aria-hidden="true" />
                View Playlist
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Compact Lesson Playlist Preview Footer */}
      {lessons.length > 0 && (
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 min-w-0">
            {isUnlocked ? (
              <PlayCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">Next: {lessons[0].title}</span>
          </div>
          <span className="font-mono text-slate-500 tabular-nums shrink-0">
            {lessons[0].duration}
          </span>
        </div>
      )}
    </article>
  );
};
