import React from 'react';
import {
  Sprout,
  Volume2,
  VolumeX,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  ClipboardCheck,
  PhoneCall,
  Languages,
} from 'lucide-react';
import { AppLanguage, FarmerProfile, NavTab } from '../types/amaura';

interface NavbarProps {
  profile: FarmerProfile;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onToggleLanguage: () => void;
  onToggleVoice: () => void;
  onOpenConsentModal: () => void;
  onOpenKvkAdminModal: () => void;
  kvkQueueCount: number;
  remainingAiQuota: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  activeTab,
  setActiveTab,
  onToggleLanguage,
  onToggleVoice,
  onOpenConsentModal,
  onOpenKvkAdminModal,
  kvkQueueCount,
  remainingAiQuota,
}) => {
  const isHi = profile.preferredLanguage === 'hi';

  const navItems: { id: NavTab; labelHi: string; labelEn: string }[] = [
    { id: 'home', labelHi: 'होम व आवाज़', labelEn: 'Home & Voice' },
    { id: 'advice', labelHi: 'फसल डॉक्टर', labelEn: 'Crop Doctor' },
    { id: 'farm', labelHi: 'मेरी खेती', labelEn: 'My Farm' },
    { id: 'accounts', labelHi: 'हिसाब व मंडी', labelEn: 'Accounts & Mandi' },
    { id: 'schemes', labelHi: 'योजनाएँ (7)', labelEn: 'Schemes (7)' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#1E4D2B] text-white shadow-md border-b border-[#2E6F40]">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        {/* Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#E8F3EA] text-[#1E4D2B] flex items-center justify-center font-bold shadow-sm">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight leading-none">
                {isHi ? 'अमौरा किसान साथी' : 'Amaura Farmer'}
              </span>
              <span className="text-[11px] bg-[#D97706] text-white px-2 py-0.5 rounded font-medium">
                {isHi ? 'पारदर्शी संस्करण' : 'Verified Audit v2'}
              </span>
            </div>
            <p className="text-xs text-[#C6E2CC] mt-0.5">
              {profile.districtName
                ? `${profile.farmerName} • ${profile.districtName}, ${profile.stateName}`
                : isHi
                ? `${profile.farmerName} • जिला सेट करें (बिना लॉगिन उपयोगी)`
                : `${profile.farmerName} • Set District (No forced login)`}
            </p>
          </div>
        </div>

        {/* Right Controls: Helpline, Consent, Voice, Language, KVK Queue */}
        <div className="flex items-center flex-wrap gap-1.5">
          <a
            href="tel:18001801551"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2A643B] hover:bg-[#347A48] text-xs font-medium text-[#E8F3EA] transition"
            title="Kisan Call Center Toll-Free"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#FBBF24]" />
            <span>KCC: 1800-180-1551</span>
          </a>

          <button
            onClick={onOpenConsentModal}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              profile.consentGiven
                ? 'bg-[#2E6F40] text-white hover:bg-[#39844E]'
                : 'bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A]'
            }`}
            title={
              isHi
                ? 'AI डेटा सहमति और गोपनीयता सेटिंग्स'
                : 'AI Data Consent & Privacy Settings'
            }
          >
            {profile.consentGiven ? (
              <ShieldCheck className="w-3.5 h-3.5 text-[#86EFAC]" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-[#D97706]" />
            )}
            <span>
              {profile.consentGiven
                ? isHi
                  ? `AI सहमति: चालू (${remainingAiQuota}/15)`
                  : `AI Consent: ON (${remainingAiQuota}/15)`
                : isHi
                ? 'AI सहमति: ऑफ़लाइन मोड'
                : 'AI Consent: Offline Mode'}
            </span>
          </button>

          <button
            onClick={onToggleVoice}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2A643B] hover:bg-[#347A48] text-xs font-medium transition cursor-pointer"
            title={isHi ? 'आवाज़ में उत्तर सुनें' : 'Toggle Spoken Audio'}
          >
            {profile.voiceEnabled ? (
              <Volume2 className="w-4 h-4 text-[#86EFAC]" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-300" />
            )}
            <span className="hidden md:inline">
              {profile.voiceEnabled
                ? isHi
                  ? 'आवाज़ चालू'
                  : 'Voice ON'
                : isHi
                ? 'आवाज़ बंद'
                : 'Voice OFF'}
            </span>
          </button>

          <button
            onClick={onToggleLanguage}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold transition cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{isHi ? 'English' : 'हिन्दी'}</span>
          </button>

          <button
            onClick={onOpenKvkAdminModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#1C281E] text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>{isHi ? `KVK/ऑडिट (${kvkQueueCount})` : `KVK/Audit (${kvkQueueCount})`}</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Bar */}
      <nav className="bg-[#163A20] border-t border-white/10">
        <div className="max-w-6xl mx-auto px-2 flex items-center justify-between sm:justify-start sm:gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition cursor-pointer ${
                  active
                    ? 'border-[#FBBF24] text-[#FBBF24] bg-white/5'
                    : 'border-transparent text-[#D1E7D5] hover:text-white hover:bg-white/5'
                }`}
              >
                {isHi ? item.labelHi : item.labelEn}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
