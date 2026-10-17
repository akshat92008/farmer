import React, { useState } from 'react';
import {
  Sprout,
  UserCheck,
  Plus,
  Trash2,
  Bell,
  CheckCircle2,
  Calendar,
  MapPin,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { CropCycle, FarmerProfile, FarmReminder } from '../types/amaura';
import { SUPPORTED_LOCATIONS } from '../data/knowledgeBase';

interface MyFarmViewProps {
  profile: FarmerProfile;
  onSaveProfile: (updated: FarmerProfile) => void;
  cropCycles: CropCycle[];
  onAddCropCycle: (cycle: Omit<CropCycle, 'id'>) => void;
  onDeleteCropCycle: (id: string) => void;
  reminders: FarmReminder[];
  onAddReminder: (rem: Omit<FarmReminder, 'id'>) => void;
  onToggleReminder: (id: string) => void;
  onDeleteAllUserData: () => void;
}

export const MyFarmView: React.FC<MyFarmViewProps> = ({
  profile,
  onSaveProfile,
  cropCycles,
  onAddCropCycle,
  onDeleteCropCycle,
  reminders,
  onAddReminder,
  onToggleReminder,
  onDeleteAllUserData,
}) => {
  const isHi = profile.preferredLanguage === 'hi';
  const [formProfile, setFormProfile] = useState<FarmerProfile>(profile);
  const [profileSavedBanner, setProfileSavedBanner] = useState(false);

  // New Crop Cycle Form
  const todayStr = new Date().toISOString().slice(0, 10);
  const [fieldName, setFieldName] = useState('पूर्वी खेत (Plot-1)');
  const [cropName, setCropName] = useState('गेहूँ (Wheat)');
  const [varietyName, setVarietyName] = useState('HD-2967 / DBW-187');
  const [areaAcres, setAreaAcres] = useState('1.5');
  const [season, setSeason] = useState<'Rabi' | 'Kharif' | 'Zaid'>('Rabi');
  const [sowingDate, setSowingDate] = useState(todayStr);
  const [irrigationMethod, setIrrigationMethod] = useState('ट्यूबवेल / नलकूप');

  // New Reminder Form
  const [remCrop, setRemCrop] = useState('गेहूँ (Wheat)');
  const [remField, setRemField] = useState('पूर्वी खेत (Plot-1)');
  const [remTitle, setRemTitle] = useState('');
  const [remWhy, setRemWhy] = useState('');
  const [remDueDate, setRemDueDate] = useState(todayStr);
  const [notifStatus, setNotifStatus] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const computeStageFromSowingDate = (dateStr: string): string => {
    const sown = new Date(dateStr).getTime();
    if (isNaN(sown)) return 'बुवाई दर्ज';
    const diffDays = Math.floor((Date.now() - sown) / 86400000);
    if (diffDays < 0) {
      return `आगामी बुवाई (${Math.abs(diffDays)} दिन बाद निर्धारित)`;
    }
    if (diffDays <= 20) return `अंकुरण अवस्था (बुवाई के ${diffDays} दिन पूरे)`;
    if (diffDays <= 45) return `CRI / कल्ले निकलने की अवस्था (${diffDays} दिन पूरे)`;
    if (diffDays <= 80) return `गाभा / फूल व बाली अवस्था (${diffDays} दिन पूरे)`;
    return `दाना भराव / परिपक्वता अवस्था (${diffDays} दिन पूरे)`;
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formProfile);
    setProfileSavedBanner(true);
    setTimeout(() => setProfileSavedBanner(false), 3000);
  };

  const handleCreateCrop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropName.trim() || !fieldName.trim()) return;
    const computedStage = computeStageFromSowingDate(sowingDate);
    onAddCropCycle({
      fieldName: fieldName.trim(),
      cropName: cropName.trim(),
      varietyName: varietyName.trim() || 'सामान्य किस्म',
      areaAcres: Math.max(0.1, parseFloat(areaAcres) || 1.0),
      season,
      sowingDate,
      growthStage: computedStage,
      irrigationMethod,
      notes: '',
    });
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTitle.trim()) return;
    onAddReminder({
      cropName: remCrop.trim() || 'फसल',
      fieldName: remField.trim() || 'सामान्य खेत',
      taskTitle: remTitle.trim(),
      whySuggested: remWhy.trim() || 'किसान द्वारा निर्धारित खेत कार्य',
      dueDate: remDueDate,
      status: 'PENDING',
    });
    setRemTitle('');
    setRemWhy('');
  };

  const handleSendBrowserNotification = async () => {
    const pending = reminders.filter((r) => r.status === 'PENDING');
    const nextTask = pending[0]?.taskTitle || 'गेहूँ में CRI सिंचाई और खेत निरीक्षण';
    if (!('Notification' in window)) {
      setNotifStatus(
        isHi
          ? `अनुस्मारक अलर्ट सक्रिय: "${nextTask}" (ब्राउज़र इन-ऐप अलर्ट)`
          : `Reminder Alert Active: "${nextTask}"`
      );
      return;
    }
    if (Notification.permission === 'granted') {
      new Notification('अमौरा किसान कार्य अनुस्मारक', {
        body: nextTask,
      });
      setNotifStatus(isHi ? 'ब्राउज़र नोटिफिकेशन भेज दिया गया!' : 'Browser notification sent!');
    } else {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification('अमौरा किसान कार्य अनुस्मारक', {
          body: nextTask,
        });
        setNotifStatus(isHi ? 'नोटिफिकेशन अनुमति मिली और अलर्ट भेजा गया!' : 'Notification sent!');
      } else {
        setNotifStatus(
          isHi
            ? `इन-ऐप रिमाइंडर अलर्ट: "${nextTask}"`
            : `In-App Reminder Alert: "${nextTask}"`
        );
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 cols: Farmer Profile & Scheme Criteria Attributes */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#DCE3DC] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#1E4D2B] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#2E6F40]" />
                <span>
                  {isHi
                    ? 'किसान प्रोफ़ाइल एवं पात्रता विवरण'
                    : 'Farmer Profile & Eligibility Details'}
                </span>
              </h2>
              <p className="text-xs text-[#526556]">
                {isHi
                  ? 'बिना जबरन साइन-अप के काम करता है। यह विवरण योजनाओं और मौसम की सटीक जाँच के लिए उपयोग होता है।'
                  : 'No mandatory sign-up required. Used for accurate scheme eligibility and local weather.'}
              </p>
            </div>
          </div>

          {profileSavedBanner && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                {isHi
                  ? 'प्रोफ़ाइल सफलतापूर्वक सुरक्षित कर ली गई!'
                  : 'Profile saved successfully!'}
              </span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-3.5 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                  {isHi ? 'किसान का नाम' : 'Farmer Name'}
                </label>
                <input
                  type="text"
                  value={formProfile.farmerName}
                  onChange={(e) =>
                    setFormProfile({ ...formProfile, farmerName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                  {isHi ? 'कुल कृषि भूमि (एकड़ में)' : 'Total Land (Acres)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formProfile.landSizeAcres}
                  onChange={(e) =>
                    setFormProfile({
                      ...formProfile,
                      landSizeAcres: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                  {isHi ? 'राज्य (State)' : 'State'}
                </label>
                <input
                  type="text"
                  value={formProfile.stateName}
                  onChange={(e) =>
                    setFormProfile({ ...formProfile, stateName: e.target.value })
                  }
                  placeholder="जैसे: उत्तर प्रदेश, मध्य प्रदेश, हरियाणा..."
                  className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                  {isHi ? 'जिला (District — कोई भी भारतीय जिला लिखें)' : 'District (Any Indian District)'}
                </label>
                <input
                  type="text"
                  list="indian-districts"
                  value={formProfile.districtName}
                  onChange={(e) =>
                    setFormProfile({ ...formProfile, districtName: e.target.value })
                  }
                  placeholder="अपना जिला लिखें या चुनें..."
                  className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8]"
                />
                <datalist id="indian-districts">
                  {SUPPORTED_LOCATIONS.map((l) => (
                    <option key={l.districtEn} value={l.districtHi}>
                      {l.stateHi} - {l.districtEn}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                  {isHi ? 'सिंचाई का मुख्य स्रोत' : 'Primary Irrigation Source'}
                </label>
                <select
                  value={formProfile.irrigationType}
                  onChange={(e) =>
                    setFormProfile({ ...formProfile, irrigationType: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8] bg-white"
                >
                  <option value="सिंचाई स्रोत चुनें">-- सिंचाई स्रोत चुनें --</option>
                  <option value="ट्यूबवेल / बोरवेल (नलकूप)">ट्यूबवेल / बोरवेल (नलकूप)</option>
                  <option value="नहर (Canal)">नहर (Canal)</option>
                  <option value="कुआँ / तालाब">कुआँ / तालाब</option>
                  <option value="ड्रिप / स्प्रिंकलर">ड्रिप / स्प्रिंकलर</option>
                  <option value="वर्षा आधारित (Rainfed)">वर्षा आधारित (Rainfed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                  {isHi ? 'मिट्टी का प्रकार' : 'Soil Type'}
                </label>
                <select
                  value={formProfile.soilType}
                  onChange={(e) =>
                    setFormProfile({ ...formProfile, soilType: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8] bg-white"
                >
                  <option value="दोमट मिट्टी (Loamy)">दोमट मिट्टी (Loamy)</option>
                  <option value="काली मिट्टी (Black Cotton)">काली मिट्टी (Black Cotton)</option>
                  <option value="बलुई दोमट (Sandy Loam)">बलुई दोमट (Sandy Loam)</option>
                  <option value="मटियार / चिकनी मिट्टी (Clay)">मटियार / चिकनी मिट्टी (Clay)</option>
                </select>
              </div>
            </div>

            {/* Checkboxes for accurate scheme rule checking (Fixes Audit Point #17) */}
            <div className="p-3.5 rounded-xl bg-[#F4F8F5] border border-[#CFE0D2] space-y-2">
              <p className="text-xs font-bold text-[#1E4D2B]">
                {isHi
                  ? 'सरकारी योजना पात्रता सत्यापन बिंदु (सटीक जाँच हेतु):'
                  : 'Scheme Eligibility Verification Flags:'}
              </p>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={formProfile.hasAadhaarEkyc}
                  onChange={(e) =>
                    setFormProfile({ ...formProfile, hasAadhaarEkyc: e.target.checked })
                  }
                  className="rounded text-[#2E6F40]"
                />
                <span>
                  {isHi
                    ? 'आधार e-KYC और बैंक खाते में NPCI/DBT सीडिंग सक्रिय है'
                    : 'Aadhaar e-KYC & Bank DBT seeding is active'}
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={formProfile.hasKccCard}
                  onChange={(e) =>
                    setFormProfile({ ...formProfile, hasKccCard: e.target.checked })
                  }
                  className="rounded text-[#2E6F40]"
                />
                <span>
                  {isHi
                    ? 'मेरे पास किसान क्रेडिट कार्ड (KCC) उपलब्ध है'
                    : 'I currently hold a Kisan Credit Card (KCC)'}
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={formProfile.isIncomeTaxPayer}
                  onChange={(e) =>
                    setFormProfile({ ...formProfile, isIncomeTaxPayer: e.target.checked })
                  }
                  className="rounded text-[#2E6F40]"
                />
                <span>
                  {isHi
                    ? 'परिवार का कोई सदस्य आयकर दाता (Income Tax Payer) है'
                    : 'Member of family is an Income Tax payer'}
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs cursor-pointer pt-1 border-t border-[#DCE3DC]">
                <input
                  type="checkbox"
                  checked={formProfile.consentGiven}
                  onChange={(e) =>
                    setFormProfile({ ...formProfile, consentGiven: e.target.checked })
                  }
                  className="rounded text-[#2E6F40]"
                />
                <span className="font-semibold text-[#1E4D2B]">
                  {isHi
                    ? 'सहमति: मैं फसल डॉक्टर और सहायक के लिए फोटो व प्रश्न सर्वर-प्रोटेक्टेड Gemini AI को भेजने की अनुमति देता हूँ'
                    : 'Consent: Allow sending crop queries & photos to server-protected Gemini AI'}
                </span>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#2E6F40] hover:bg-[#1E4D2B] text-white text-xs sm:text-sm font-bold cursor-pointer transition"
              >
                {isHi ? 'प्रोफ़ाइल व पात्रता विवरण सेव करें' : 'Save Profile & Eligibility'}
              </button>

              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isHi ? 'मेरा सारा डेटा मिटाएँ' : 'Delete All My Data'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right 6 cols: Active Fields / Crop Cycles & Reminder Alerts */}
        <div className="lg:col-span-6 space-y-5">
          {/* Add Crop Cycle Card */}
          <div className="bg-white rounded-2xl border border-[#DCE3DC] p-5 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#1E4D2B] flex items-center gap-2">
              <Sprout className="w-5 h-5 text-[#2E6F40]" />
              <span>
                {isHi
                  ? `मेरे खेत और सक्रिय फसलें (${cropCycles.length})`
                  : `My Fields & Active Crops (${cropCycles.length})`}
              </span>
            </h3>

            <form onSubmit={handleCreateCrop} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder={isHi ? 'खेत का नाम (जैसे: पूर्वी खेत)' : 'Field Name'}
                className="px-3 py-2 rounded-xl border border-[#C5D3C8]"
              />
              <input
                type="text"
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                placeholder={isHi ? 'फसल (जैसे: गेहूँ)' : 'Crop Name'}
                className="px-3 py-2 rounded-xl border border-[#C5D3C8]"
              />
              <input
                type="text"
                value={varietyName}
                onChange={(e) => setVarietyName(e.target.value)}
                placeholder={isHi ? 'किस्म (जैसे: HD-2967)' : 'Variety'}
                className="px-3 py-2 rounded-xl border border-[#C5D3C8]"
              />
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={areaAcres}
                onChange={(e) => setAreaAcres(e.target.value)}
                placeholder={isHi ? 'रकबा (एकड़)' : 'Acres'}
                className="px-3 py-2 rounded-xl border border-[#C5D3C8]"
              />
              <input
                type="date"
                value={sowingDate}
                onChange={(e) => setSowingDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#C5D3C8]"
                title={isHi ? 'बुवाई की तिथि' : 'Sowing Date'}
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-[#1E4D2B] hover:bg-[#2E6F40] text-white font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isHi ? 'फसल जोड़ें' : 'Add Crop'}</span>
              </button>
            </form>

            <div className="space-y-2.5">
              {cropCycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className="p-3.5 rounded-xl bg-[#F6FAF7] border border-[#CFE0D2] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#1E4D2B] text-white">
                        {cycle.fieldName}
                      </span>
                      <span className="text-sm font-bold text-[#1E4D2B]">
                        {cycle.cropName} ({cycle.varietyName})
                      </span>
                    </div>
                    <p className="text-xs text-[#37473B] mt-1">
                      {isHi ? 'रकबा: ' : 'Area: '}
                      <strong>{cycle.areaAcres} एकड़</strong> •{' '}
                      {isHi ? 'बुवाई तिथि: ' : 'Sown: '}
                      <strong>{cycle.sowingDate}</strong>
                    </p>
                    <p className="text-xs text-[#2E6F40] font-semibold mt-0.5">
                      🌱 {computeStageFromSowingDate(cycle.sowingDate)}
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteCropCycle(cycle.id)}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                    title={isHi ? 'हटाएँ' : 'Remove'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Crop Calendar Reminders & Notification Trigger */}
          <div className="bg-white rounded-2xl border border-[#DCE3DC] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-[#1E4D2B] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#D97706]" />
                  <span>
                    {isHi ? 'खेत कार्य अनुस्मारक एवं अलर्ट' : 'Farm Task Reminders & Alerts'}
                  </span>
                </h3>
                <p className="text-xs text-[#526556]">
                  {isHi
                    ? 'बुवाई से स्वचालित रूप से बने कार्य + नया रिमाइंडर और नोटिफिकेशन जांच'
                    : 'Auto-scheduled crop tasks + custom reminders & browser alert'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSendBrowserNotification}
                className="px-3 py-1.5 rounded-xl bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border border-[#F59E0B] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{isHi ? 'अभी अलर्ट टेस्ट करें' : 'Test Reminder Alert'}</span>
              </button>
            </div>

            {notifStatus && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 font-semibold">
                🔔 {notifStatus}
              </div>
            )}

            <form onSubmit={handleCreateReminder} className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <input
                type="text"
                value={remTitle}
                onChange={(e) => setRemTitle(e.target.value)}
                placeholder={isHi ? 'कार्य का नाम (जैसे: पहली सिंचाई)...' : 'Task title...'}
                className="px-3 py-2 rounded-xl border border-[#C5D3C8] sm:col-span-2"
              />
              <input
                type="date"
                value={remDueDate}
                onChange={(e) => setRemDueDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#C5D3C8]"
              />
              <input
                type="text"
                value={remWhy}
                onChange={(e) => setRemWhy(e.target.value)}
                placeholder={isHi ? 'क्यों आवश्यक है (वैकल्पिक)...' : 'Why suggested...'}
                className="px-3 py-2 rounded-xl border border-[#C5D3C8] sm:col-span-2"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-[#2E6F40] text-white font-bold cursor-pointer"
              >
                + {isHi ? 'रिमाइंडर जोड़ें' : 'Add Reminder'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Confirm Full Data Wipe Modal (Fixes Audit Point #11) */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-red-300 shadow-xl">
            <div className="flex items-center gap-2 text-red-700 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>{isHi ? 'क्या आप अपना सारा डेटा मिटाना चाहते हैं?' : 'Delete All Your Data?'}</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              {isHi
                ? 'यह बटन आपकी किसान प्रोफ़ाइल, सभी खेत व फसलें, फसल डॉक्टर की केस हिस्ट्री (सहेजी गई फोटो सहित), खर्च/बिक्री का हिसाब, रिमाइंडर और सेव की गई AI बातचीत को पूरी तरह हटा देगा।'
                : 'This will permanently erase your profile, fields, crop cases (including photos), farm ledger transactions, reminders, and saved AI conversations.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-800 text-xs font-bold cursor-pointer"
              >
                {isHi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  onDeleteAllUserData();
                  setConfirmDeleteOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                {isHi ? 'हाँ, सब कुछ मिटाएँ' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
