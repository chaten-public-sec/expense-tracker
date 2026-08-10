import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  Button,
  Slider,
  Space,
  Typography,
  Alert,
  Divider,
} from 'antd';
import {
  RotateLeftOutlined,
  RotateRightOutlined,
  ReloadOutlined,
  CheckOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ScissorOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface QRImageEditorModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onApply: (croppedBlob: Blob, previewUrl: string) => void;
}

export const QRImageEditorModal: React.FC<QRImageEditorModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onApply,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState<number>(280);

  // Responsive canvas size adjustment based on viewport
  useEffect(() => {
    const updateSize = () => {
      const screenWidth = window.innerWidth;
      if (screenWidth < 360) {
        setCanvasSize(240);
      } else if (screenWidth < 480) {
        setCanvasSize(270);
      } else {
        setCanvasSize(300);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Reset editor parameters
  const handleReset = useCallback(() => {
    setZoom(1.0);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setErrorMessage(null);
  }, []);

  // Load image when imageSrc changes
  useEffect(() => {
    if (!isOpen || !imageSrc) {
      loadedImageRef.current = null;
      return;
    }

    handleReset();
    setErrorMessage(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImageRef.current = img;
      renderCanvas();
    };
    img.onerror = () => {
      setErrorMessage('Unable to load image. Please choose a valid image file.');
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc, handleReset]);

  // Render canvas frame
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvasSize;
    const height = canvasSize;
    canvas.width = width;
    canvas.height = height;

    // Clear background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.save();

    // Move to center + pan offset
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y);

    // Rotate
    ctx.rotate((rotation * Math.PI) / 180);

    // Scale
    const imgAspect = img.width / img.height;
    let drawWidth = width;
    let drawHeight = height;

    if (imgAspect > 1) {
      drawWidth = height * imgAspect;
      drawHeight = height;
    } else {
      drawWidth = width;
      drawHeight = width / imgAspect;
    }

    drawWidth *= zoom;
    drawHeight *= zoom;

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    ctx.restore();

    // Draw Crop Guide & Corner Markers
    const cropMargin = 12;
    const cropBoxSize = width - cropMargin * 2;
    const cropX = cropMargin;
    const cropY = cropMargin;

    // Semi-transparent mask over outside boundary
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, width, cropY);
    ctx.fillRect(0, cropY + cropBoxSize, width, cropY);
    ctx.fillRect(0, cropY, cropX, cropBoxSize);
    ctx.fillRect(cropX + cropBoxSize, cropY, cropX, cropBoxSize);

    // Crop box outline
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(cropX, cropY, cropBoxSize, cropBoxSize);
    ctx.setLineDash([]);

    // Corner accents
    const cornerLength = 16;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(cropX, cropY + cornerLength);
    ctx.lineTo(cropX, cropY);
    ctx.lineTo(cropX + cornerLength, cropY);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(cropX + cropBoxSize - cornerLength, cropY);
    ctx.lineTo(cropX + cropBoxSize, cropY);
    ctx.lineTo(cropX + cropBoxSize, cropY + cornerLength);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(cropX, cropY + cropBoxSize - cornerLength);
    ctx.lineTo(cropX, cropY + cropBoxSize);
    ctx.lineTo(cropX + cornerLength, cropY + cropBoxSize);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(cropX + cropBoxSize - cornerLength, cropY + cropBoxSize);
    ctx.lineTo(cropX + cropBoxSize, cropY + cropBoxSize);
    ctx.lineTo(cropX + cropBoxSize, cropY + cropBoxSize - cornerLength);
    ctx.stroke();
  }, [canvasSize, pan, rotation, zoom]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, zoom, rotation, pan]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = -e.deltaY * 0.0015;
    setZoom((prev) => Math.min(3.0, Math.max(1.0, Math.round((prev + zoomDelta) * 100) / 100)));
  };

  // Touch handlers for mobile / Capacitor
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      setTouchStartDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && touchStartDist) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const diff = dist - touchStartDist;
      const zoomDelta = diff * 0.005;
      setZoom((prev) => Math.min(3.0, Math.max(1.0, Math.round((prev + zoomDelta) * 100) / 100)));
      setTouchStartDist(dist);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchStartDist(null);
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleApply = () => {
    const img = loadedImageRef.current;
    if (!img) {
      setErrorMessage('No image available to process.');
      return;
    }

    try {
      setIsProcessing(true);

      const exportSize = 600;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = exportSize;
      exportCanvas.height = exportSize;
      const ctx = exportCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportSize, exportSize);

      const cropMargin = 12;
      const previewCropBox = canvasSize - cropMargin * 2;
      const scaleMultiplier = exportSize / previewCropBox;

      ctx.save();

      ctx.translate(
        exportSize / 2 + pan.x * scaleMultiplier,
        exportSize / 2 + pan.y * scaleMultiplier
      );

      ctx.rotate((rotation * Math.PI) / 180);

      const imgAspect = img.width / img.height;
      let drawWidth = canvasSize;
      let drawHeight = canvasSize;

      if (imgAspect > 1) {
        drawWidth = canvasSize * imgAspect;
        drawHeight = canvasSize;
      } else {
        drawWidth = canvasSize;
        drawHeight = canvasSize / imgAspect;
      }

      drawWidth *= zoom * scaleMultiplier;
      drawHeight *= zoom * scaleMultiplier;

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

      ctx.restore();

      exportCanvas.toBlob(
        (blob) => {
          setIsProcessing(false);
          if (blob) {
            const previewUrl = URL.createObjectURL(blob);
            onApply(blob, previewUrl);
            onClose();
          } else {
            setErrorMessage('Unable to export image. Please try again.');
          }
        },
        'image/jpeg',
        0.95
      );
    } catch (err: any) {
      console.error('QR Export Error:', err);
      setIsProcessing(false);
      setErrorMessage('Export failed. Please check image permissions.');
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={
        <Space align="center" size={8}>
          <ScissorOutlined style={{ color: '#1677ff', fontSize: 18 }} />
          <span style={{ fontWeight: 600, fontSize: 16 }}>Edit Payment QR Code</span>
        </Space>
      }
      footer={null}
      width={440}
      centered
      destroyOnClose
      style={{ maxWidth: 'calc(100vw - 16px)', margin: '8px auto' }}
      styles={{
        body: {
          padding: '8px 6px 4px',
          maxHeight: 'calc(88dvh - 65px)',
          overflowY: 'auto',
        },
      }}
    >
      {errorMessage && (
        <Alert
          message={errorMessage}
          type="error"
          showIcon
          closable
          onClose={() => setErrorMessage(null)}
          style={{ marginBottom: 12, borderRadius: 8 }}
        />
      )}

      {/* Canvas Viewport */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          borderRadius: 12,
          padding: '10px 8px 8px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            display: 'block',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            borderRadius: 6,
          }}
        />

        <Space size={4} style={{ marginTop: 8 }}>
          <InfoCircleOutlined style={{ fontSize: 11, color: '#64748b' }} />
          <Text
            style={{
              fontSize: 11,
              color: '#94a3b8',
              userSelect: 'none',
            }}
          >
            Drag to reposition • Scroll or pinch to zoom
          </Text>
        </Space>
      </div>

      {/* Editor Controls */}
      <div style={{ marginTop: 14 }}>
        {/* Zoom Slider Control */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <Text style={{ fontSize: 12, fontWeight: 500 }}>
              Zoom: {Math.round(zoom * 100)}%
            </Text>
            <Space size={4}>
              <Button
                size="small"
                icon={<ZoomOutOutlined />}
                disabled={zoom <= 1.0}
                onClick={() => setZoom((prev) => Math.max(1.0, Math.round((prev - 0.1) * 10) / 10))}
              />
              <Button
                size="small"
                icon={<ZoomInOutlined />}
                disabled={zoom >= 3.0}
                onClick={() => setZoom((prev) => Math.min(3.0, Math.round((prev + 0.1) * 10) / 10))}
              />
            </Space>
          </div>
          <Slider
            min={1.0}
            max={3.0}
            step={0.05}
            value={zoom}
            onChange={(val) => setZoom(val)}
            tooltip={{ formatter: (val) => `${Math.round((val || 1) * 100)}%` }}
            style={{ margin: '6px 0' }}
          />
        </div>

        {/* Symmetrical 3-Button Rotation & Reset Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          <Button icon={<RotateLeftOutlined />} onClick={handleRotateLeft} size="middle" style={{ fontSize: 12, padding: '0 4px' }}>
            Rotate Left
          </Button>
          <Button icon={<RotateRightOutlined />} onClick={handleRotateRight} size="middle" style={{ fontSize: 12, padding: '0 4px' }}>
            Rotate Right
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset} size="middle" style={{ fontSize: 12, padding: '0 4px' }}>
            Reset
          </Button>
        </div>

        {/* Guidance Alert */}
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined style={{ color: '#1677ff' }} />}
          message={
            <span style={{ fontSize: 11, color: '#1e293b' }}>
              Ensure the complete QR code and UPI details remain inside the frame for reliable payment scanning.
            </span>
          }
          style={{ borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}
        />
      </div>

      <Divider style={{ margin: '14px 0 12px' }} />

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={onClose} disabled={isProcessing} size="large" style={{ flex: '1 1 auto', maxWidth: 110 }}>
          Cancel
        </Button>
        <Button
          type="primary"
          icon={<CheckOutlined />}
          loading={isProcessing}
          onClick={handleApply}
          size="large"
          style={{ flex: '2 1 auto', maxWidth: 180 }}
        >
          Use This Image
        </Button>
      </div>
    </Modal>
  );
};
