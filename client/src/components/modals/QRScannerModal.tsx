import React, { useEffect, useState, useRef } from 'react';
import { Modal, Typography, Button, Space, Alert, Spin } from 'antd';
import {
  QrcodeOutlined,
  CloseOutlined,
  CameraOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';

const { Text } = Typography;

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (tokenOrCode: string) => void;
  onSwitchToCodeInput: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  onSwitchToCodeInput,
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);

  // Extract invite token or code from scanned text / URL
  const parseScannedData = (decodedText: string): string => {
    try {
      if (decodedText.includes('/join/')) {
        const parts = decodedText.split('/join/');
        if (parts[1]) {
          return parts[1].split('?')[0].split('#')[0].trim();
        }
      }
      return decodedText.trim();
    } catch {
      return decodedText.trim();
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setCameraError(null);
    setIsInitializing(true);
    isScanningRef.current = false;

    const qrElementId = 'splitwise-qr-camera-view';

    // Delay slightly to ensure DOM element is mounted
    const timer = setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(qrElementId);
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (isScanningRef.current) return;
            isScanningRef.current = true;

            const token = parseScannedData(decodedText);

            // Stop scanner & emit
            html5QrCode
              .stop()
              .then(() => {
                onScanSuccess(token);
                onClose();
              })
              .catch(() => {
                onScanSuccess(token);
                onClose();
              });
          },
          () => {
            // Frame error (ignore normal frame misses)
          }
        );

        setIsInitializing(false);
      } catch (err: any) {
        console.error('Camera Init Error:', err);
        setIsInitializing(false);
        setCameraError(
          err.message || 'Camera permission denied or camera unavailable. Please check your browser/app permissions.'
        );
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current
            .stop()
            .then(() => {
              html5QrCodeRef.current?.clear();
            })
            .catch(() => {
              html5QrCodeRef.current?.clear();
            });
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, [isOpen]);

  const handleManualCodeClick = () => {
    onClose();
    onSwitchToCodeInput();
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <Space align="center">
          <CameraOutlined style={{ color: '#2563eb' }} />
          <span>Scan Group QR Code</span>
        </Space>
      }
      footer={[
        <Button key="manual" icon={<EditOutlined />} onClick={handleManualCodeClick}>
          Enter Code Instead
        </Button>,
        <Button key="close" onClick={onClose}>
          Cancel
        </Button>,
      ]}
      width={400}
      centered
      style={{ maxWidth: '96vw' }}
      destroyOnClose
    >
      <div style={{ padding: '8px 0', textAlign: 'center' }}>
        {cameraError ? (
          <div>
            <Alert
              type="error"
              showIcon
              message="Camera Access Error"
              description={cameraError}
              style={{ borderRadius: 10, textAlign: 'left', marginBottom: 14, fontSize: 12 }}
            />
            <Button
              type="primary"
              block
              icon={<EditOutlined />}
              onClick={handleManualCodeClick}
              style={{ borderRadius: 10, height: 42, backgroundColor: '#2563eb' }}
            >
              Enter 6-Digit Code Manually
            </Button>
          </div>
        ) : (
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
              Align the SplitWise group QR code inside the frame to scan
            </Text>

            {isInitializing && (
              <div style={{ padding: '40px 0' }}>
                <Spin size="large" />
                <Text type="secondary" style={{ display: 'block', marginTop: 10, fontSize: 12 }}>
                  Initializing camera preview...
                </Text>
              </div>
            )}

            <div
              id="splitwise-qr-camera-view"
              style={{
                width: '100%',
                minHeight: 260,
                borderRadius: 14,
                overflow: 'hidden',
                background: '#0f172a',
                display: isInitializing ? 'none' : 'block',
              }}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
