/**
 * Unified UPI Payment Abstraction for SplitWise.
 * Standardizes on Generic UPI Intent (`upi://pay`) and Android System Chooser.
 */

export interface UPIPaymentParams {
  upiId: string;
  name: string;
  amount?: number;
  note?: string;
}

/**
 * Detects if the app is currently running inside Capacitor Native App (Android / iOS).
 */
export const isCapacitorNative = (): boolean => {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  return !!(win.Capacitor && win.Capacitor.isNativePlatform && win.Capacitor.isNativePlatform());
};

/**
 * Detects if user is on a mobile device (Android/iOS browser or Capacitor).
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return isCapacitorNative() || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Builds a strictly encoded, standard generic UPI URI (`upi://pay`).
 * Uses exact NPCI parameters without arbitrary unescaped string concatenation.
 */
export const buildGenericUpiUri = ({ upiId, name, amount, note }: UPIPaymentParams): string => {
  if (!upiId || !upiId.trim()) {
    throw new Error('Valid payee UPI ID is required.');
  }

  const cleanUpi = upiId.trim();
  const cleanName = (name && name.trim()) || 'Flatmate';
  const cleanNote = (note && note.trim()) || `SplitWise - Payment to ${cleanName}`;

  const queryParts = [
    `pa=${encodeURIComponent(cleanUpi)}`,
    `pn=${encodeURIComponent(cleanName)}`,
    `cu=INR`,
    `tn=${encodeURIComponent(cleanNote)}`,
  ];

  if (amount !== undefined && amount > 0) {
    // Format to 2 decimal places as required by NPCI standard
    queryParts.push(`am=${amount.toFixed(2)}`);
  }

  return `upi://pay?${queryParts.join('&')}`;
};

/**
 * Launches generic UPI payment intent.
 * - On Capacitor Android: uses native intent chooser bridge.
 * - On Mobile Web: launches standard `upi://pay` deep link.
 * - On Desktop Web: invokes `onDesktopFallback` callback to show QR / Copy UPI modal.
 */
export const launchUpiPayment = async (
  params: UPIPaymentParams,
  onDesktopFallback?: () => void
): Promise<{ success: boolean; method: 'native' | 'web_redirect' | 'desktop_fallback' }> => {
  const uri = buildGenericUpiUri(params);

  // 1. Android Capacitor Native App
  if (isCapacitorNative()) {
    const win = window as any;
    if (win.Capacitor && win.Capacitor.Plugins && win.Capacitor.Plugins.UpiPayment) {
      try {
        await win.Capacitor.Plugins.UpiPayment.launchUpi({ uri });
        return { success: true, method: 'native' };
      } catch (nativeErr) {
        console.warn('[UPI Bridge] Native plugin call failed, falling back to location.href:', nativeErr);
        window.location.href = uri;
        return { success: true, method: 'web_redirect' };
      }
    } else {
      window.location.href = uri;
      return { success: true, method: 'web_redirect' };
    }
  }

  // 2. Mobile Browser
  if (isMobileDevice()) {
    window.location.href = uri;
    return { success: true, method: 'web_redirect' };
  }

  // 3. Desktop Browser Graceful Fallback
  if (onDesktopFallback) {
    onDesktopFallback();
  }
  return { success: false, method: 'desktop_fallback' };
};
