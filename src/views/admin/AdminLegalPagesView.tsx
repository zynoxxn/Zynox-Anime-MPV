import React, { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../lib/auth';
import type { CmsLegalPages } from '../../types/cms';
import {
  getCmsLegalPages,
  saveCmsLegalPages,
  logAdminActivity,
} from '../../lib/firestore/cms';
import {
  FileText,
  Save,
  CheckCircle2,
  ShieldCheck,
  Eye,
  Loader2,
  Scale,
} from 'lucide-react';

interface AdminLegalPagesViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

type LegalPageKey = keyof CmsLegalPages;

interface LegalTabDef {
  key: LegalPageKey;
  label: string;
  description: string;
}

const LEGAL_TABS: LegalTabDef[] = [
  { key: 'dmca', label: 'DMCA Notice', description: 'Copyright takedown policy & designated agent contact' },
  { key: 'disclaimer', label: 'Disclaimer', description: 'Non-hosting disclaimer and third-party media disclosure' },
  { key: 'terms', label: 'Terms of Service', description: 'Rules of usage, service conditions, and platform rules' },
  { key: 'privacy', label: 'Privacy Policy', description: 'Data storage, cookies, and user account privacy practices' },
  { key: 'about', label: 'About Us', description: 'Brand story, platform mission, and features showcase' },
  { key: 'contact', label: 'Contact Us', description: 'Official support email, telegram, and community links' },
  { key: 'communityGuidelines', label: 'Community Guidelines', description: 'Comment etiquette, spoiler tags, and moderation rules' },
];

export const AdminLegalPagesView: React.FC<AdminLegalPagesViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [legalData, setLegalData] = useState<CmsLegalPages | null>(null);
  const [selectedKey, setSelectedKey] = useState<LegalPageKey>('dmca');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentText, setCurrentText] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getCmsLegalPages();
      setLegalData(data);
      setCurrentText(data[selectedKey] || '');
    } catch (err) {
      console.error('Failed to load legal pages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectKey = (key: LegalPageKey) => {
    // save current changes into local state before switching
    if (legalData) {
      setLegalData((prev) => (prev ? { ...prev, [selectedKey]: currentText } : prev));
    }
    setSelectedKey(key);
    if (legalData) {
      setCurrentText(legalData[key] || '');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalData) return;

    try {
      setSaving(true);
      const updated: CmsLegalPages = {
        ...legalData,
        [selectedKey]: currentText,
      };
      await saveCmsLegalPages(updated);
      setLegalData(updated);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        `Updated Legal Policy (${selectedKey})`,
        'LegalCMS',
        selectedKey,
        `Page: ${selectedKey}`
      );
      onShowMessage('Legal pages updated successfully in Firestore!');
    } catch (err: any) {
      onShowMessage(`Error saving legal pages: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const currentTabInfo = LEGAL_TABS.find((t) => t.key === selectedKey) || LEGAL_TABS[0];

  return (
    <AdminLayout currentTab="legal" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-6 rounded-3xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Scale className="w-4 h-4" />
              <span>Legal Policies & Compliance CMS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Legal Pages & Documentation Editor
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Edit DMCA, Terms of Service, Privacy Policy, Disclaimer, Contact & About pages without touching code.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-[#1683FF] hover:bg-[#1268cc] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#1683FF]/30 flex items-center gap-2 transition-all self-start sm:self-auto"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save All Legal Content</span>
          </button>
        </div>

        {loading || !legalData ? (
          <div className="py-20 text-center text-xs text-[#94A3B8]">Loading legal policies...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Tabs */}
            <div className="space-y-2">
              {LEGAL_TABS.map((tab) => {
                const isSelected = selectedKey === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleSelectKey(tab.key)}
                    className={`w-full text-left p-3.5 rounded-2xl transition-all border ${
                      isSelected
                        ? 'bg-[#1683FF]/15 border-[#1683FF]/40 text-white shadow-md'
                        : 'bg-[#0B1322] border-white/5 text-[#94A3B8] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-2">
                      <FileText className={`w-3.5 h-3.5 ${isSelected ? 'text-[#1683FF]' : 'text-[#64748B]'}`} />
                      <span>{tab.label}</span>
                    </div>
                    <p className="text-[10px] text-[#64748B] mt-1 line-clamp-1">{tab.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Markdown / Text Editor */}
            <div className="lg:col-span-3 bg-[#0B1322] border border-white/5 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">{currentTabInfo.label}</h3>
                  <p className="text-xs text-[#94A3B8]">{currentTabInfo.description}</p>
                </div>

                <span className="text-[10px] bg-white/5 text-[#94A3B8] px-2.5 py-1 rounded-lg font-mono">
                  Markdown Supported
                </span>
              </div>

              <textarea
                rows={20}
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                placeholder="Enter markdown or HTML content for this legal page..."
                className="w-full bg-[#050A14] border border-white/10 rounded-2xl p-4 text-xs text-white font-mono leading-relaxed outline-none focus:border-[#1683FF] resize-y"
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
