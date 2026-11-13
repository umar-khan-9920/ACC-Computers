import type {
  Course,
  EnrollmentRequest,
  PaymentSettings,
  VideoLesson,
} from '../types/academy';
import {
  COURSES_HEADER,
  courseToSheetRow,
  ENROLLMENTS_HEADER,
  enrollmentToSheetRow,
  LESSONS_HEADER,
  lessonToSheetRow,
  SETTINGS_HEADER,
  sheetRowToCourse,
  sheetRowToEnrollment,
  sheetRowToLesson,
} from '../utils/academyLogic';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export const REQUIRED_TABS = ['Courses', 'Lessons', 'Enrollments', 'Settings'] as const;

interface SheetMetadataResponse {
  spreadsheetId: string;
  properties?: { title?: string };
  sheets?: Array<{
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }>;
}

async function sheetsFetch<T>(
  url: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let detail = `Google Sheets API error (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error?.message) {
        detail = errBody.error.message;
      }
    } catch {
      // ignore json parse failure
    }
    throw new Error(detail);
  }

  return (await res.json()) as T;
}

export async function inspectSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<{ spreadsheetId: string; title: string; tabNames: string[] }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const data = await sheetsFetch<SheetMetadataResponse>(
    `${SHEETS_API_BASE}/${encodeURIComponent(cleanId)}?fields=spreadsheetId,properties.title,sheets.properties(sheetId,title)`,
    accessToken
  );

  const tabNames = (data.sheets || [])
    .map((s) => s.properties?.title || '')
    .filter(Boolean);

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Connected Spreadsheet',
    tabNames,
  };
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export async function ensureRequiredTabs(
  accessToken: string,
  spreadsheetId: string,
  existingTabs: string[]
): Promise<string[]> {
  const missing = REQUIRED_TABS.filter((tab) => !existingTabs.includes(tab));
  if (missing.length === 0) return existingTabs;

  await sheetsFetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: missing.map((title) => ({
          addSheet: {
            properties: { title },
          },
        })),
      }),
    }
  );

  return [...existingTabs, ...missing];
}

export async function createAcademySpreadsheet(
  accessToken: string,
  initialData: {
    courses: Course[];
    lessons: VideoLesson[];
    enrollments: EnrollmentRequest[];
    settings: PaymentSettings;
  }
): Promise<{ spreadsheetId: string; title: string; tabNames: string[] }> {
  const created = await sheetsFetch<SheetMetadataResponse>(SHEETS_API_BASE, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        title: `ACC Computer Database (${new Date().toISOString().slice(0, 10)})`,
      },
      sheets: REQUIRED_TABS.map((title) => ({ properties: { title } })),
    }),
  });

  const spreadsheetId = created.spreadsheetId;
  await pushAllDataToSheet(accessToken, spreadsheetId, initialData);

  return {
    spreadsheetId,
    title: created.properties?.title || 'ACC Computer Database',
    tabNames: [...REQUIRED_TABS],
  };
}

export async function fetchAcademyDataFromSheet(
  accessToken: string,
  rawSpreadsheetId: string
): Promise<{
  spreadsheetId: string;
  title: string;
  tabNames: string[];
  courses: Course[];
  lessons: VideoLesson[];
  enrollments: EnrollmentRequest[];
  settings: Partial<PaymentSettings>;
}> {
  const meta = await inspectSpreadsheetMetadata(accessToken, rawSpreadsheetId);
  const tabsToRead = REQUIRED_TABS.filter((tab) => meta.tabNames.includes(tab));

  if (tabsToRead.length === 0) {
    return {
      spreadsheetId: meta.spreadsheetId,
      title: meta.title,
      tabNames: meta.tabNames,
      courses: [],
      lessons: [],
      enrollments: [],
      settings: {},
    };
  }

  const rangesQuery = tabsToRead
    .map((tab) => `ranges=${encodeURIComponent(`'${tab}'!A1:O500`)}`)
    .join('&');

  const batchData = await sheetsFetch<{
    valueRanges?: Array<{ range: string; values?: string[][] }>;
  }>(
    `${SHEETS_API_BASE}/${encodeURIComponent(meta.spreadsheetId)}/values:batchGet?${rangesQuery}`,
    accessToken
  );

  const byTab = new Map<string, string[][]>();
  for (const vr of batchData.valueRanges || []) {
    const tabName = vr.range.split('!')[0].replace(/^'|'$/g, '');
    byTab.set(tabName, vr.values || []);
  }

  const courses = (byTab.get('Courses') || [])
    .map(sheetRowToCourse)
    .filter((c): c is Course => c !== null);

  const lessons = (byTab.get('Lessons') || [])
    .map(sheetRowToLesson)
    .filter((l): l is VideoLesson => l !== null);

  const enrollments = (byTab.get('Enrollments') || [])
    .map(sheetRowToEnrollment)
    .filter((e): e is EnrollmentRequest => e !== null);

  const settingsRows = byTab.get('Settings') || [];
  const settings: Partial<PaymentSettings> = {};
  for (const row of settingsRows) {
    if (!row[0] || row[0] === 'key') continue;
    if (row[0] === 'upiId') settings.upiId = row[1] || '';
    if (row[0] === 'payeeName') settings.payeeName = row[1] || '';
    if (row[0] === 'instructions') settings.instructions = row[1] || '';
    if (row[0] === 'customQrUrl') settings.customQrUrl = row[1] || '';
  }

  return {
    spreadsheetId: meta.spreadsheetId,
    title: meta.title,
    tabNames: meta.tabNames,
    courses,
    lessons,
    enrollments,
    settings,
  };
}

async function replaceTabValues(
  accessToken: string,
  spreadsheetId: string,
  tabName: string,
  rows: string[][]
): Promise<void> {
  const clearRange = `'${tabName}'!A1:Z1000`;
  await sheetsFetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(clearRange)}:clear`,
    accessToken,
    { method: 'POST', body: '{}' }
  );

  const updateRange = `'${tabName}'!A1`;
  await sheetsFetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(updateRange)}?valueInputOption=RAW`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({
        range: updateRange,
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );
}

export async function pushAllDataToSheet(
  accessToken: string,
  spreadsheetId: string,
  data: {
    courses: Course[];
    lessons: VideoLesson[];
    enrollments: EnrollmentRequest[];
    settings: PaymentSettings;
  }
): Promise<void> {
  const meta = await inspectSpreadsheetMetadata(accessToken, spreadsheetId);
  await ensureRequiredTabs(accessToken, meta.spreadsheetId, meta.tabNames);

  const courseRows = [COURSES_HEADER, ...data.courses.map(courseToSheetRow)];
  const lessonRows = [LESSONS_HEADER, ...data.lessons.map(lessonToSheetRow)];
  const enrollmentRows = [ENROLLMENTS_HEADER, ...data.enrollments.map(enrollmentToSheetRow)];
  const settingsRows = [
    SETTINGS_HEADER,
    ['upiId', data.settings.upiId],
    ['payeeName', data.settings.payeeName],
    ['instructions', data.settings.instructions],
    ['customQrUrl', data.settings.customQrUrl],
  ];

  await Promise.all([
    replaceTabValues(accessToken, meta.spreadsheetId, 'Courses', courseRows),
    replaceTabValues(accessToken, meta.spreadsheetId, 'Lessons', lessonRows),
    replaceTabValues(accessToken, meta.spreadsheetId, 'Enrollments', enrollmentRows),
    replaceTabValues(accessToken, meta.spreadsheetId, 'Settings', settingsRows),
  ]);
}

export async function syncCoursesAndLessonsToSheet(
  accessToken: string,
  spreadsheetId: string,
  courses: Course[],
  lessons: VideoLesson[]
): Promise<void> {
  await Promise.all([
    replaceTabValues(accessToken, spreadsheetId, 'Courses', [
      COURSES_HEADER,
      ...courses.map(courseToSheetRow),
    ]),
    replaceTabValues(accessToken, spreadsheetId, 'Lessons', [
      LESSONS_HEADER,
      ...lessons.map(lessonToSheetRow),
    ]),
  ]);
}

export async function syncEnrollmentsToSheet(
  accessToken: string,
  spreadsheetId: string,
  enrollments: EnrollmentRequest[]
): Promise<void> {
  await replaceTabValues(accessToken, spreadsheetId, 'Enrollments', [
    ENROLLMENTS_HEADER,
    ...enrollments.map(enrollmentToSheetRow),
  ]);
}

export async function syncSettingsToSheet(
  accessToken: string,
  spreadsheetId: string,
  settings: PaymentSettings
): Promise<void> {
  await replaceTabValues(accessToken, spreadsheetId, 'Settings', [
    SETTINGS_HEADER,
    ['upiId', settings.upiId],
    ['payeeName', settings.payeeName],
    ['instructions', settings.instructions],
    ['customQrUrl', settings.customQrUrl],
  ]);
}

/**
 * Resizes and compresses uploaded screenshot images so they fit well within
 * Google Sheets' 50,000-character cell limit while staying legible for verification.
 */
export async function compressPaymentScreenshot(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read uploaded image file.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Invalid image data.'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported or corrupted image file.'));
      img.onload = () => {
        const maxWidth = 420;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result.slice(0, 48000));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let compressed = canvas.toDataURL('image/jpeg', 0.68);
        if (compressed.length > 45000) {
          compressed = canvas.toDataURL('image/jpeg', 0.45);
        }
        resolve(compressed);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}
