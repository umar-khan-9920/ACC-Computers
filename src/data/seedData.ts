import type { Course, EnrollmentRequest, PaymentSettings, VideoLesson } from '../types/academy';

import heroBannerAsset from '../assets/images/hero_studio_academy_1794535951946.jpg';
import cinematographyAsset from '../assets/images/course_cinematography_1794535953971.jpg';
import uiArchitectureAsset from '../assets/images/course_ui_architecture_1794535953279.jpg';
import soundDesignAsset from '../assets/images/course_sound_design_1794535954444.jpg';
import fullstackSystemsAsset from '../assets/images/course_fullstack_systems_1794535954997.jpg';
import brandTypographyAsset from '../assets/images/course_brand_typography_1794535955318.jpg';

export const HERO_BANNER_IMAGE = heroBannerAsset;

export const COURSE_IMAGES = {
  cinematography: cinematographyAsset,
  uiArchitecture: uiArchitectureAsset,
  soundDesign: soundDesignAsset,
  fullstackSystems: fullstackSystemsAsset,
  brandTypography: brandTypographyAsset,
} as const;

const LEGACY_ASSET_MAP: Record<string, string> = {
  '/src/assets/images/hero_studio_academy_1794535951946.jpg': heroBannerAsset,
  '/src/assets/images/course_cinematography_1794535953971.jpg': cinematographyAsset,
  '/src/assets/images/course_ui_architecture_1794535953279.jpg': uiArchitectureAsset,
  '/src/assets/images/course_sound_design_1794535954444.jpg': soundDesignAsset,
  '/src/assets/images/course_fullstack_systems_1794535954997.jpg': fullstackSystemsAsset,
  '/src/assets/images/course_brand_typography_1794535955318.jpg': brandTypographyAsset,
};

export function resolveSeedImageUrl(url?: string): string | undefined {
  if (!url) return url;
  return LEGACY_ASSET_MAP[url] || url;
}

export const INITIAL_COURSES: Course[] = [
  {
    id: 'course-cinema-101',
    title: 'Narrative Cinematography & Lighting Ratios',
    category: 'Filmmaking',
    instructor: 'Rohan Kapoor',
    price: 2999,
    description:
      'Master cinema camera exposure, motivated tungsten key lighting, negative fill, and anamorphic framing across four structured studio modules.',
    imageUrl: COURSE_IMAGES.cinematography,
    level: 'Intermediate',
    createdAt: '2026-10-12T09:00:00.000Z',
  },
  {
    id: 'course-ui-arch-202',
    title: 'Architectural UI Systems & Spatial Grids',
    category: 'Product Design',
    instructor: 'Ananya Sen',
    price: 3499,
    description:
      'Build resilient, production-grade design systems grounded in Swiss grid geometry, strict typographic scale, and accessibility-first tokens.',
    imageUrl: COURSE_IMAGES.uiArchitecture,
    level: 'All Levels',
    createdAt: '2026-10-18T11:30:00.000Z',
  },
  {
    id: 'course-sound-303',
    title: 'Modular Synthesis & Spatial Sound Design',
    category: 'Audio Production',
    instructor: 'Kabir Verma',
    price: 2499,
    description:
      'Sculpt tactile textures, cinematic sub-bass beds, and dynamic foley beds using analog signal routing and precision studio monitoring.',
    imageUrl: COURSE_IMAGES.soundDesign,
    level: 'Intermediate',
    createdAt: '2026-10-25T14:15:00.000Z',
  },
  {
    id: 'course-systems-404',
    title: 'Distributed Full-Stack Cloud Architecture',
    category: 'Engineering',
    instructor: 'Siddharth Rao',
    price: 4299,
    description:
      'Design low-latency TypeScript APIs, idempotent webhook pipelines, and resilient browser-to-cloud state synchronization patterns.',
    imageUrl: COURSE_IMAGES.fullstackSystems,
    level: 'Advanced',
    createdAt: '2026-11-01T08:45:00.000Z',
  },
  {
    id: 'course-type-505',
    title: 'Editorial Brand Identity & Specimen Design',
    category: 'Typography',
    instructor: 'Meera Krishnan',
    price: 1999,
    description:
      'Craft authoritative publication systems, optical kerning pairs, modular page proportions, and print-to-web brand guidelines.',
    imageUrl: COURSE_IMAGES.brandTypography,
    level: 'Beginner',
    createdAt: '2026-11-05T16:20:00.000Z',
  },
];

