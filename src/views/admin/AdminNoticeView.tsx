import React, { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { AdminPopupNoticeEditor } from '../../components/admin/AdminPopupNoticeEditor';
import { SiteNoticeModal } from '../../components/SiteNoticeModal';
import type { SitePopupNotice } from '../../types/cms';
import { ArrowLeft } from 'lucide-react';

interface AdminNoticeViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminNoticeView: React.FC<AdminNoticeViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const [previewNotice, setPreviewNotice] = useState<SitePopupNotice | null>(null);

  return (
    <AdminLayout
      currentTab="notice"
      navigate={navigate}
      onShowMessage={onShowMessage}
    >
      <div className="space-y-6">
        {/* Header Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Site Notice
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          </div>
        </div>

        {/* The Notice Editor Component */}
        <AdminPopupNoticeEditor
          onShowMessage={onShowMessage}
          onPreviewModal={(n) => setPreviewNotice(n)}
        />

        {/* Live on-screen modal preview */}
        {previewNotice && (
          <SiteNoticeModal
            isOpen={!!previewNotice}
            onClose={() => setPreviewNotice(null)}
            notice={previewNotice}
            onNavigate={navigate}
          />
        )}
      </div>
    </AdminLayout>
  );
};
