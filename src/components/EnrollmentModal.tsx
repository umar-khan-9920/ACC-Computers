import React, { useState } from 'react';
import { CheckCircle2, Lock, Upload, X } from 'lucide-react';
import type { Course, EnrollmentRequest, GenderOption, PaymentSettings } from '../types/academy';
import { formatCurrency, validateEnrollmentForm } from '../utils/academyLogic';
import { compressPaymentScreenshot } from '../services/googleSheetsDb';
import { QrCodeDisplay } from './QrCodeDisplay';
import { SafeImage } from './SafeImage';

interface EnrollmentModalProps {
  isOpen: boolean;
  course: Course | null;
  paymentSettings: PaymentSettings;
  defaultEmail?: string;
  onClose: () => void;
  onSubmitEnrollment: (request: EnrollmentRequest) => Promise<void> | void;
}

export const EnrollmentModal: React.FC<EnrollmentModalProps> = ({
  isOpen,
  course,
  paymentSettings,
  defaultEmail = '',
  onClose,
  onSubmitEnrollment,
}) => {
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState(defaultEmail);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<string>('Prefer not to say');
  const [address, setAddress] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotDataUrl, setScreenshotDataUrl] = useState('');
  const [screenshotName, setScreenshotName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !course) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.screenshotDataUrl;
      return next;
    });

    try {
      const compressed = await compressPaymentScreenshot(file);
      setScreenshotDataUrl(compressed);
      setScreenshotName(file.name);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to read screenshot image.';
      setErrors((prev) => ({ ...prev, screenshotDataUrl: message }));
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateEnrollmentForm({
      fullName,
      mobile,
      address,
      gender,
      age,
      email,
      transactionId,
      screenshotDataUrl,
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const newRequest: EnrollmentRequest = {
        id: `enr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        courseId: course.id,
        courseTitle: course.title,
        amount: course.price,
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        address: address.trim(),
        gender: gender as GenderOption,
        age: Number(age),
        email: email.trim(),
        transactionId: transactionId.trim(),
        screenshotDataUrl,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      };
      await onSubmitEnrollment(newRequest);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enrollment-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full my-8 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50">
          <div className="flex items-center gap-2.5 min-w-0">
            <Lock className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <h2
              id="enrollment-modal-title"
              className="text-lg font-display font-semibold text-slate-900 truncate"
            >
              Course Enrollment & Payment Verification
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close enrollment form"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Payment QR & Order Summary */}
          <div className="lg:col-span-5 bg-slate-50 p-6 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                  <SafeImage src={course.imageUrl} alt={course.title} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">{course.category}</p>
                  <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                    {course.title}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-sm font-medium text-slate-600">Course Fee</span>
                <span className="text-2xl font-display font-bold text-slate-900 tabular-nums">
                  {formatCurrency(course.price)}
                </span>
              </div>

              {/* Admin QR Payment Box */}
              <div className="mt-6 bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center text-center">
                <p className="text-xs font-semibold text-slate-700 mb-3">
                  Scan Admin QR to Pay
                </p>
                <QrCodeDisplay
                  upiId={paymentSettings.upiId}
                  payeeName={paymentSettings.payeeName}
                  amount={course.price}
                  customQrUrl={paymentSettings.customQrUrl}
                  size={168}
                />
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  {paymentSettings.payeeName}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-600 select-all">
                  {paymentSettings.upiId}
                </p>
                <a
                  href={`upi://pay?pa=${paymentSettings.upiId.trim()}&pn=${encodeURIComponent(
                    paymentSettings.payeeName.trim()
                  )}&am=${course.price}&cu=INR`}
                  className="mt-2.5 inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                >
                  Open in UPI App
                </a>
                <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                  {paymentSettings.instructions}
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-500 leading-relaxed">
              Your enrollment request is reviewed by an administrator after verifying your uploaded
              transaction receipt. Once approved, all video lessons unlock immediately.
            </div>
          </div>

          {/* Right Column: Student Details & Receipt Upload */}
          <div className="lg:col-span-7 p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="enroll-fullName"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Full Name *
                </label>
                <input
                  id="enroll-fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Aarav Mehta"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-rose-600">{errors.fullName}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="enroll-mobile"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Mobile Number *
                </label>
                <input
                  id="enroll-mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                />
                {errors.mobile && <p className="mt-1 text-xs text-rose-600">{errors.mobile}</p>}
              </div>

              <div>
                <label
                  htmlFor="enroll-email"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Email ID *
                </label>
                <input
                  id="enroll-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                />
                {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4">
                  <label
                    htmlFor="enroll-age"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Age *
                  </label>
                  <input
                    id="enroll-age"
                    type="number"
                    min={10}
                    max={110}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="24"
                    className="w-full px-2.5 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                  />
                  {errors.age && <p className="mt-1 text-xs text-rose-600">{errors.age}</p>}
                </div>

                <div className="col-span-8">
                  <label
                    htmlFor="enroll-gender"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Gender *
                  </label>
                  <select
                    id="enroll-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-2.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                  {errors.gender && <p className="mt-1 text-xs text-rose-600">{errors.gender}</p>}
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="enroll-address"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Full Address *
              </label>
              <textarea
                id="enroll-address"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House/Flat No, Street, City, State, PIN Code"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
              />
              {errors.address && <p className="mt-1 text-xs text-rose-600">{errors.address}</p>}
            </div>

            <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="enroll-transactionId"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Payment UTR / Transaction ID *
                </label>
                <input
                  id="enroll-transactionId"
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. UTR431908452219"
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                />
                {errors.transactionId && (
                  <p className="mt-1 text-xs text-rose-600">{errors.transactionId}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="enroll-screenshot"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Payment Screenshot *
                </label>
                <label
                  htmlFor="enroll-screenshot"
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {isCompressing
                      ? 'Optimizing...'
                      : screenshotName || 'Upload Receipt Image'}
                  </span>
                </label>
                <input
                  id="enroll-screenshot"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                {errors.screenshotDataUrl && (
                  <p className="mt-1 text-xs text-rose-600">{errors.screenshotDataUrl}</p>
                )}
              </div>
            </div>

            {screenshotDataUrl && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <img
                  src={screenshotDataUrl}
                  alt="Uploaded transaction receipt preview"
                  className="w-12 h-14 object-cover rounded border border-emerald-200 bg-white shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Screenshot attached for verification</span>
                  </div>
                  <p className="text-xs text-emerald-700 truncate mt-0.5">{screenshotName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setScreenshotDataUrl('');
                    setScreenshotName('');
                  }}
                  className="text-xs font-medium text-emerald-800 hover:underline shrink-0"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isCompressing}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {isSubmitting ? 'Submitting Verification...' : 'Submit Enrollment & Unlock'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