export const INITIAL_LESSONS: VideoLesson[] = [
  // Cinema
  {
    id: 'les-c1-1',
    courseId: 'course-cinema-101',
    order: 1,
    title: '01. Exposure Latitude, False Color & Waveform Discipline',
    duration: '18:40',
    thumbnailUrl: COURSE_IMAGES.cinematography,
    videoUrl: '',
    summary: 'Calibrating middle gray on set using false color overlays and spot metering.',
  },
  {
    id: 'les-c1-2',
    courseId: 'course-cinema-101',
    order: 2,
    title: '02. Motivated Key Light & 4:1 Contrast Ratios',
    duration: '24:15',
    thumbnailUrl: HERO_BANNER_IMAGE,
    videoUrl: '',
    summary: 'Shaping facial depth with soft diffused key sources and controlled negative fill.',
  },
  {
    id: 'les-c1-3',
    courseId: 'course-cinema-101',
    order: 3,
    title: '03. Prime Lens Selection & Blocking for Single-Camera Drama',
    duration: '21:50',
    thumbnailUrl: COURSE_IMAGES.cinematography,
    videoUrl: '',
    summary: 'Matching focal lengths to emotional distance and camera movement choreography.',
  },
  {
    id: 'les-c1-4',
    courseId: 'course-cinema-101',
    order: 4,
    title: '04. Color Pipeline: Log-C to Print Emulation Grading',
    duration: '27:10',
    thumbnailUrl: HERO_BANNER_IMAGE,
    videoUrl: '',
    summary: 'Building clean node trees for skin-tone preservation and highlight roll-off.',
  },

  // UI Architecture
  {
    id: 'les-u2-1',
    courseId: 'course-ui-arch-202',
    order: 1,
    title: '01. Structural Grid Mathematics & Container Margins',
    duration: '16:20',
    thumbnailUrl: COURSE_IMAGES.uiArchitecture,
    videoUrl: '',
    summary: 'Establishing 1440px desktop baselines, optical rhythm, and nested border-radius math.',
  },
  {
    id: 'les-u2-2',
    courseId: 'course-ui-arch-202',
    order: 2,
    title: '02. Typographic Hierarchy & Tabular Data Legibility',
    duration: '19:45',
    thumbnailUrl: COURSE_IMAGES.brandTypography,
    videoUrl: '',
    summary: 'Pairing expressive display grotesques with disciplined tabular numeric alignment.',
  },
  {
    id: 'les-u2-3',
    courseId: 'course-ui-arch-202',
    order: 3,
    title: '03. Accessible Component Primitives & Keyboard Navigation',
    duration: '22:30',
    thumbnailUrl: COURSE_IMAGES.uiArchitecture,
    videoUrl: '',
    summary: 'Structuring semantic dialogs, focus traps, and high-contrast interactive states.',
  },
  {
    id: 'les-u2-4',
    courseId: 'course-ui-arch-202',
    order: 4,
    title: '04. Token Architecture & Multi-Surface Design Handoff',
    duration: '25:05',
    thumbnailUrl: COURSE_IMAGES.fullstackSystems,
    videoUrl: '',
    summary: 'Mapping CSS variables and Tailwind theme tokens to production component libraries.',
  },

  // Sound Design
  {
    id: 'les-s3-1',
    courseId: 'course-sound-303',
    order: 1,
    title: '01. Subtractive & West-Coast Signal Routing Foundations',
    duration: '15:10',
    thumbnailUrl: COURSE_IMAGES.soundDesign,
    videoUrl: '',
    summary: 'Patching oscillators, wavefolders, and low-pass gates for organic movement.',
  },
  {
    id: 'les-s3-2',
    courseId: 'course-sound-303',
    order: 2,
    title: '02. Foley Capture & Micro-Transient Layering',
    duration: '20:40',
    thumbnailUrl: HERO_BANNER_IMAGE,
    videoUrl: '',
    summary: 'Recording close-mic mechanical textures and aligning phase across transient layers.',
  },
  {
    id: 'les-s3-3',
    courseId: 'course-sound-303',
    order: 3,
    title: '03. Acoustic Calibration & Dynamic Stem Mastering',
    duration: '23:15',
    thumbnailUrl: COURSE_IMAGES.soundDesign,
    videoUrl: '',
    summary: 'Balancing cinema-grade headroom, LUFS loudness targets, and stereo imaging.',
  },

  // Fullstack Systems
  {
    id: 'les-f4-1',
    courseId: 'course-systems-404',
    order: 1,
    title: '01. Boundary Contracts & Type-Safe Domain Modeling',
    duration: '21:00',
    thumbnailUrl: COURSE_IMAGES.fullstackSystems,
    videoUrl: '',
    summary: 'Separating pure business rules from network transport and UI view state.',
  },
  {
    id: 'les-f4-2',
    courseId: 'course-systems-404',
    order: 2,
    title: '02. Spreadsheet & Document APIs as Live Operational Stores',
    duration: '26:30',
    thumbnailUrl: COURSE_IMAGES.uiArchitecture,
    videoUrl: '',
    summary: 'Designing schema headers, batch updates, and optimistic conflict resolution.',
  },
  {
    id: 'les-f4-3',
    courseId: 'course-systems-404',
    order: 3,
    title: '03. Idempotent Verification Flows & Audit Trails',
    duration: '24:20',
    thumbnailUrl: COURSE_IMAGES.fullstackSystems,
    videoUrl: '',
    summary: 'Implementing manual payment review queues with immutable timestamps.',
  },
  {
    id: 'les-f4-4',
    courseId: 'course-systems-404',
    order: 4,
    title: '04. Automated Browser & Logic Verification Pipelines',
    duration: '19:55',
    thumbnailUrl: COURSE_IMAGES.fullstackSystems,
    videoUrl: '',
    summary: 'Testing core invariants in Node alongside end-to-end Playwright journeys.',
  },

  // Brand Typography
  {
    id: 'les-t5-1',
    courseId: 'course-type-505',
    order: 1,
    title: '01. Type Classification, Contrast & Optical Sizing',
    duration: '14:30',
    thumbnailUrl: COURSE_IMAGES.brandTypography,
    videoUrl: '',
    summary: 'Selecting serif and neo-grotesque pairings that hold integrity across viewports.',
  },
  {
    id: 'les-t5-2',
    courseId: 'course-type-505',
    order: 2,
    title: '02. Editorial Grids, Baselines & White Space Economy',
    duration: '17:45',
    thumbnailUrl: COURSE_IMAGES.uiArchitecture,
    videoUrl: '',
    summary: 'Composing multi-column layouts where margins carry visual authority.',
  },
  {
    id: 'les-t5-3',
    courseId: 'course-type-505',
    order: 3,
    title: '03. Compiling the Brand Specimen & Production Kit',
    duration: '20:10',
    thumbnailUrl: COURSE_IMAGES.brandTypography,
    videoUrl: '',
    summary: 'Packaging reusable typographic scales and brand usage rules for clients.',
  },
];

