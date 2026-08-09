/**
 * Helper utilities for standard Deep Link UPI Payments (upi://pay).
 */

export interface UPIPaymentParams {
  upiId: string;
  name: string;
  amount: number;
  note?: string;
}

/**
 * Generates standard upi://pay URI scheme format compatible with GPay, PhonePe, Paytm, BHIM, Cred, etc.
 */
export const generateUPIDeepLink = ({
  upiId,
  name,
  amount,
  note = 'SplitWise Dues Payment',
}: UPIPaymentParams): string => {
  const cleanUpi = upiId.trim();
  const encodedName = encodeURIComponent(name.trim());
  const encodedNote = encodeURIComponent(note.trim());
  const formattedAmount = amount.toFixed(2);

  return `upi://pay?pa=${cleanUpi}&pn=${encodedName}&am=${formattedAmount}&cu=INR&tn=${encodedNote}`;
};

/**
 * Detects if user is running on a mobile browser or mobile webview.
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Launches the native mobile OS UPI app picker or triggers fallback callback on desktop.
 */
export const launchUPIPayment = (
  params: UPIPaymentParams,
  onDesktopFallback?: () => void
): boolean => {
  if (!params.upiId) return false;

  const upiUri = generateUPIDeepLink(params);

  if (isMobileDevice()) {
    window.location.href = upiUri;
    return true;
  } else {
    // Attempt window open or invoke fallback
    window.open(upiUri, '_self');
    if (onDesktopFallback) {
      onDesktopFallback();
    }
    return false;
  }
};
