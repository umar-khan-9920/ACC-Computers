import React, { useState } from 'react';
import { CheckCircle2, Clock, PlayCircle, Search, XCircle } from 'lucide-react';
import type { Course, EnrollmentRequest } from '../types/academy';
import { formatCurrency, normalizeEmail } from '../utils/academyLogic';

interface MyAccessViewProps {
  enrollments: EnrollmentRequest[];
  courses: Course[];
  activeStudentEmail: string;
  onChangeActiveEmail: (email: string) => void;
  onOpenCourse: (courseId: string) => void;
}

export const MyAccessView: React.FC<MyAccessViewProps> = ({
  enrollments,
  courses,
  activeStudentEmail,
  onChangeActiveEmail,
  onOpenCourse,
}) => {
  const [queryEmail, setQueryEmail] = useState(activeStudentEmail);

  const normalizedQuery = normalizeEmail(activeStudentEmail);
  const matching = normalizedQuery
    ? enrollments.filter((e) => normalizeEmail(e.email) === normalizedQuery)
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChangeActiveEmail(queryEmail.trim());
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-display font-bold text-slate-900">My Course Access</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter the email address used during enrollment to check payment verification status and
          open unlocked video playlists.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col sm:flex-row gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="email"
              value={queryEmail}
              onChange={(e) => setQueryEmail(e.target.value)}
              aria-label="Student email address"
              placeholder="Enter student email (e.g. vikram@atelierstudent.in)"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Check Access
          </button>
        </form>
      </div>

      {!normalizedQuery ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-slate-700">
            Enter your enrollment email above to view unlocked courses and pending requests.
          </p>
        </div>
      ) : matching.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-slate-700">
            No enrollment submissions found for <span className="font-mono">{activeStudentEmail}</span>.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Select any course from the catalog to submit your enrollment and payment screenshot.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matching.map((req) => {
            const courseExists = courses.some((c) => c.id === req.courseId);
            return (
              <div
                key={req.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono tabular-nums">UTR: {req.transactionId}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{formatCurrency(req.amount)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{new Date(req.submittedAt).toLocaleDateString()}</span>
                  </div>
                  <h2 className="text-lg font-display font-semibold text-slate-900 truncate">
                    {req.courseTitle}
                  </h2>
                  <p className="text-xs text-slate-600">
                    Student: {req.fullName} · {req.mobile}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {req.status === 'approved' ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        Approved
                      </span>
                      {courseExists && (
                        <button
                          type="button"
                          onClick={() => onOpenCourse(req.courseId)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <PlayCircle className="w-4 h-4" aria-hidden="true" />
                          Watch Videos
                        </button>
                      )}
                    </>
                  ) : req.status === 'pending' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                      <Clock className="w-4 h-4" aria-hidden="true" />
                      Pending Verification
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                      <XCircle className="w-4 h-4" aria-hidden="true" />
                      Rejected
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
