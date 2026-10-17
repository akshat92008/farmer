import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  PhoneCall,
  FileCheck2,
  Volume2,
  SlidersHorizontal,
} from 'lucide-react';
import { CropCycle, FarmerProfile, NavTab } from '../types/amaura';
import { evaluateSchemeForFarmer, VERIFIED_SCHEMES } from '../data/knowledgeBase';

interface SchemesViewProps {
  profile: FarmerProfile;
  cropCycles: CropCycle[];
  onSaveProfile: (updated: FarmerProfile) => void;
  onSpeakText: (text: string) => void;
  onNavigateTab: (tab: NavTab) => void;
}

export const SchemesView: React.FC<SchemesViewProps> = ({
  profile,
  cropCycles,
  onSaveProfile,
  onSpeakText,
  onNavigateTab,
}) => {
  const isHi = profile.preferredLanguage === 'hi';

  const evaluatedSchemes = VERIFIED_SCHEMES.map((scheme) =>
    evaluateSchemeForFarmer(scheme, profile, cropCycles)
  );

  const getStatusBadge = (status: 'LIKELY_MET' | 'NEEDS_VERIFICATION' | 'NOT_MET') => {
    if (status === 'LIKELY_MET') {
      return {
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />,
        labelHi: 'संभवतः पात्र (सभी शर्तें पूरी)',
        labelEn: 'Likely Eligible',
        cls: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      };
    }
    if (status === 'NOT_MET') {
      return {
        icon: <XCircle className="w-4 h-4 text-red-700 shrink-0" />,
        labelHi: 'शर्त पूरी नहीं (अपात्र)',
        labelEn: 'Not Eligible',
        cls: 'bg-red-100 text-red-900 border-red-300',
      };
    }
    return {
      icon: <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />,
      labelHi: 'दस्तावेज़ / शर्त सत्यापन आवश्यक',
      labelEn: 'Verification Needed',
      cls: 'bg-amber-100 text-amber-900 border-amber-300',
    };
  };

  return (
    <div className="space-y-6">
      {/* Interactive Profile Criteria Bar (Fixes Audit Point #17) */}
      <div className="bg-white rounded-2xl border border-[#DCE3DC] p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1E4D2B] flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#2E6F40]" />
              <span>
                {isHi
                  ? 'बहु-शर्त सरकारी योजना पात्रता इंजन (7 प्रमुख योजनाएँ)'
                  : 'Multi-Condition Government Scheme Eligibility Engine'}
              </span>
            </h2>
            <p className="text-xs text-[#526556]">
              {isHi
                ? 'नीचे अपनी प्रोफ़ाइल स्थिति बदलकर देखें कि प्रत्येक योजना की शर्तें तुरंत कैसे जाँची जाती हैं:'
                : 'Toggle your profile attributes below to test real-time multi-condition scheme evaluation:'}
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('farm')}
            className="text-xs font-bold text-[#2E6F40] hover:underline cursor-pointer"
          >
            {isHi ? 'पूरी प्रोफ़ाइल संपादित करें →' : 'Edit Full Profile →'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="p-2.5 rounded-xl bg-[#F4F8F5] border border-[#CFE0D2]">
            <span className="text-[#526556] block">
              {isHi ? 'कृषि भूमि (एकड़):' : 'Land Size (Acres):'}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              {[0, 2.0, 6.5].map((acres) => (
                <button
                  key={acres}
                  onClick={() => onSaveProfile({ ...profile, landSizeAcres: acres })}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                    profile.landSizeAcres === acres
                      ? 'bg-[#1E4D2B] text-white'
                      : 'bg-white border border-gray-300 text-gray-700'
                  }`}
                >
                  {acres} ac
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() =>
              onSaveProfile({ ...profile, hasAadhaarEkyc: !profile.hasAadhaarEkyc })
            }
            className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
              profile.hasAadhaarEkyc
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}
          >
            <span className="font-bold block">
              {isHi ? 'आधार e-KYC व DBT:' : 'Aadhaar e-KYC:'}
            </span>
            <span className="text-[11px]">
              {profile.hasAadhaarEkyc
                ? isHi
                  ? '✅ पूर्ण (सत्यापित)'
                  : '✅ Active'
                : isHi
                ? '⚠️ अपूर्ण (क्लिक कर बदलें)'
                : '⚠️ Incomplete'}
            </span>
          </button>

          <button
            onClick={() =>
              onSaveProfile({ ...profile, isIncomeTaxPayer: !profile.isIncomeTaxPayer })
            }
            className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
              !profile.isIncomeTaxPayer
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-red-50 border-red-300 text-red-950'
            }`}
          >
            <span className="font-bold block">
              {isHi ? 'आयकर दाता (Income Tax):' : 'Income Tax Payer:'}
            </span>
            <span className="text-[11px]">
              {profile.isIncomeTaxPayer
                ? isHi
                  ? '❌ हाँ (PM-KISAN अपात्र)'
                  : '❌ Yes (Excluded)'
                : isHi
                ? '✅ नहीं (पात्र श्रेणी)'
                : '✅ No (Eligible)'}
            </span>
          </button>

          <button
            onClick={() =>
              onSaveProfile({
                ...profile,
                irrigationType:
                  profile.irrigationType === 'वर्षा आधारित (Rainfed)'
                    ? 'ट्यूबवेल / बोरवेल (नलकूप)'
                    : 'वर्षा आधारित (Rainfed)',
              })
            }
            className="p-2.5 rounded-xl bg-[#F4F8F5] border border-[#CFE0D2] text-left cursor-pointer"
          >
            <span className="font-bold text-[#1E4D2B] block">
              {isHi ? 'सिंचाई जल स्रोत:' : 'Irrigation Source:'}
            </span>
            <span className="text-[11px] text-[#37473B]">{profile.irrigationType}</span>
          </button>
        </div>
      </div>

      {/* Evaluated Schemes List */}
      <div className="space-y-4">
        {evaluatedSchemes.map(({ scheme, criteriaResults, overallStatus, overallSummaryHi, officialDisclaimerHi }) => {
          const badge = getStatusBadge(overallStatus);
          return (
            <div
              key={scheme.id}
              className="bg-white rounded-2xl border border-[#DCE3DC] p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg border ${badge.cls}`}
                    >
                      {badge.icon}
                      <span>{isHi ? badge.labelHi : badge.labelEn}</span>
                    </span>
                    <span className="text-xs font-semibold text-[#526556]">
                      {scheme.departmentHi}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#1C281E] mt-2">
                    {isHi ? scheme.nameHi : scheme.nameEn}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#2E6F40] font-semibold mt-0.5">
                    {isHi ? scheme.benefitSummaryHi : scheme.benefitSummaryEn}
                  </p>
                </div>

                <button
                  onClick={() =>
                    onSpeakText(
                      `${scheme.nameHi}. ${scheme.benefitSummaryHi}. आपकी स्थिति: ${overallSummaryHi}`
                    )
                  }
                  className="p-2 rounded-xl bg-[#E8F3EA] hover:bg-[#D1E7D5] text-[#1E4D2B] cursor-pointer"
                  title={isHi ? 'आवाज़ में सुनें' : 'Listen'}
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Multi-Criterion Evaluation Table */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#1E4D2B]">
                  {isHi
                    ? 'शर्त-दर-शर्त पात्रता मिलान (आपकी प्रोफ़ाइल के अनुसार):'
                    : 'Criterion-by-Criterion Evaluation:'}
                </p>
                {criteriaResults.map((crit, idx) => {
                  const cBadge = getStatusBadge(crit.status);
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#F8FAF8] border border-[#DCE3DC] flex items-start gap-2.5 text-xs"
                    >
                      <div className="mt-0.5">{cBadge.icon}</div>
                      <div className="flex-1">
                        <p className="font-bold text-[#1C281E]">
                          {isHi ? crit.labelHi : crit.labelEn}
                        </p>
                        <p className="text-[#4A6350] mt-0.5">{crit.explanationHi}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Documents & Application Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#CFE0D2]">
                  <p className="font-bold text-[#1E4D2B] flex items-center gap-1.5 mb-1.5">
                    <FileCheck2 className="w-4 h-4 text-[#2E6F40]" />
                    <span>{isHi ? 'आवश्यक दस्तावेज़:' : 'Required Documents:'}</span>
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[#1C281E]">
                    {scheme.requiredDocumentsHi.map((doc, i) => (
                      <li key={i}>{doc}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-[#FAFDFB] border border-[#CFE0D2]">
                  <p className="font-bold text-[#1E4D2B] mb-1.5">
                    {isHi ? 'आवेदन प्रक्रिया:' : 'Application Steps:'}
                  </p>
                  <ul className="space-y-1 text-[#1C281E]">
                    {scheme.applicationStepsHi.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Honest Footer with Source Tier, Exclusions & Official Portal */}
              <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600">
                <div>
                  <span className="font-semibold text-gray-800">{scheme.sourceTier}</span> •{' '}
                  <span>{scheme.compilationNoteHi}</span>
                  <p className="text-gray-500 mt-0.5">{officialDisclaimerHi}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-gray-100 text-gray-800 font-semibold flex items-center gap-1">
                    <PhoneCall className="w-3 h-3" />
                    {scheme.helplineNumber}
                  </span>
                  <a
                    href={scheme.officialPortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#1E4D2B] hover:bg-[#2E6F40] text-white font-bold inline-flex items-center gap-1"
                  >
                    <span>{isHi ? 'आधिकारिक पोर्टल खोलें' : 'Official Portal'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
