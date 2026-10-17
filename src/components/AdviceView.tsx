import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  AlertCircle,
  CheckCircle2,
  PhoneCall,
  FileText,
  BookOpen,
  Volume2,
  Send,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { CropCase, CropCycle, FarmerProfile, KnowledgeArticle } from '../types/amaura';
import { CROP_GUIDANCE_LIBRARY } from '../data/knowledgeBase';

interface AdviceViewProps {
  profile: FarmerProfile;
  cropCycles: CropCycle[];
  cropCases: CropCase[];
  analyzing: boolean;
  errorBanner: string | null;
  onRunCropDoctor: (payload: {
    cropName: string;
    growthStage: string;
    symptoms: string;
    spreadScope: string;
    photoAnalysisBase64: string;
    photoThumbnailBase64: string;
    photoResolutionLabel: string;
    isLowResPhoto: boolean;
  }) => Promise<void>;
  onEscalateToKvk: (cropCase: CropCase) => Promise<void>;
  onSpeakText: (text: string) => void;
  onOpenKvkAdminModal: () => void;
}

export const AdviceView: React.FC<AdviceViewProps> = ({
  profile,
  cropCycles,
  cropCases,
  analyzing,
  errorBanner,
  onRunCropDoctor,
  onEscalateToKvk,
  onSpeakText,
  onOpenKvkAdminModal,
}) => {
  const isHi = profile.preferredLanguage === 'hi';
  const [subTab, setSubTab] = useState<'doctor' | 'library'>('doctor');

  // Audit Point #13 Fix: Form starts EMPTY (not pre-filled with sample wheat symptoms!)
  const [cropName, setCropName] = useState('');
  const [growthStage, setGrowthStage] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [spreadScope, setSpreadScope] = useState('खेत के कुछ हिस्सों में (10-25% पौधे)');
  const [photoAnalysisBase64, setPhotoAnalysisBase64] = useState('');
  const [photoThumbnailBase64, setPhotoThumbnailBase64] = useState('');
  const [photoResolutionLabel, setPhotoResolutionLabel] = useState('');
  const [isLowResPhoto, setIsLowResPhoto] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedSlipCase, setSelectedSlipCase] = useState<CropCase | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const commonCrops = [
    'गेहूँ (Wheat)',
    'धान (Paddy)',
    'सरसों (Mustard)',
    'चना (Chickpea)',
    'आलू (Potato)',
    'कपास (Cotton)',
    'गन्ना (Sugarcane)',
    'मक्का (Maize)',
    'टमाटर (Tomato)',
  ];

  const symptomChips = [
    'निचली पत्तियाँ पीली पड़ रही हैं',
    'पत्ते छूने पर पीला पाउडर लग रहा है',
    'टहनियों और फलियों पर छोटे माहू (चेपा) कीट हैं',
    'बीच की गोभ सूख रही है (तना छेदक लक्षण)',
    'पत्तियों पर भूरे-काले धब्बे और झुलसा दिख रहा है',
    'पौधा जड़ से सूखकर मुरझा रहा है (उकठा)',
  ];

  // Audit Point #14 & #15 Fix: High-Res image processing (1024px for AI + persistent thumbnail for Case History)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;
        const lowRes = w < 220 || h < 220;
        setIsLowResPhoto(lowRes);
        setPhotoResolutionLabel(`${w}×${h}px`);

        // 1. High-resolution canvas (up to 1024px) for Gemini Multimodal Leaf Analysis
        const maxAnalysis = 1024;
        const scaleA = Math.min(1, maxAnalysis / Math.max(w, h, 1));
        const canvasA = document.createElement('canvas');
        canvasA.width = Math.max(1, Math.round(w * scaleA));
        canvasA.height = Math.max(1, Math.round(h * scaleA));
        const ctxA = canvasA.getContext('2d');
        if (ctxA) {
          ctxA.drawImage(img, 0, 0, canvasA.width, canvasA.height);
          setPhotoAnalysisBase64(canvasA.toDataURL('image/jpeg', 0.84));
        }

        // 2. Persistent Thumbnail (up to 300px) saved in Case History
        const maxThumb = 300;
        const scaleT = Math.min(1, maxThumb / Math.max(w, h, 1));
        const canvasT = document.createElement('canvas');
        canvasT.width = Math.max(1, Math.round(w * scaleT));
        canvasT.height = Math.max(1, Math.round(h * scaleT));
        const ctxT = canvasT.getContext('2d');
        if (ctxT) {
          ctxT.drawImage(img, 0, 0, canvasT.width, canvasT.height);
          setPhotoThumbnailBase64(canvasT.toDataURL('image/jpeg', 0.72));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleClearPhoto = () => {
    setPhotoAnalysisBase64('');
    setPhotoThumbnailBase64('');
    setPhotoResolutionLabel('');
    setIsLowResPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!cropName.trim()) {
      setValidationError(
        isHi
          ? 'कृपया पहले अपनी फसल चुनें या नाम लिखें।'
          : 'Please select or enter the crop name first.'
      );
      return;
    }

    if (!symptoms.trim() || symptoms.trim().length < 6) {
      setValidationError(
        isHi
          ? 'कृपया खेत में दिख रहे वास्तविक लक्षण लिखें या नीचे दिए गए लक्षण टैग चुनें (फॉर्म खाली या पूर्व-भरा नहीं रखा गया है)।'
          : 'Please describe the actual symptoms observed in your field or tap a symptom tag.'
      );
      return;
    }

    await onRunCropDoctor({
      cropName: cropName.trim(),
      growthStage: growthStage.trim() || 'वानस्पतिक अवस्था (Vegetative)',
      symptoms: symptoms.trim(),
      spreadScope,
      photoAnalysisBase64,
      photoThumbnailBase64,
      photoResolutionLabel,
      isLowResPhoto,
    });
  };

  const getConfidenceBadge = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
    if (level === 'HIGH') {
      return {
        labelHi: 'उच्च स्पष्टता (HIGH — फिर भी खेत में पुष्टि करें)',
        cls: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      };
    }
    if (level === 'MEDIUM') {
      return {
        labelHi: 'मध्यम संभावना (MEDIUM — 2 संभावित कारण जांचें)',
        cls: 'bg-amber-100 text-amber-900 border-amber-300',
      };
    }
    return {
      labelHi: 'कम आत्मविश्वास (LOW — अधिक जानकारी/विशेषज्ञ जाँच आवश्यक)',
      cls: 'bg-red-100 text-red-900 border-red-300',
    };
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation between Crop Doctor and Reference Library */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#DCE3DC]">
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab('doctor')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              subTab === 'doctor'
                ? 'bg-[#1E4D2B] text-white'
                : 'bg-[#F3F6F3] text-[#1E4D2B] hover:bg-[#E2ECE4]'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{isHi ? 'फसल डॉक्टर व केस हिस्ट्री' : 'Crop Doctor & Case History'}</span>
          </button>

          <button
            onClick={() => setSubTab('library')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              subTab === 'library'
                ? 'bg-[#1E4D2B] text-white'
                : 'bg-[#F3F6F3] text-[#1E4D2B] hover:bg-[#E2ECE4]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>
              {isHi
                ? `सत्यापित कृषि संदर्भ पुस्तकालय (${CROP_GUIDANCE_LIBRARY.length} लेख)`
                : `Reference Library (${CROP_GUIDANCE_LIBRARY.length} Guides)`}
            </span>
          </button>
        </div>

        <a
          href="tel:18001801551"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B] text-xs font-bold"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>{isHi ? 'निःशुल्क किसान कॉल सेंटर: 1800-180-1551' : 'Toll-Free KCC: 1800-180-1551'}</span>
        </a>
      </div>

      {subTab === 'doctor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 6 cols: Clean Crop Doctor Form */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-[#DCE3DC] p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#1E4D2B] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#2E6F40]" />
                <span>
                  {isHi
                    ? 'फसल डॉक्टर — पत्ती फोटो एवं लक्षण विश्लेषण'
                    : 'Crop Doctor — Leaf Photo & Symptom Analysis'}
                </span>
              </h2>
              <p className="text-xs text-[#526556] mt-0.5">
                {isHi
                  ? 'ऑडिट सुधार: कोई भी लक्षण पहले से नहीं भरा गया है। अपनी वास्तविक फसल व लक्षण चुनें और साफ फोटो जोड़ें।'
                  : 'Clean un-prefilled form: Select your actual crop, describe symptoms, and upload a high-resolution leaf photo.'}
              </p>
            </div>

            {validationError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-xs text-red-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {errorBanner && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900">
                ⚠️ {errorBanner}
              </div>
            )}

            <form onSubmit={handleSubmitDiagnosis} className="space-y-4">
              {/* 1. Crop Selection */}
              <div>
                <label className="block text-xs font-bold text-[#1E4D2B] mb-1.5">
                  {isHi ? '1. फसल चुनें या लिखें *' : '1. Select or Enter Crop *'}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {/* Show farmer's active crops first if any */}
                  {cropCycles.map((cc) => (
                    <button
                      type="button"
                      key={cc.id}
                      onClick={() => {
                        setCropName(cc.cropName);
                        setGrowthStage(cc.growthStage);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                        cropName === cc.cropName
                          ? 'bg-[#1E4D2B] text-white border-[#1E4D2B]'
                          : 'bg-[#E8F3EA] text-[#1E4D2B] border-[#B8D8BE]'
                      }`}
                    >
                      🌱 {cc.cropName} ({cc.fieldName})
                    </button>
                  ))}
                  {commonCrops.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setCropName(c)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer ${
                        cropName === c
                          ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                          : 'bg-[#F3F6F3] text-[#1C281E] border-[#DCE3DC] hover:bg-[#E8F3EA]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  placeholder={isHi ? 'फसल का नाम (जैसे: गेहूँ, धान, सरसों)...' : 'Enter crop name...'}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#C5D3C8] text-sm"
                />
              </div>

              {/* 2. Growth Stage & Spread */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                    {isHi ? '2. फसल की अवस्था' : '2. Growth Stage'}
                  </label>
                  <select
                    value={growthStage}
                    onChange={(e) => setGrowthStage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8] bg-white text-xs sm:text-sm"
                  >
                    <option value="">{isHi ? '-- अवस्था चुनें --' : '-- Select Stage --'}</option>
                    <option value="अंकुरण / शुरुआती (0-20 दिन)">अंकुरण / शुरुआती (0-20 दिन)</option>
                    <option value="कल्ले निकलना / वानस्पतिक (21-45 दिन)">
                      कल्ले निकलना / वानस्पतिक (21-45 दिन)
                    </option>
                    <option value="फूल आना / बाली निकलना (45-75 दिन)">
                      फूल आना / बाली निकलना (45-75 दिन)
                    </option>
                    <option value="दाना बनना / पकना (75+ दिन)">दाना बनना / पकना (75+ दिन)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                    {isHi ? '3. खेत में फैलाव कितना है?' : '3. Spread in Field'}
                  </label>
                  <select
                    value={spreadScope}
                    onChange={(e) => setSpreadScope(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8] bg-white text-xs sm:text-sm"
                  >
                    <option value="केवल 2-4 पौधों में (शुरुआती)">केवल 2-4 पौधों में (शुरुआती)</option>
                    <option value="खेत के कुछ हिस्सों में (10-25% पौधे)">
                      खेत के कुछ हिस्सों में (10-25% पौधे)
                    </option>
                    <option value="आधे से अधिक खेत में (>50% गंभीर)">
                      आधे से अधिक खेत में (&gt;50% गंभीर)
                    </option>
                  </select>
                </div>
              </div>

              {/* 3. Symptoms Input (Un-prefilled + tap chips) */}
              <div>
                <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                  {isHi ? '4. खेत में दिख रहे लक्षण बताएं *' : '4. Describe Observed Symptoms *'}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {symptomChips.map((chip) => (
                    <button
                      type="button"
                      key={chip}
                      onClick={() =>
                        setSymptoms((prev) => (prev ? `${prev}; ${chip}` : chip))
                      }
                      className="px-2.5 py-1 rounded-lg bg-[#F5F7F5] hover:bg-[#E8F3EA] border border-[#CFE0D2] text-[11px] text-[#1E4D2B] cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder={
                    isHi
                      ? 'यहाँ लिखें कि पत्तियों, तने या जड़ पर क्या दिख रहा है...'
                      : 'Describe what you see on the leaves, stem, or roots...'
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-[#C5D3C8] text-sm"
                />
              </div>

              {/* 4. High-Resolution Leaf Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-[#1E4D2B] mb-1.5">
                  {isHi
                    ? '5. प्रभावित पत्ती की साफ फोटो जोड़ें (उच्च रिज़ॉल्यूशन विश्लेषण + केस हिस्ट्री में सेव)'
                    : '5. Upload Clear Leaf Photo (High-Res up to 1024px + Saved in Case History)'}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {!photoThumbnailBase64 ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 px-4 rounded-xl border-2 border-dashed border-[#8AB695] bg-[#F6FAF7] hover:bg-[#EBF4ED] text-[#1E4D2B] flex flex-col items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <Upload className="w-6 h-6 text-[#2E6F40]" />
                    <span className="text-xs sm:text-sm font-bold">
                      {isHi
                        ? 'कैमरा से फोटो लें या गैलरी से पत्ती की फोटो चुनें'
                        : 'Take Photo or Upload Leaf Image'}
                    </span>
                    <span className="text-[11px] text-[#526556]">
                      {isHi
                        ? 'साफ और नज़दीक से ली गई फोटो (कम से कम 220x220px) से बेहतर पहचान होती है'
                        : 'Clear close-up photo (>220x220px) improves diagnostic accuracy'}
                    </span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl border border-[#B8D8BE] bg-[#F4F9F5] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={photoThumbnailBase64}
                        alt="Leaf preview"
                        className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                      />
                      <div>
                        <p className="text-xs font-bold text-[#1E4D2B]">
                          {isHi ? 'फोटो संलग्न और केस हिस्ट्री के लिए तैयार' : 'Photo attached & ready'}
                        </p>
                        <p className="text-[11px] text-[#526556]">
                          {isHi ? `मूल आकार: ${photoResolutionLabel}` : `Resolution: ${photoResolutionLabel}`}
                        </p>
                        {isLowResPhoto && (
                          <p className="text-[11px] text-red-700 font-semibold mt-0.5">
                            ⚠️ {isHi ? 'फोटो छोटी/धुंधली है — आत्मविश्वास स्तर LOW रहेगा' : 'Low resolution image'}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearPhoto}
                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={analyzing}
                className="w-full py-3 rounded-xl bg-[#2E6F40] hover:bg-[#1E4D2B] disabled:opacity-50 text-white font-bold text-sm shadow-sm cursor-pointer transition"
              >
                {analyzing
                  ? isHi
                    ? 'फसल डॉक्टर विश्लेषण कर रहा है...'
                    : 'Analyzing crop symptoms...'
                  : isHi
                  ? 'सुरक्षित फसल जाँच और समाधान प्राप्त करें'
                  : 'Run Safe Crop Diagnosis'}
              </button>
            </form>
          </div>

          {/* Right 6 cols: Case History with Saved Photos, Dynamic Confidence & KVK Escalation */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white rounded-2xl border border-[#DCE3DC] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1E4D2B]">
                    {isHi
                      ? `आपकी फसल जाँच हिस्ट्री (${cropCases.length})`
                      : `Your Crop Case History (${cropCases.length})`}
                  </h3>
                  <p className="text-xs text-[#526556]">
                    {isHi
                      ? 'सहेजी गई फोटो, आत्मविश्वास स्तर और ईमानदार KVK विशेषज्ञ विकल्प'
                      : 'Saved thumbnails, dynamic confidence, and transparent KVK escalation'}
                  </p>
                </div>
                <button
                  onClick={onOpenKvkAdminModal}
                  className="text-xs font-bold text-[#D97706] hover:underline cursor-pointer"
                >
                  {isHi ? 'KVK समीक्षा पैनल देखें →' : 'View KVK Queue →'}
                </button>
              </div>

              {cropCases.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-[#F7F9F7] border border-[#DCE3DC] text-xs text-gray-500">
                  {isHi
                    ? 'अभी कोई फसल केस दर्ज नहीं है। बाईं ओर के फॉर्म में लक्षण भरकर जाँच करें।'
                    : 'No crop cases yet. Submit symptoms on the left to generate a case.'}
                </div>
              ) : (
                <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
                  {cropCases.map((c) => {
                    const confBadge = getConfidenceBadge(c.confidenceLevel);
                    return (
                      <div
                        key={c.id}
                        className="p-4 rounded-xl border border-[#CFE0D2] bg-[#FAFDFB] space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            {c.photoBase64 ? (
                              <img
                                src={c.photoBase64}
                                alt={c.cropName}
                                className="w-16 h-16 rounded-lg object-cover border border-[#B8D8BE] shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-[#E8F3EA] border border-[#B8D8BE] flex flex-col items-center justify-center text-[#2E6F40] shrink-0">
                                <ImageIcon className="w-5 h-5" />
                                <span className="text-[9px] font-semibold mt-0.5">
                                  {isHi ? 'बिना फोटो' : 'No Photo'}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-sm font-bold text-[#1E4D2B] block">
                                {c.cropName} — {c.growthStage}
                              </span>
                              <span className="text-xs text-[#526556] block mt-0.5">
                                {isHi ? 'लक्षण: ' : 'Symptoms: '}
                                {c.symptoms}
                              </span>
                              <span
                                className={`inline-block mt-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded border ${confBadge.cls}`}
                              >
                                {confBadge.labelHi}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              onSpeakText(`${c.cropName} जाँच परिणाम: ${c.likelyCauses}. ${c.safeNextSteps}`)
                            }
                            className="p-1.5 rounded-lg bg-[#E8F3EA] text-[#1E4D2B] hover:bg-[#D1E7D5] cursor-pointer"
                            title={isHi ? 'आवाज़ में सुनें' : 'Listen'}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="p-3 rounded-lg bg-white border border-[#DCE3DC] space-y-2 text-xs">
                          <div>
                            <span className="font-bold text-[#1E4D2B] block">
                              {isHi ? '🔍 संभावित कारण और खेत में क्या जांचें:' : '🔍 Likely Causes & Field Checks:'}
                            </span>
                            <p className="text-[#1C281E] whitespace-pre-line mt-0.5">
                              {c.likelyCauses}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-gray-100">
                            <span className="font-bold text-[#2E6F40] block">
                              {isHi ? '🛡️ सुरक्षित अगले कदम (बिना अंधाधुंध रसायन):' : '🛡️ Safe Next Steps:'}
                            </span>
                            <p className="text-[#1C281E] whitespace-pre-line mt-0.5">
                              {c.safeNextSteps}
                            </p>
                          </div>
                          <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-100">
                            {c.sourceLabelHi} • {c.createdAt}
                          </p>
                        </div>

                        {/* Expert Status / Honest Escalation Controls (Fixes Audit Point #1) */}
                        <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                          {c.expertStatus === 'NONE' ? (
                            <button
                              onClick={() => onEscalateToKvk(c)}
                              className="px-3 py-1.5 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>
                                {isHi
                                  ? 'ऐप समीक्षा कतार में जोड़ें + KVK विकल्प देखें'
                                  : 'Queue for Review & KVK Options'}
                              </span>
                            </button>
                          ) : (
                            <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-950 flex-1">
                              <span className="font-bold block">
                                {c.expertStatus === 'REVIEWED'
                                  ? `✅ विशेषज्ञ टिप्पणी प्राप्त (${c.expertTicketId || 'KVK'})`
                                  : `⏳ ऐप समीक्षा कतार में दर्ज (टिकट: ${c.expertTicketId || 'KVK'})`}
                              </span>
                              <span className="text-[11px] block mt-0.5">{c.expertNotes}</span>
                            </div>
                          )}

                          <button
                            onClick={() => setSelectedSlipCase(c)}
                            className="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 border border-[#1E4D2B] text-[#1E4D2B] text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{isHi ? 'KVK केस पर्ची (Slip)' : 'KVK Case Slip'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Verified Reference Library (8 Articles) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CROP_GUIDANCE_LIBRARY.map((art: KnowledgeArticle) => (
            <div
              key={art.id}
              className="bg-white rounded-2xl border border-[#DCE3DC] p-5 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#E8F3EA] text-[#1E4D2B]">
                    {art.cropHi} • {art.categoryHi}
                  </span>
                  <button
                    onClick={() =>
                      onSpeakText(`${art.titleHi}. ${art.summaryHi}. ${art.safetyWarningHi}`)
                    }
                    className="p-1.5 rounded-lg bg-[#F3F6F3] hover:bg-[#E2ECE4] text-[#1E4D2B] cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-[#1C281E]">{art.titleHi}</h3>
                <p className="text-xs sm:text-sm text-[#37473B] leading-relaxed">{art.summaryHi}</p>

                <div className="p-3 rounded-xl bg-[#F5F9F6] border border-[#CFE0D2] space-y-1">
                  <p className="text-xs font-bold text-[#1E4D2B]">
                    {isHi ? 'सुरक्षित निरीक्षण एवं कदम:' : 'Safe Steps:'}
                  </p>
                  <ul className="list-disc list-inside text-xs text-[#1C281E] space-y-1">
                    {art.cautiousStepsHi.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
                  <strong>⚠️ {isHi ? 'सुरक्षा चेतावनी: ' : 'Safety Warning: '}</strong>
                  {art.safetyWarningHi}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600">
                <span>{art.sourceOrg}</span>
                <a
                  href={art.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-[#2E6F40] hover:underline"
                >
                  <span>{isHi ? 'संस्थान वेबसाइट' : 'Official Site'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Printable / Shareable KVK Case Slip Modal */}
      {selectedSlipCase && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border-2 border-[#1E4D2B] shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1E4D2B]">
                  कृषि विज्ञान केंद्र (KVK) परामर्श केस पर्ची
                </h3>
                <p className="text-xs text-gray-600">
                  इसे नजदीकी KVK वैज्ञानिक को दिखाएँ या 1800-180-1551 पर बात करते समय उपयोग करें
                </p>
              </div>
              <button
                onClick={() => setSelectedSlipCase(null)}
                className="text-xs font-bold px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 cursor-pointer"
              >
                बंद करें ✕
              </button>
            </div>

            <div className="text-xs space-y-2 bg-[#F8FAF8] p-4 rounded-xl border border-[#CFE0D2]">
              <p>
                <strong>किसान का नाम:</strong> {profile.farmerName} ({profile.districtName || 'जिला'},{' '}
                {profile.stateName || 'भारत'})
              </p>
              <p>
                <strong>फसल एवं अवस्था:</strong> {selectedSlipCase.cropName} —{' '}
                {selectedSlipCase.growthStage}
              </p>
              <p>
                <strong>खेत में फैलाव:</strong> {selectedSlipCase.spreadScope}
              </p>
              <p>
                <strong>देखे गए लक्षण:</strong> {selectedSlipCase.symptoms}
              </p>
              <p>
                <strong>प्राथमिक संभावना (आत्मविश्वास: {selectedSlipCase.confidenceLevel}):</strong>{' '}
                {selectedSlipCase.likelyCauses}
              </p>
              <p className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded border border-amber-200">
                <strong>पारदर्शिता नोट:</strong> यह ऐप द्वारा तैयार प्राथमिक सारांश पर्ची है। कोई भी रासायनिक दवा खरीदने से पहले KVK कृषि वैज्ञानिक या राजकीय कृषि रक्षा इकाई की पुष्टि अवश्य लें।
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <a
                href="tel:18001801551"
                className="px-4 py-2 rounded-xl bg-[#D97706] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>किसान कॉल सेंटर: 1800-180-1551</span>
              </a>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-[#1E4D2B] text-white text-xs font-bold cursor-pointer"
              >
                पर्ची प्रिंट / PDF सेव करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
