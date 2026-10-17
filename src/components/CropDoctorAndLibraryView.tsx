import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Camera,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  PhoneCall,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import { CROP_GUIDANCE_LIBRARY } from '../data/knowledgeBase';
import {
  processImageFileForDiagnosis,
  runCropDoctorDiagnosis,
} from '../services/weatherAndAiClient';
import { CropCase, CropCycle, FarmerProfile } from '../types/amaura';

interface Props {
  profile: FarmerProfile;
  cropCycles: CropCycle[];
  cropCases: CropCase[];
  onSaveCase: (newCase: CropCase) => void;
  onUpdateCaseStatus: (caseId: string, status: CropCase['expertStatus'], notes: string) => void;
  onDeleteCase: (caseId: string) => void;
  onSpeak: (text: string) => void;
  onRequestConsentModal: () => void;
}

const SYMPTOM_QUICK_TAGS = [
  'निचली पत्तियाँ पीली पड़ रही हैं',
  'पत्ती पर पीला/भूरा पाउडर लग रहा है',
  'गोभ (बीच की पत्ती) सूख रही है',
  'फलियों/टहनियों पर छोटे चिपचिपे कीट (माहू)',
  'पत्तियों के किनारे काले/झुलसे हुए हैं',
  'पौधा हरी अवस्था में मुरझा रहा है',
];

const CROP_OPTIONS = [
  'गेहूँ (Wheat)',
  'धान (Paddy)',
  'सरसों (Mustard)',
  'चना (Chickpea)',
  'आलू (Potato)',
  'कपास (Cotton)',
  'गन्ना (Sugarcane)',
  'मक्का (Maize)',
  'टमाटर/सब्जी (Vegetables)',
];

const STAGE_OPTIONS = [
  'अंकुरण / शुरुआती अवस्था (0-20 दिन)',
  'कल्ले निकलने / वानस्पतिक अवस्था (21-45 दिन)',
  'फूल आने की अवस्था (Flowering)',
  'दाना / फली बनने की अवस्था (Grain Filling)',
  'पकने / कटाई के करीब',
];

const SPREAD_OPTIONS = [
  'केवल 2-4 पौधों में (शुरुआती)',
  'खेत के एक कोने या निचले हिस्से में (10-20%)',
  'पूरे खेत में जगह-जगह फैला हुआ (>30%)',
];

