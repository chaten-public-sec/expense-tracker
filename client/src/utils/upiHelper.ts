/**
 * Helper utilities for Deep Link UPI Payments supporting iPhone iOS & Android
 * with dedicated app schemes (GPay, PhonePe, Paytm, MobiKwik, BHIM, Cred).
 */

export interface UPIPaymentParams {
  upiId: string;
  name: string;
  amount: number;
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
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Generates standard upi://pay URI query string params
 */
const buildQuery = ({ upiId, name, amount, note = 'SplitWise Dues' }: UPIPaymentParams): string => {
  const cleanUpi = upiId.trim();
  const encodedName = encodeURIComponent(name.trim());
  const encodedNote = encodeURIComponent(note.trim());
  const formattedAmount = amount.toFixed(2);
  return `pa=${cleanUpi}&pn=${encodedName}&am=${formattedAmount}&cu=INR&tn=${encodedNote}`;
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
      const q = buildQuery(params);
      return isIOSDevice() ? `tez://upi/pay?${q}` : `gpay://upi/pay?${q}`;
    },
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    color: '#5f259f',
    badgeBg: '#f3e8ff',
    scheme: (params) => `phonepe://pay?${buildQuery(params)}`,
  },
  {
    id: 'paytm',
    name: 'Paytm',
    color: '#002e6e',
    badgeBg: '#e6f0ff',
    scheme: (params) => `paytmmp://pay?${buildQuery(params)}`,
  },
  {
    id: 'mobikwik',
    name: 'MobiKwik Wallet',
    color: '#007aff',
    badgeBg: '#e5f2ff',
    scheme: (params) => `mobikwik://pay?${buildQuery(params)}`,
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    color: '#00529b',
    badgeBg: '#e6f2ff',
    scheme: (params) => `bhim://pay?${buildQuery(params)}`,
  },
  {
    id: 'cred',
    name: 'Cred Pay',
    color: '#111111',
    badgeBg: '#f1f5f9',
    scheme: (params) => `cred://pay?${buildQuery(params)}`,
  },
  {
    id: 'generic',
    name: 'Any UPI App',
    color: '#1677ff',
    badgeBg: '#e6f4ff',
    scheme: (params) => `upi://pay?${buildQuery(params)}`,
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
  let uri = appConfig.scheme(params);

  if (isMobileDevice()) {
    // Navigate via scheme URL directly
    window.location.href = uri;

    // Secondary fallback to generic upi://pay after a short timeout if specific scheme fails
    if (appId !== 'generic') {
      setTimeout(() => {
        const fallbackUri = `upi://pay?${buildQuery(params)}`;
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
  return `upi://pay?${buildQuery(params)}`;
};

export const launchUPIPayment = (
  params: UPIPaymentParams,
  onDesktopFallback?: () => void
): boolean => {
  return launchAppSpecificUPI('generic', params, onDesktopFallback);
};
