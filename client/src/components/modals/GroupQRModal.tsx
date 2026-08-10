import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Typography,
  Space,
  Tag,
  Spin,
  Popconfirm,
  Avatar,
  Flex,
} from 'antd';
import {
  QrcodeOutlined,
  CopyOutlined,
  CheckOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  ReloadOutlined,
  TeamOutlined,
  LinkOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import QRCode from 'qrcode';
import { useToast } from '../ui/Toast';
import api from '../../services/api';
import { downloadWatermarkedQR } from '../../utils/qrDownloader';

const { Title, Text } = Typography;

interface GroupQRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroupQRModal: React.FC<GroupQRModalProps> = ({ isOpen, onClose }) => {
  const { showSuccess, showError } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [shareData, setShareData] = useState<{
    groupId: string;
    groupName: string;
    inviteCode: string;
    inviteToken: string;
    memberCount: number;
    isCreator: boolean;
  } | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const fetchShareInfo = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/groups/share-info');
      setShareData(res.data);

      // Build join URL
      const host = typeof window !== 'undefined' ? window.location.origin : '';
      const token = res.data.inviteToken || res.data.inviteCode;
      const joinUrl = `${host}/join/${token}`;

      // Generate high-resolution crisp QR code
      const dataUrl = await QRCode.toDataURL(joinUrl, {
        width: 380,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setQrDataUrl(dataUrl);
    } catch (err: any) {
      console.error('Fetch Share Info Error:', err);
      showError('Failed to load group invite information');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchShareInfo();
      setCopiedCode(false);
      setCopiedLink(false);
    }
  }, [isOpen]);

  const copyInviteCode = () => {
    if (shareData?.inviteCode) {
      navigator.clipboard.writeText(shareData.inviteCode);
      setCopiedCode(true);
      showSuccess(`Invite code ${shareData.inviteCode} copied!`);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyInviteLink = () => {
    if (shareData) {
      const host = window.location.origin;
      const token = shareData.inviteToken || shareData.inviteCode;
      const joinUrl = `${host}/join/${token}`;
      navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      showSuccess('Group invite link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleDownloadQR = async () => {
    if (!qrDataUrl || !shareData) return;

    try {
      setIsDownloading(true);
      await downloadWatermarkedQR({
        qrImageUrl: qrDataUrl,
        ownerName: shareData.groupName,
        upiId: `Invite Code: ${shareData.inviteCode}`,
      });
      showSuccess('Group invite QR downloaded with verified footer!');
    } catch (err: any) {
      console.error('Download QR Error:', err);
      showError('Failed to download QR image');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!shareData) return;

    const host = window.location.origin;
    const token = shareData.inviteToken || shareData.inviteCode;
    const joinUrl = `${host}/join/${token}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${shareData.groupName} on SplitWise`,
          text: `Join our flatmate group "${shareData.groupName}" on SplitWise! Invite Code: ${shareData.inviteCode}`,
          url: joinUrl,
        });
      } catch (err) {
        // User dismissed share sheet
      }
    } else {
      copyInviteLink();
    }
  };

  const handleRegenerate = async () => {
    try {
      setIsRegenerating(true);
      await api.post('/groups/regenerate-invite-token');
      showSuccess('New QR code and invite link generated!');
      fetchShareInfo();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Failed to regenerate invite token');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={400}
      centered
      style={{ maxWidth: '96vw' }}
      styles={{
        body: {
          padding: '8px 4px',
        },
      }}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <Text type="secondary" style={{ display: 'block', marginTop: 14, fontSize: 13 }}>
            Generating Group QR...
          </Text>
        </div>
      ) : shareData ? (
        <Flex vertical align="center" gap={16} style={{ width: '100%' }}>
          {/* Header Identity */}
          <Flex vertical align="center" gap={6} style={{ textAlign: 'center', width: '100%' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                boxShadow: '0 2px 10px rgba(37, 99, 235, 0.12)',
              }}
            >
              <UsergroupAddOutlined />
            </div>

            <Title level={4} style={{ margin: '4px 0 0', fontSize: 18, color: '#0f172a', fontWeight: 700 }}>
              {shareData.groupName}
            </Title>

            <Tag
              color="blue"
              icon={<TeamOutlined />}
              style={{
                borderRadius: 20,
                padding: '2px 10px',
                fontSize: 12,
                fontWeight: 500,
                border: 'none',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
              }}
            >
              {shareData.memberCount} {shareData.memberCount === 1 ? 'member' : 'members'}
            </Tag>
          </Flex>

          {/* QR Code Presentation Card */}
          <div
            style={{
              width: '100%',
              maxWidth: 260,
              padding: 16,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 18,
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.07)',
              textAlign: 'center',
            }}
          >
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="Group Invite QR Code"
                style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  borderRadius: 10,
                  display: 'block',
                }}
              />
            )}
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 10, color: '#64748b' }}>
              Scan with phone camera or SplitWise app
            </Text>
          </div>

          {/* 6-Character Invite Code Strip */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
            }}
          >
            <div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Invite Code
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  letterSpacing: '2px',
                  color: '#2563eb',
                }}
              >
                {shareData.inviteCode}
              </Text>
            </div>

            <Button
              size="middle"
              icon={copiedCode ? <CheckOutlined style={{ color: '#16a34a' }} /> : <CopyOutlined />}
              onClick={copyInviteCode}
              style={{
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {copiedCode ? 'Copied' : 'Copy'}
            </Button>
          </div>

          {/* Action Buttons Grid */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <Button
                block
                size="large"
                icon={<DownloadOutlined />}
                loading={isDownloading}
                onClick={handleDownloadQR}
                style={{
                  height: 44,
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 13,
                  borderColor: '#cbd5e1',
                  color: '#334155',
                }}
              >
                Download QR
              </Button>

              <Button
                type="primary"
                block
                size="large"
                icon={<ShareAltOutlined />}
                onClick={handleShare}
                style={{
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: '#2563eb',
                  fontWeight: 700,
                  fontSize: 13,
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                }}
              >
                Share Invite
              </Button>
            </div>

            {/* Copy Invite Link */}
            <Button
              block
              icon={<LinkOutlined />}
              onClick={copyInviteLink}
              style={{
                height: 40,
                borderRadius: 10,
                fontSize: 12,
                color: '#475569',
                borderColor: '#e2e8f0',
              }}
            >
              {copiedLink ? 'Invite Link Copied to Clipboard!' : 'Copy Group Invite Link'}
            </Button>
          </div>

          {/* Creator Option: Regenerate QR */}
          {shareData.isCreator && (
            <Popconfirm
              title="Regenerate Group QR & Link?"
              description="Previous QR codes and invite links will be revoked."
              onConfirm={handleRegenerate}
              okText="Regenerate"
              cancelText="Cancel"
              okButtonProps={{ danger: true, loading: isRegenerating }}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<ReloadOutlined />}
                style={{ fontSize: 11, marginTop: -4 }}
              >
                Regenerate QR Code
              </Button>
            </Popconfirm>
          )}
        </Flex>
      ) : null}
    </Modal>
  );
};