export const CropDoctorAndLibraryView: React.FC<Props> = ({
  profile,
  cropCycles,
  cropCases,
  onSaveCase,
  onUpdateCaseStatus,
  onDeleteCase,
  onSpeak,
  onRequestConsentModal,
}) => {
  const [subTab, setSubTab] = useState<'doctor' | 'library'>('doctor');

  // Audit Point #13 Fix: Form is NEVER pre-filled with fake symptoms!
  const [cropName, setCropName] = useState<string>(
    cropCycles[0]?.cropName || CROP_OPTIONS[0]
  );
  const [growthStage, setGrowthStage] = useState<string>(
    cropCycles[0]?.growthStage || STAGE_OPTIONS[1]
  );
  const [symptoms, setSymptoms] = useState<string>('');
  const [spreadScope, setSpreadScope] = useState<string>(SPREAD_OPTIONS[0]);

  const [analysisBase64, setAnalysisBase64] = useState<string>('');
  const [thumbnailBase64, setThumbnailBase64] = useState<string>('');
  const [photoDims, setPhotoDims] = useState<{ width: number; height: number } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [latestCase, setLatestCase] = useState<CropCase | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    try {
      const processed = await processImageFileForDiagnosis(file);
      setAnalysisBase64(processed.analysisBase64);
      setThumbnailBase64(processed.thumbnailBase64);
      setPhotoDims({ width: processed.width, height: processed.height });
    } catch (err: unknown) {
      setPhotoError(
        err instanceof Error ? err.message : 'फोटो प्रोसेस करने में समस्या आई। कृपया दूसरी फोटो चुनें।'
      );
    }
  };

  const handleRunDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!symptoms.trim() || symptoms.trim().length < 5) {
      setFormError(
        'कृपया पहले देखे गए लक्षण लिखें या नीचे दिए गए लक्षण बटन चुनें (बिना लक्षण लिखे जाँच नहीं की जाती)।'
      );
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await runCropDoctorDiagnosis({
        cropName,
        growthStage,
        symptoms: symptoms.trim(),
        spreadScope,
        analysisBase64: analysisBase64 || undefined,
        thumbnailBase64: thumbnailBase64 || undefined,
        photoWidth: photoDims?.width,
        photoHeight: photoDims?.height,
        profile,
      });

      const createdCase: CropCase = {
        id: `case_${Date.now()}`,
        cropName,
        growthStage,
        symptoms: symptoms.trim(),
        spreadScope,
        likelyCauses: result.likelyCauses,
        confidenceLevel: result.confidenceLevel,
        safeNextSteps: result.safeNextSteps,
        expertStatus: 'NONE',
        expertNotes: '',
        photoBase64: thumbnailBase64,
        photoDimensions: photoDims ? `${photoDims.width}x${photoDims.height}px` : undefined,
        usedLiveAi: result.usedLiveAi,
        fallbackNoticeHi: result.fallbackNoticeHi,
        createdAt: new Date().toLocaleString('hi-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      onSaveCase(createdCase);
      setLatestCase(createdCase);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportCaseSummary = (c: CropCase) => {
    const content = [
      '=== AMAURA FARMER — KVK विशेषज्ञ परामर्श केस सारांश ===',
      `तिथि: ${c.createdAt}`,
      `किसान का नाम: ${profile.farmerName} (${profile.districtName || 'जिला अज्ञात'}, ${profile.stateName || 'भारत'})`,
      `फसल: ${c.cropName} | अवस्था: ${c.growthStage}`,
      `फैलाव: ${c.spreadScope}`,
      `किसान द्वारा देखे गए लक्षण: ${c.symptoms}`,
      `प्राथमिक आत्मविश्वास स्तर: ${c.confidenceLevel} (${c.usedLiveAi ? 'Gemini AI + संदर्भ' : 'ऑफ़लाइन संदर्भ'})`,
      '',
      '--- संभावित कारण ---',
      c.likelyCauses,
      '',
      '--- सुरक्षित प्राथमिक कदम ---',
      c.safeNextSteps,
      '',
      'नोट: यह रिपोर्ट किसान द्वारा अपने नजदीकी कृषि विज्ञान केंद्र (KVK) या किसान कॉल सेंटर (1800-180-1551) को दिखाने के लिए तैयार की गई है।',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KVK_Case_${c.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    onUpdateCaseStatus(
      c.id,
      'SAVED_FOR_KVK',
      'किसान के डिवाइस में KVK परामर्श पर्ची डाउनलोड की गई (सीधे किसी बाहरी सर्वर को नहीं भेजी गई)।'
    );
  };

  const confidenceBadge = (level: CropCase['confidenceLevel']) => {
    if (level === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900 border border-emerald-300">
          आत्मविश्वास: उच्च (HIGH — स्पष्ट फोटो व लक्षण)
        </span>
      );
    }
    if (level === 'MEDIUM') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 border border-amber-300">
          आत्मविश्वास: मध्यम (MEDIUM — खेत में पुष्टि आवश्यक)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-950 border border-orange-300">
        आत्मविश्वास: कम (LOW — बिना स्पष्ट फोटो/केवल प्रारंभिक अनुमान)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        <button
          type="button"
          onClick={() => setSubTab('doctor')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            subTab === 'doctor'
              ? 'bg-[#1B5E20] text-white shadow-sm'
              : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
          }`}
        >
          <Camera className="h-4 w-4" />
          फसल डॉक्टर (Crop Doctor)
        </button>
        <button
          type="button"
          onClick={() => setSubTab('library')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            subTab === 'library'
              ? 'bg-[#1B5E20] text-white shadow-sm'
              : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          सत्यापित फसल ज्ञान पुस्तकालय ({CROP_GUIDANCE_LIBRARY.length} लेख)
        </button>
      </div>

      {subTab === 'doctor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Diagnosis Input Form */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-xl bg-white p-5 shadow-xs border border-stone-200">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#1B5E20]">
                    फसल लक्षण एवं फोटो जाँच (Cautious Crop Doctor)
                  </h2>
                  <p className="text-xs text-stone-600 mt-0.5">
                    प्रभावित पत्ती/पौधे की साफ फोटो अपलोड करें और अपने शब्दों में लक्षण लिखें।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRequestConsentModal}
                  className={`text-xs px-2.5 py-1 rounded border font-medium ${
                    profile.consentGiven
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-900 border-amber-300'
                  }`}
                >
                  {profile.consentGiven ? 'AI सहमति: चालू' : 'AI सहमति: बंद (ऑफ़लाइन मोड)'}
                </button>
              </div>

              <form onSubmit={handleRunDiagnosis} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      1. फसल चुनें (Crop)
                    </label>
                    <select
                      value={cropName}
                      onChange={(e) => setCropName(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-[#2E7D32] focus:outline-none"
                    >
                      {CROP_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      2. फसल की अवस्था (Growth Stage)
                    </label>
                    <select
                      value={growthStage}
                      onChange={(e) => setGrowthStage(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-[#2E7D32] focus:outline-none"
                    >
                      {STAGE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    3. देखे गए लक्षण (Symptoms — अनिवार्य, पहले से भरा हुआ नहीं)
                  </label>
                  <textarea
                    rows={3}
                    value={symptoms}
                    onChange={(e) => {
                      setSymptoms(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="उदाहरण: निचली पत्तियाँ पीली पड़ रही हैं और छूने पर पाउडर जैसा लग रहा है..."
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-[#2E7D32] focus:outline-none"
                  />
                  <div className="mt-2">
                    <span className="block text-[11px] font-medium text-stone-500 mb-1.5">
                      त्वरित लक्षण जोड़ने के लिए टैप करें:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SYMPTOM_QUICK_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            setSymptoms((prev) =>
                              prev.includes(tag) ? prev : prev ? `${prev}, ${tag}` : tag
                            )
                          }
                          className="rounded-md bg-stone-100 hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 px-2.5 py-1 text-xs text-stone-700 transition"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    4. खेत में फैलाव का दायरा (Spread Scope)
                  </label>
                  <select
                    value={spreadScope}
                    onChange={(e) => setSpreadScope(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-[#2E7D32] focus:outline-none"
                  >
                    {SPREAD_OPTIONS.map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}
                      </option>
                    ))}
                  </select>
                </div>

                {/* High-res photo upload */}
                <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-stone-800">
                        5. प्रभावित पत्ती की उच्च-रिज़ॉल्यूशन फोटो (वैकल्पिक पर अनुशंसित)
                      </p>
                      <p className="text-[11px] text-stone-500">
                        फोटो 1024px तक रिज़ॉल्यूशन में जाँची जाती है और केस इतिहास में सुरक्षित रहती है।
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-100"
                      >
                        <Upload className="h-3.5 w-3.5 text-[#1B5E20]" />
                        फोटो चुनें / कैमरा
                      </button>
                      {thumbnailBase64 && (
                        <button
                          type="button"
                          onClick={() => {
                            setAnalysisBase64('');
                            setThumbnailBase64('');
                            setPhotoDims(null);
                          }}
                          className="text-xs text-red-700 hover:underline px-2 py-1"
                        >
                          हटाएँ
                        </button>
                      )}
                    </div>
                  </div>

                  {photoError && (
                    <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                      {photoError}
                    </p>
                  )}

                  {thumbnailBase64 && (
                    <div className="mt-3 flex items-center gap-3 bg-white p-2.5 rounded-lg border border-stone-200">
                      <img
                        src={thumbnailBase64}
                        alt="चयनित फसल फोटो"
                        className="h-16 w-16 rounded object-cover border border-stone-300"
                      />
                      <div className="text-xs">
                        <p className="font-semibold text-stone-800">फोटो संलग्न है</p>
                        {photoDims && (
                          <p className="text-stone-600">
                            मूल आकार: {photoDims.width} × {photoDims.height} px{' '}
                            {photoDims.width < 240 || photoDims.height < 240 ? (
                              <span className="text-amber-800 font-semibold">
                                (कम रिज़ॉल्यूशन — साफ फोटो लें)
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">(स्पष्ट रिज़ॉल्यूशन)</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {formError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-900 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-700" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#1B5E20] hover:bg-[#144718] disabled:opacity-60 px-4 py-3 text-sm font-bold text-white shadow-xs transition cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  {isAnalyzing
                    ? 'फसल के लक्षणों की जाँच हो रही है...'
                    : 'सतर्क प्राथमिक विश्लेषण प्राप्त करें'}
                </button>
              </form>
            </div>

            {/* Latest Diagnosis Result Card */}
            {latestCase && (
              <div className="rounded-xl bg-white p-5 shadow-xs border-2 border-[#2E7D32]">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1B5E20]">
                      ताज़ा जाँच परिणाम
                    </span>
                    <h3 className="text-base font-bold text-stone-900">
                      {latestCase.cropName} — {latestCase.growthStage}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {confidenceBadge(latestCase.confidenceLevel)}
                    <button
                      type="button"
                      onClick={() =>
                        onSpeak(
                          `${latestCase.cropName} जाँच परिणाम। संभावित कारण: ${latestCase.likelyCauses}। सुरक्षित कदम: ${latestCase.safeNextSteps}`
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-900 border border-emerald-200 hover:bg-emerald-100"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      सुनें
                    </button>
                  </div>
                </div>

                {latestCase.fallbackNoticeHi && (
                  <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-950">
                    ℹ️ {latestCase.fallbackNoticeHi}
                  </div>
                )}

                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-lg bg-stone-50 p-3.5 border border-stone-200">
                    <h4 className="font-bold text-stone-900 text-xs uppercase mb-1">
                      संभावित कारण और विकल्प (Likely Causes & Uncertainty)
                    </h4>
                    <p className="whitespace-pre-line text-stone-800 leading-relaxed">
                      {latestCase.likelyCauses}
                    </p>
                  </div>

                  <div className="rounded-lg bg-emerald-50/60 p-3.5 border border-emerald-200">
                    <h4 className="font-bold text-emerald-950 text-xs uppercase mb-1">
                      सुरक्षित अगले कदम (Safe Non-Prescriptive Steps)
                    </h4>
                    <p className="whitespace-pre-line text-stone-800 leading-relaxed">
                      {latestCase.safeNextSteps}
                    </p>
                  </div>
                </div>

                {/* Audit Point #1 Fix: Honest KVK & Helpline Escalation (never pretends a remote team received it) */}
                <div className="mt-4 rounded-lg bg-[#FFF8E7] border border-amber-300 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" />
                    <div className="space-y-2 text-xs text-stone-800">
                      <p className="font-bold text-amber-950">
                        ईमानदार विशेषज्ञ परामर्श विकल्प (पारदर्शी सूचना):
                      </p>
                      <p>
                        इस ऐप से कोई भी रिपोर्ट अपने-आप किसी सरकारी KVK सर्वर पर नहीं जाती (ताकि आप किसी झूठे जवाब के इंतज़ार में न रहें)। आप नीचे दिए बटन से{' '}
                        <strong>केस पर्ची डाउनलोड</strong> करके अपने नजदीकी कृषि विज्ञान केंद्र (KVK) ले जा सकते हैं या सीधे{' '}
                        <strong>किसान कॉल सेंटर (1800-180-1551)</strong> पर निःशुल्क बात कर सकते हैं।
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleExportCaseSummary(latestCase)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-amber-400 px-3 py-1.5 font-semibold text-amber-950 hover:bg-amber-100"
                        >
                          <Download className="h-3.5 w-3.5" />
                          KVK परामर्श पर्ची डाउनलोड करें (.txt)
                        </button>
                        <a
                          href="tel:18001801551"
                          onClick={() =>
                            onUpdateCaseStatus(
                              latestCase.id,
                              'CALLED_HELPLINE',
                              'किसान कॉल सेंटर 1800-180-1551 डायल किया गया।'
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B5E20] px-3 py-1.5 font-semibold text-white hover:bg-[#144718]"
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                          किसान कॉल सेंटर: 1800-180-1551
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Persistent Case History with Saved Photos */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl bg-white p-5 shadow-xs border border-stone-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#1B5E20]" />
                  पूर्व फसल केस इतिहास ({cropCases.length})
                </h3>
                <span className="text-[11px] text-stone-500">फोटो व स्थिति सहित सुरक्षित</span>
              </div>

              {cropCases.length === 0 ? (
                <div className="rounded-lg border border-dashed border-stone-200 p-6 text-center text-xs text-stone-500">
                  अभी कोई फसल केस दर्ज नहीं है। बाईं ओर लक्षण और फोटो डालकर पहली जाँच करें।
                </div>
              ) : (
                <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                  {cropCases.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-stone-200 bg-stone-50/70 p-3.5 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {c.photoBase64 ? (
                            <img
                              src={c.photoBase64}
                              alt={c.cropName}
                              className="h-12 w-12 rounded object-cover border border-stone-300 shrink-0"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded bg-stone-200 flex items-center justify-center text-[10px] text-stone-600 shrink-0 text-center p-1">
                              बिना फोटो
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-stone-900">{c.cropName}</p>
                            <p className="text-[11px] text-stone-500">
                              {c.createdAt} • {c.growthStage}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteCase(c.id)}
                          title="केस हटाएँ"
                          className="text-stone-400 hover:text-red-700 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {confidenceBadge(c.confidenceLevel)}
                        <span className="text-[11px] px-2 py-0.5 rounded bg-stone-200/80 text-stone-700">
                          {c.usedLiveAi ? 'सर्वर Gemini AI' : 'ऑफ़लाइन नियम'}
                        </span>
                        {c.expertStatus !== 'NONE' && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            {c.expertStatus === 'SAVED_FOR_KVK'
                              ? 'KVK पर्ची डाउनलोड की गई'
                              : 'हेल्पलाइन 1800-180-1551 डायल किया'}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-stone-700">
                        <strong>लक्षण:</strong> {c.symptoms}
                      </p>
                      <p className="text-xs text-stone-600 line-clamp-3">{c.likelyCauses}</p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setLatestCase(c)}
                          className="text-xs font-semibold text-[#1B5E20] hover:underline"
                        >
                          पूरा विवरण देखें
                        </button>
                        <span className="text-stone-300">|</span>
                        <button
                          type="button"
                          onClick={() => handleExportCaseSummary(c)}
                          className="text-xs font-medium text-stone-700 hover:underline inline-flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          पर्ची डाउनलोड
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Verified Reference Library */
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-950 text-white p-5">
            <h2 className="text-lg font-bold">
              सत्यापित कृषि संदर्भ पुस्तकालय (ICAR / KVK मानक सारांश)
            </h2>
            <p className="text-xs text-emerald-100 mt-1">
              ये लेख ऐप के भीतर ऑफ़लाइन उपलब्ध हैं और बिना इंटरनेट के भी सुरक्षित सस्य क्रियाओं तथा रोग पहचान में मदद करते हैं।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CROP_GUIDANCE_LIBRARY.map((art) => (
              <div
                key={art.id}
                className="rounded-xl bg-white p-5 shadow-xs border border-stone-200 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                      {art.cropHi} • {art.categoryHi}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onSpeak(
                          `${art.titleHi}। ${art.summaryHi}। सुरक्षित कदम: ${art.cautiousStepsHi.join(' ')}`
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B5E20] hover:underline"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      सुनें
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-stone-900">{art.titleHi}</h3>
                  <p className="text-xs text-stone-700 leading-relaxed">{art.summaryHi}</p>

                  <div className="rounded-lg bg-stone-50 p-3 border border-stone-200">
                    <p className="text-xs font-bold text-stone-800 mb-1">सुरक्षित कदम:</p>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-stone-700">
                      {art.cautiousStepsHi.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg bg-amber-50 p-2.5 border border-amber-200 text-xs text-amber-950">
                    ⚠️ <strong>सावधानी:</strong> {art.safetyWarningHi}
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                  <span>{art.sourceOrg}</span>
                  <a
                    href={art.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[#1B5E20] hover:underline"
                  >
                    संस्थान पोर्टल <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
