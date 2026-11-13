# ACC Computer — Video Courses & Studio Playlists

A static React + TypeScript video course storefront and learning platform with UPI QR payment checkout, multi-lesson video playlists, an Admin Studio, and Google Sheets API v4 database sync.

## Features

- **Course Storefront & Playlists**: Course cards with cover imagery, pricing, lesson counts, category filters, and a full playlists directory.
- **Locked Video Lessons & UPI Checkout**: Course detail views display lesson thumbnails while locking video playback until enrollment payment is verified. Generates scannable UPI QR codes and deep links (`upi://pay?pa=computerbyahmad-1@okicici&pn=ACC%20Computer`).
- **Admin Studio**: Review enrollment submissions with receipt screenshot previews, approve/reject students, add/edit/delete courses and playlists, configure payment QR settings, and sync with Google Sheets.
- **Google Sheets Database**: Pre-linked to spreadsheet `1iaqrUhfT7R3VMFC0JoLLyPbFkPY2V-TIhOwXIskmaeQ` with `Courses`, `Lessons`, `Enrollments`, and `Settings` tabs.

## Local Development

```bash
npm install
npm run dev
```

Build the production static site into `dist/`:

```bash
npm run build
```

## Hosting Live on GitHub Pages

This project is preconfigured as a 100% static client-side bundle with relative asset paths (`base: './'` in `vite.config.ts`), a pre-built `docs/` folder, and an automated GitHub Actions workflow (`.github/workflows/deploy.yml`).

> **Why a white screen happens if you deploy from `main` / `/ (root)`:** GitHub Pages serves raw files directly when `/ (root)` is selected, and browsers cannot execute uncompiled `/src/main.tsx`. Always choose one of the two options below:

### Option A: Automated GitHub Actions (Recommended)

1. Push this repository to GitHub (`main` or `master` branch).
2. In your GitHub repository, open **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. GitHub Actions will build `dist/` and publish your site to `https://<your-username>.github.io/<your-repo>/`.

### Option B: Deploy Directly from Branch (`/docs` folder)

1. Push this repository (including the pre-built `docs/` folder) to GitHub.
2. In **Settings → Pages**, select **Deploy from a branch**.
3. Set Branch to **`main`** and Folder to **`/docs`**, then click **Save**.
4. Whenever you edit source code, run `npm run build:github` before pushing to refresh `docs/`.

### Enabling Google Sign-In on Your GitHub Pages Domain

If you use **Sign in with Google** inside **Admin → Google Sheets & Payment QR** from your live `github.io` URL:

1. Open [Firebase Console](https://console.firebase.google.com/) for project `gen-lang-client-0711840585`.
2. Go to **Authentication → Settings → Authorized domains**.
3. Click **Add domain** and enter `<your-username>.github.io` (or your custom domain).
