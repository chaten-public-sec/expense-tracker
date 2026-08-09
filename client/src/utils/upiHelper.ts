/**
 * Helper utilities for Deep Link UPI Payments supporting iPhone iOS, Android, and Capacitor Native Apps.
 * NPCI Compliant: Omits strict `am=` parameter from web deep links to prevent NPCI 2K limit blocks & WhatsApp dual redirects.
 */

export interface UPIPaymentParams {
  upiId: string;
  name: string;
  amount?: number;
  note?: string;
}

export type UPIAppType = 'gpay' | 'phonepe' | 'paytm' | 'mobikwik' | 'bhim' | 'cred' | 'generic';

export interface UPIAppConfig {
  id: UPIAppType;
  name: string;
  color: string;
  badgeBg: string;
  scheme: (params: UPIPaymentParams) => string;
}

/**
 * Detects if user is running inside a Capacitor Native App container (Android / iOS).
 */
export const isCapacitorNative = (): boolean => {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  return !!(win.Capacitor && win.Capacitor.isNativePlatform && win.Capacitor.isNativePlatform());
};

/**
 * Detects if user is running on an iOS device (iPhone / iPad).
 */
export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

/**
 * Detects if user is running on a mobile browser or mobile device.
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return isCapacitorNative() || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Generates NPCI-compliant clean VPA query string.
 * Omits `am` (amount) from URI to prevent NPCI bank 2k limit blocks & WhatsApp dual-redirects on iOS/Android.
 */
const buildCleanQuery = ({ upiId, name, note = 'SplitWise Payment' }: UPIPaymentParams): string => {
  const cleanUpi = upiId.trim();
  const encodedName = encodeURIComponent(name.trim());
  const encodedNote = encodeURIComponent(note.trim());
  return `pa=${cleanUpi}&pn=${encodedName}&cu=INR&tn=${encodedNote}`;
};

/**
 * Configured list of UPI apps with dedicated URI schemes for iOS & Android
 */
export const UPI_APPS: UPIAppConfig[] = [
  {
    id: 'gpay',
    name: 'Google Pay',
    color: '#1a73e8',
    badgeBg: '#e8f0fe',
    scheme: (params) => {
      const q = buildCleanQuery(params);
      return isIOSDevice() ? `gpay://upi/pay?${q}` : `gpay://upi/pay?${q}`;
    },
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    color: '#5f259f',
    badgeBg: '#f3e8ff',
    scheme: (params) => `phonepe://pay?${buildCleanQuery(params)}`,
  },
  {
    id: 'paytm',
    name: 'Paytm',
    color: '#002e6e',
    badgeBg: '#e6f0ff',
    scheme: (params) => `paytmmp://pay?${buildCleanQuery(params)}`,
  },
  {
    id: 'mobikwik',
    name: 'MobiKwik Wallet',
    color: '#007aff',
    badgeBg: '#e5f2ff',
    scheme: (params) => `mobikwik://pay?${buildCleanQuery(params)}`,
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    color: '#00529b',
    badgeBg: '#e6f2ff',
    scheme: (params) => `bhim://pay?${buildCleanQuery(params)}`,
  },
  {
    id: 'cred',
    name: 'Cred Pay',
    color: '#111111',
    badgeBg: '#f1f5f9',
    scheme: (params) => `cred://pay?${buildCleanQuery(params)}`,
  },
  {
    id: 'generic',
    name: 'Any Installed UPI App',
    color: '#1677ff',
    badgeBg: '#e6f4ff',
    scheme: (params) => `upi://pay?${buildCleanQuery(params)}`,
  },
];

/**
 * Launches payment via specific UPI app scheme or system launcher
 */
export const launchAppSpecificUPI = (
  appId: UPIAppType,
  params: UPIPaymentParams,
  onDesktopFallback?: () => void
): boolean => {
  if (!params.upiId) return false;

  const appConfig = UPI_APPS.find((a) => a.id === appId) || UPI_APPS[UPI_APPS.length - 1];
  const uri = appConfig.scheme(params);

  if (isMobileDevice()) {
    // Navigate via scheme URL directly
    window.location.href = uri;

    // Secondary fallback to generic upi://pay after a short timeout if specific scheme fails
    if (appId !== 'generic') {
      setTimeout(() => {
        const fallbackUri = `upi://pay?${buildCleanQuery(params)}`;
        window.location.href = fallbackUri;
      }, 1200);
    }
    return true;
  } else {
    window.open(uri, '_self');
    if (onDesktopFallback) {
      onDesktopFallback();
    }
    return false;
  }
};

/**
 * Legacy general launcher helper
 */
export const generateUPIDeepLink = (params: UPIPaymentParams): string => {
  return `upi://pay?${buildCleanQuery(params)}`;
};

export const launchUPIPayment = (
  params: UPIPaymentParams,
  onDesktopFallback?: () => void
): boolean => {
  return launchAppSpecificUPI('generic', params, onDesktopFallback);
};
