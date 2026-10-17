import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileCheck,
  HelpCircle,
  Landmark,
  Phone,
  ShieldCheck,
  Trash2,
  Volume2,
} from 'lucide-react';
import { evaluateSchemeForFarmer, VERIFIED_SCHEMES } from '../data/knowledgeBase';
import {
  AssistantMessage,
  CropCase,
  CropCycle,
  FarmerProfile,
} from '../types/amaura';

interface Props {
  profile: FarmerProfile;
  cropCycles: CropCycle[];
  cropCases: CropCase[];
  messages: AssistantMessage[];
  aiQuotaRemaining: number | null;
  onSpeak: (text: string) => void;
  onNavigateToProfile: () => void;
  onToggleConsent: (consent: boolean) => void;
  onLoadSampleData: () => void;
  onDeleteAllUserData: () => void;
}

export const SchemesAndAuditView: React.FC<Props> = ({
  profile,
  cropCycles,
  cropCases,
  messages,
  aiQuotaRemaining,
  onSpeak,
  onNavigateToProfile,
  onToggleConsent,
  onLoadSampleData,
  onDeleteAllUserData,
}) => {
  const [subTab, setSubTab] = useState<'schemes' | 'trust'>('schemes');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletedBanner, setDeletedBanner] = useState(false);

  const evaluations = useMemo(
    () =>
      VERIFIED_SCHEMES.map((scheme) =>
        evaluateSchemeForFarmer(scheme, profile, cropCycles)
      ),
    [profile, cropCycles]
  );

  const flaggedMessages = useMemo(
    () => messages.filter((m) => m.flaggedHarmful),
    [messages]
  );

  const handleConfirmDeleteAll = () => {
    onDeleteAllUserData();
    setConfirmDeleteOpen(false);
    setDeletedBanner(true);
    setTimeout(() => setDeletedBanner(false), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        <button
          type="button"
          onClick={() => setSubTab('schemes')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
            subTab === 'schemes'
              ? 'bg-[#1B5E20] text-white shadow-sm'
              : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
          }`}
        >
          <Landmark className="h-4 w-4" />
          सरकारी योजना पात्रता जाँच ({VERIFIED_SCHEMES.length} योजनाएँ)
        </button>
        <button
          type="button"
          onClick={() => setSubTab('trust')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
            subTab === 'trust'
              ? 'bg-[#1B5E20] text-white shadow-sm'
              : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          डेटा गोपनीयता, सुरक्षा एवं पारदर्शिता केंद्र
        </button>
      </div>

      {subTab === 'schemes' ? (
        <div className="space-y-5">
          {/* Farmer Current Profile Snapshot Bar */}
          <div className="rounded-xl bg-white p-4 border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs space-y-1">
              <p className="font-bold text-stone-900">
                पात्रता मूल्यांकन में प्रयुक्त आपकी वर्तमान प्रोफ़ाइल:
              </p>
              <div className="flex flex-wrap gap-2 text-stone-700">
                <span className="rounded bg-stone-100 px-2 py-0.5 border border-stone-200">
                  भूमि: <strong>{profile.landSizeAcres} एकड़</strong>
                </span>
                <span className="rounded bg-stone-100 px-2 py-0.5 border border-stone-200">
                  आधार e-KYC: <strong>{profile.hasAadhaarEkyc ? 'हाँ (सक्रिय)' : 'सत्यापन बाकी'}</strong>
                </span>
                <span className="rounded bg-stone-100 px-2 py-0.5 border border-stone-200">
                  आयकर दाता: <strong>{profile.isIncomeTaxPayer ? 'हाँ' : 'नहीं'}</strong>
                </span>
                <span className="rounded bg-stone-100 px-2 py-0.5 border border-stone-200">
                  सिंचाई: <strong>{profile.irrigationType}</strong>
                </span>
                <span className="rounded bg-stone-100 px-2 py-0.5 border border-stone-200">
                  बोई गई फसलें: <strong>{cropCycles.length}</strong>
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onNavigateToProfile}
              className="rounded-lg bg-[#1B5E20] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#144718] cursor-pointer"
            >
              प्रोफ़ाइल विवरण बदलें
            </button>
          </div>

          {/* Schemes Cards */}
          <div className="space-y-4">
            {evaluations.map(({ scheme, criteriaResults, overallSummaryHi, officialDisclaimerHi }) => {
              const hasNotMet = criteriaResults.some((c) => c.status === 'NOT_MET');
              const allMet = criteriaResults.every((c) => c.status === 'LIKELY_MET');

              return (
                <div
                  key={scheme.id}
                  className="rounded-xl bg-white p-5 border border-stone-200 shadow-xs space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 pb-3">
                    <div>
                      <span className="text-[11px] font-bold text-[#1B5E20] uppercase">
                        {scheme.departmentHi} • {scheme.scope}
                      </span>
                      <h3 className="text-base font-bold text-stone-900 mt-0.5">
                        {scheme.nameHi}
                      </h3>
                      <p className="text-xs text-stone-500">{scheme.nameEn}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-2.5 py-1 text-xs font-bold border ${
                          hasNotMet
                            ? 'bg-red-50 text-red-900 border-red-200'
                            : allMet
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}
                      >
                        {overallSummaryHi}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onSpeak(
                            `${scheme.nameHi}। ${scheme.benefitSummaryHi}। आपकी स्थिति: ${overallSummaryHi}`
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-800 hover:bg-stone-200 cursor-pointer"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        सुनें
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-stone-800 leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-200">
                    <strong>लाभ सारांश:</strong> {scheme.benefitSummaryHi}
                  </p>

                  {/* Multi-condition evaluation checklist */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-stone-900">
                      शर्त-वार पात्रता मिलान (Multi-Condition Check):
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {criteriaResults.map((crit, idx) => (
                        <div
                          key={idx}
                          className={`rounded-lg p-3 border text-xs flex items-start gap-2.5 ${
                            crit.status === 'LIKELY_MET'
                              ? 'bg-emerald-50/60 border-emerald-200'
                              : crit.status === 'NOT_MET'
                              ? 'bg-red-50/70 border-red-200'
                              : 'bg-amber-50/60 border-amber-200'
                          }`}
                        >
                          {crit.status === 'LIKELY_MET' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                          ) : crit.status === 'NOT_MET' ? (
                            <AlertCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
                          ) : (
                            <HelpCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-bold text-stone-900">{crit.labelHi}</p>
                            <p className="text-stone-700 mt-0.5">{crit.explanationHi}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Documents & Application Steps */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
                    <div className="rounded-lg bg-stone-50 p-3 border border-stone-200">
                      <p className="font-bold text-stone-900 mb-1.5 flex items-center gap-1.5">
                        <FileCheck className="h-3.5 w-3.5 text-[#1B5E20]" />
                        आवश्यक दस्तावेज़:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-stone-700">
                        {scheme.requiredDocumentsHi.map((doc, i) => (
                          <li key={i}>{doc}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-lg bg-stone-50 p-3 border border-stone-200">
                      <p className="font-bold text-stone-900 mb-1.5">आवेदन की प्रक्रिया:</p>
                      <ul className="space-y-1 text-stone-700">
                        {scheme.applicationStepsHi.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-600 bg-amber-50/50 p-2.5 rounded border border-amber-200">
                    <strong>अपवाद (Exclusions):</strong> {scheme.exclusionsHi} |{' '}
                    <strong>समय-सीमा:</strong> {scheme.deadlineHi}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
                    <div className="text-[11px] text-stone-500">
                      <span>{scheme.sourceTier}</span> • <span>{scheme.lastVerifiedDate}</span>
                      <p className="text-[10px] text-stone-400 mt-0.5">{officialDisclaimerHi}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${scheme.helplineNumber.split('/')[0].trim()}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-3 py-1.5 font-semibold text-stone-800 hover:bg-stone-200"
                      >
                        <Phone className="h-3.5 w-3.5 text-[#1B5E20]" />
                        हेल्पलाइन: {scheme.helplineNumber}
                      </a>
                      <a
                        href={scheme.officialPortalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-[#1B5E20] px-3 py-1.5 font-bold text-white hover:bg-[#144718]"
                      >
                        आधिकारिक पोर्टल <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Trust, Privacy & Audit Controls Tab */
        <div className="space-y-5">
          {deletedBanner && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-4 text-xs font-bold text-emerald-950">
              ✅ आपका संपूर्ण डेटा (प्रोफ़ाइल, फसल चक्र, केस इतिहास, फोटो, बहीखाता और चैट संदेश) स्थायी रूप से मिटा दिया गया है।
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Security & Privacy Controls */}
            <div className="rounded-xl bg-white p-5 border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#1B5E20]" />
                सुरक्षा, API कुंजी एवं सहमति नियंत्रण
              </h3>

              <div className="space-y-3 text-xs text-stone-700">
                <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200">
                  <p className="font-bold text-emerald-950">
                    1. सर्वर-साइड API कुंजी सुरक्षा (No Client Key Leak):
                  </p>
                  <p className="mt-0.5">
                    Gemini API कुंजी ब्राउज़र या क्लाइंट बंडल में कभी शामिल नहीं की जाती। सभी AI कॉल केवल सुरक्षित बैकएंड प्रॉक्सी (<code>/api/ai/*</code>) से प्रति घंटे 15 प्रश्नों की सीमा (Rate Limit) के साथ होते हैं।
                  </p>
                  {aiQuotaRemaining !== null && (
                    <p className="mt-1 font-bold text-emerald-900">
                      शेष प्रति-घंटा AI कोटा: {aiQuotaRemaining} / 15 कॉल
                    </p>
                  )}
                </div>

                <div className="rounded-lg bg-stone-50 p-3 border border-stone-200 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-stone-900">
                      2. स्पष्ट डेटा सहमति (Explicit AI Consent):
                    </p>
                    <p className="text-[11px] text-stone-600 mt-0.5">
                      सहमति बंद होने पर आपका कोई भी प्रश्न या फोटो Gemini AI को नहीं भेजा जाता।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleConsent(!profile.consentGiven)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs shrink-0 cursor-pointer ${
                      profile.consentGiven
                        ? 'bg-emerald-700 text-white'
                        : 'bg-stone-300 text-stone-800'
                    }`}
                  >
                    {profile.consentGiven ? 'सहमति चालू है' : 'सहमति बंद है'}
                  </button>
                </div>

                <div className="rounded-lg bg-stone-50 p-3 border border-stone-200 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-stone-900">
                      3. डेमो डेटा परीक्षण (Optional Sample Farm Data):
                    </p>
                    <p className="text-[11px] text-stone-600 mt-0.5">
                      होम स्क्रीन को साफ रखने के लिए डेमो बटन केवल यहाँ परीक्षण हेतु रखा गया है।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onLoadSampleData}
                    className="rounded-lg bg-white border border-stone-300 px-3 py-1.5 font-semibold text-stone-800 hover:bg-stone-100 shrink-0 cursor-pointer"
                  >
                    उदाहरण डेटा लोड करें
                  </button>
                </div>

                {/* Complete Data Deletion (Audit Point #11 Fix) */}
                <div className="rounded-lg bg-red-50 p-3.5 border border-red-200 space-y-2">
                  <p className="font-bold text-red-950">
                    4. मेरा सारा डेटा मिटाएँ (Complete Data Erasure):
                  </p>
                  <p className="text-[11px] text-red-900">
                    यह बटन आपकी प्रोफ़ाइल, सभी फसल चक्र, फसल डॉक्टर केस व फोटो, बहीखाता लेन-देन, रिमाइंडर और सेव की गई AI बातचीत को पूरी तरह हटा देता है।
                  </p>
                  {!confirmDeleteOpen ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 hover:bg-red-800 px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      मेरा संपूर्ण डेटा मिटाएँ
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleConfirmDeleteAll}
                        className="rounded-lg bg-red-800 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                      >
                        हाँ, सब कुछ स्थायी रूप से मिटाएँ
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteOpen(false)}
                        className="rounded-lg bg-white border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 cursor-pointer"
                      >
                        रद्द करें
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Honest Local Log of Flagged Messages & KVK Exports */}
            <div className="rounded-xl bg-white p-5 border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-stone-900">
                स्थानीय गुणवत्ता एवं KVK परामर्श लॉग (Local Review Log)
              </h3>
              <p className="text-xs text-stone-600">
                पारदर्शिता नियम: किसान द्वारा फ्लैग किए गए उत्तर और KVK हेतु डाउनलोड किए गए केस यहाँ स्थानीय रूप से दर्ज होते हैं।
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <h4 className="font-bold text-stone-800 mb-1.5">
                    KVK परामर्श / हेल्पलाइन केस ({cropCases.filter((c) => c.expertStatus !== 'NONE').length})
                  </h4>
                  {cropCases.filter((c) => c.expertStatus !== 'NONE').length === 0 ? (
                    <p className="text-stone-500 bg-stone-50 p-2.5 rounded border border-stone-200">
                      अभी किसी फसल केस की पर्ची डाउनलोड नहीं की गई है।
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {cropCases
                        .filter((c) => c.expertStatus !== 'NONE')
                        .map((c) => (
                          <div
                            key={c.id}
                            className="rounded-lg bg-stone-50 p-2.5 border border-stone-200"
                          >
                            <p className="font-bold text-stone-900">
                              {c.cropName} ({c.createdAt})
                            </p>
                            <p className="text-stone-600 mt-0.5">{c.expertNotes}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-stone-800 mb-1.5">
                    किसान द्वारा चिन्हित (Flagged) असंतोषजनक AI उत्तर ({flaggedMessages.length})
                  </h4>
                  {flaggedMessages.length === 0 ? (
                    <p className="text-stone-500 bg-stone-50 p-2.5 rounded border border-stone-200">
                      कोई चिन्हित संदेश नहीं है।
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {flaggedMessages.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-lg bg-red-50/70 p-2.5 border border-red-200"
                        >
                          <p className="font-semibold text-red-950 line-clamp-2">
                            {m.messageText}
                          </p>
                          <p className="text-[11px] text-red-800 mt-0.5">
                            स्थिति: स्थानीय समीक्षा लॉग में दर्ज ({m.createdAt})
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
