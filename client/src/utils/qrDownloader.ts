/**
 * Canvas-based QR Image Downloader.
 * Generates an identified, downloadable QR copy with the owner's verified name in a clean footer.
 * Preserves 100% of the original QR pixels without drawing over or corrupting QR modules.
 */

interface QRDownloadParams {
  qrImageUrl: string;
  ownerName: string;
  upiId?: string;
  amount?: number;
}

export const downloadWatermarkedQR = async ({
  qrImageUrl,
  ownerName,
  upiId,
  amount,
}: QRDownloadParams): Promise<boolean> => {
  if (!qrImageUrl) return false;

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const qrWidth = img.naturalWidth || 600;
        const qrHeight = img.naturalHeight || 600;

        // Calculate proportional footer height
        const footerHeight = Math.max(80, Math.round(qrHeight * 0.16));
        const totalWidth = qrWidth;
        const totalHeight = qrHeight + footerHeight;

        const canvas = document.createElement('canvas');
        canvas.width = totalWidth;
        canvas.height = totalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }

        // 1. Fill entire canvas with clean white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, totalWidth, totalHeight);

        // 2. Draw original QR image untouched (0 to qrHeight)
        ctx.drawImage(img, 0, 0, qrWidth, qrHeight);

        // 3. Draw subtle footer border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = Math.max(1, Math.round(totalWidth * 0.002));
        ctx.beginPath();
        ctx.moveTo(0, qrHeight);
        ctx.lineTo(totalWidth, qrHeight);
        ctx.stroke();

        // 4. Fill footer background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, qrHeight + 1, totalWidth, footerHeight - 1);

        // 5. Draw Footer Text
        const fontSize = Math.max(14, Math.round(totalWidth * 0.034));
        const subFontSize = Math.max(11, Math.round(totalWidth * 0.024));

        // Left Label: SplitWise
        ctx.fillStyle = '#64748b';
        ctx.font = `500 ${subFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const leftPadding = Math.max(16, Math.round(totalWidth * 0.04));
        const centerY = qrHeight + footerHeight / 2;

        ctx.fillText('SplitWise Payment QR', leftPadding, centerY);

        // Right Label: Verified Owner Full Name
        const rightPadding = totalWidth - leftPadding;
        ctx.textAlign = 'right';

        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillText(ownerName, rightPadding, centerY - (upiId ? subFontSize * 0.6 : 0));

        if (upiId) {
          ctx.fillStyle = '#2563eb';
          ctx.font = `500 ${subFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillText(upiId, rightPadding, centerY + fontSize * 0.7);
        }

        // 6. Export as PNG and trigger download
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create image blob'));
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const cleanFileName = `${ownerName.replace(/[^a-zA-Z0-9]/g, '_')}_Payment_QR.png`;
          link.download = cleanFileName;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          resolve(true);
        }, 'image/png');
      } catch (err) {
        console.error('[QR Download Error]:', err);
        reject(err);
      }
    };

    img.onerror = (err) => {
      console.error('[QR Image Load Error]:', err);
      reject(new Error('Failed to load QR code image for watermarking'));
    };

    img.src = qrImageUrl;
  });
};