// Deterministic tiny SVG receipt data URL for realistic seed preview in Admin Dashboard
const SEED_RECEIPT_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480">
      <rect width="360" height="480" fill="#F8FAFC"/>
      <rect x="24" y="24" width="312" height="432" rx="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
      <circle cx="180" cy="88" r="28" fill="#DCFCE7"/>
      <path d="M168 88l8 8 16-16" stroke="#059669" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="180" y="142" font-family="sans-serif" font-size="18" font-weight="700" fill="#0F172A" text-anchor="middle">UPI Payment Successful</text>
      <text x="180" y="182" font-family="monospace" font-size="28" font-weight="700" fill="#0F172A" text-anchor="middle">INR 2,999.00</text>
      <line x1="48" y1="214" x2="312" y2="214" stroke="#E2E8F0" stroke-dasharray="4 4"/>
      <text x="48" y="248" font-family="sans-serif" font-size="13" fill="#64748B">Paid to</text>
      <text x="312" y="248" font-family="sans-serif" font-size="13" font-weight="600" fill="#0F172A" text-anchor="end">ACC Computer</text>
      <text x="48" y="282" font-family="sans-serif" font-size="13" fill="#64748B">UPI ID</text>
      <text x="312" y="282" font-family="monospace" font-size="13" fill="#0F172A" text-anchor="end">computerbyahmad-1@okicici</text>
      <text x="48" y="316" font-family="sans-serif" font-size="13" fill="#64748B">UTR Ref</text>
      <text x="312" y="316" font-family="monospace" font-size="13" fill="#1D4ED8" text-anchor="end">431908452219</text>
      <text x="48" y="350" font-family="sans-serif" font-size="13" fill="#64748B">Status</text>
      <text x="312" y="350" font-family="sans-serif" font-size="13" font-weight="600" fill="#059669" text-anchor="end">Settled</text>
    </svg>`
  );

export const INITIAL_ENROLLMENTS: EnrollmentRequest[] = [
  {
    id: 'enr-seed-101',
    courseId: 'course-cinema-101',
    courseTitle: 'Narrative Cinematography & Lighting Ratios',
    amount: 2999,
    fullName: 'Vikramaditya Nair',
    mobile: '9845012345',
    address: '14 Lavelle Road, Shanthala Nagar, Bengaluru 560001',
    gender: 'Male',
    age: 27,
    email: 'vikram@atelierstudent.in',
    transactionId: 'UTR431908452219',
    screenshotDataUrl: SEED_RECEIPT_SVG,
    status: 'approved',
    submittedAt: '2026-11-10T10:15:00.000Z',
    reviewedAt: '2026-11-10T11:02:00.000Z',
  },
  {
    id: 'enr-seed-102',
    courseId: 'course-ui-arch-202',
    courseTitle: 'Architectural UI Systems & Spatial Grids',
    amount: 3499,
    fullName: 'Diya Deshmukh',
    mobile: '9820198765',
    address: '804 Seaface Residency, Worli, Mumbai 400018',
    gender: 'Female',
    age: 24,
    email: 'diya.deshmukh@example.com',
    transactionId: 'UTR901244781120',
    screenshotDataUrl: SEED_RECEIPT_SVG,
    status: 'pending',
    submittedAt: '2026-11-12T07:40:00.000Z',
  },
];

export const INITIAL_PAYMENT_SETTINGS: PaymentSettings = {
  upiId: 'computerbyahmad-1@okicici',
  payeeName: 'ACC Computer',
  instructions:
    'Scan the QR code with any UPI app (GPay, PhonePe, Paytm), pay the exact course fee to computerbyahmad-1@okicici, and upload your transaction screenshot below.',
  customQrUrl: '',
};
