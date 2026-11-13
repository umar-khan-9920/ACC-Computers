import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'] as const;

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of SHEETS_SCOPES) {
  provider.addScope(scope);
}

// Keep access token strictly in memory — never localStorage or sessionStorage.
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthFailure?.();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
};

export const signInWithGoogleSheets = async (): Promise<{
  user: User;
  accessToken: string;
}> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain Google Sheets access token.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    if (code === 'auth/unauthorized-domain') {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      throw new Error(
        `Domain "${host}" is not authorized for Google Sign-In yet. Add "${host}" in Firebase Console → Authentication → Settings → Authorized domains.`
      );
    }
    if (code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked by the browser. Allow popups for this site and try again.');
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedAccessToken = (): string | null => cachedAccessToken;

export const signOutGoogle = async (): Promise<void> => {
  await auth.signOut();
  cachedAccessToken = null;
};
