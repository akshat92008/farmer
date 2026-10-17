import React, { useState } from 'react';
import {
  Bell,
  Calendar,
  CheckCircle2,
  Circle,
  MapPin,
  Plus,
  Save,
  Sprout,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { SUPPORTED_LOCATIONS } from '../data/knowledgeBase';
import { CropCycle, FarmerProfile, FarmReminder } from '../types/amaura';

interface Props {
  profile: FarmerProfile;
  cropCycles: CropCycle[];
  reminders: FarmReminder[];
  onSaveProfile: (updated: FarmerProfile) => void;
  onAddCropCycle: (cycle: CropCycle, autoReminders: FarmReminder[]) => void;
  onDeleteCropCycle: (id: string) => void;
  onAddReminder: (rem: FarmReminder) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

const IRRIGATION_OPTIONS = [
  'सिंचाई स्रोत चुनें',
  'ट्यूबवेल / बोरवेल (Borewell)',
  'नहर सिंचाई (Canal)',
  'कुआँ / तालाब (Well/Pond)',
  'ड्रिप / स्प्रिंकलर (Micro Irrigation)',
  'वर्षा आधारित (Rainfed - असिंचित)',
];

const SOIL_OPTIONS = [
  'दोमट मिट्टी (Loamy)',
  'बलुई दोमट (Sandy Loam)',
  'काली मिट्टी (Black Cotton Soil)',
  'चिकनी / मटियार मिट्टी (Clay)',
  'लाल / पीली मिट्टी (Red/Yellow)',
];

export const MyFarmAndCalendarView: React.FC<Props> = ({
  profile,
  cropCycles,
  reminders,
  onSaveProfile,
  onAddCropCycle,
  onDeleteCropCycle,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
}) => {
  const [formProfile, setFormProfile] = useState<FarmerProfile>(profile);
  const [profileSavedBanner, setProfileSavedBanner] = useState(false);

  // New Crop Cycle Form
  const [fieldName, setFieldName] = useState('पूर्वी खेत (Plot-1)');
  const [cropName, setCropName] = useState('गेहूँ (Wheat)');
  const [varietyName, setVarietyName] = useState('HD-2967 / DBW-187');
  const [areaAcres, setAreaAcres] = useState('1.5');
  const [season, setSeason] = useState<'Rabi' | 'Kharif' | 'Zaid'>('Rabi');
  const [sowingDate, setSowingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 18);
    return d.toISOString().split('T')[0];
  });
  const [growthStage, setGrowthStage] = useState('CRI अवस्था (18-21 दिन)');

  // New Custom Reminder Form
  const [remTask, setRemTask] = useState('');
  const [remCrop, setRemCrop] = useState('गेहूँ (Wheat)');
  const [remDate, setRemDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [notifStatus, setNotifStatus] = useState<string | null>(null);

  const handleSaveProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      ...formProfile,
      landSizeAcres: Math.max(0, Number(formProfile.landSizeAcres) || 0),
      updatedAt: new Date().toISOString(),
    });
    setProfileSavedBanner(true);
    setTimeout(() => setProfileSavedBanner(false), 3500);
  };

  const handlePresetDistrictSelect = (val: string) => {
    if (!val) return;
    const found = SUPPORTED_LOCATIONS.find((l) => `${l.districtHi}|${l.stateHi}` === val);
    if (found) {
      setFormProfile((prev) => ({
        ...prev,
        districtName: found.districtHi,
        stateName: found.stateHi,
      }));
    }
  };

  const handleCreateCropCycle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName.trim() || !cropName.trim()) return;

    const newCycle: CropCycle = {
      id: `crop_${Date.now()}`,
      fieldName: fieldName.trim(),
      cropName: cropName.trim(),
      varietyName: varietyName.trim() || 'सामान्य',
      areaAcres: Math.max(0.1, Number(areaAcres) || 1.0),
      season,
      sowingDate,
      growthStage,
      irrigationMethod: formProfile.irrigationType,
      notes: '',
      createdAt: new Date().toISOString(),
    };

    // Generate deterministic stage-based reminders from sowingDate
    const baseDate = sowingDate ? new Date(sowingDate) : new Date();
    const addDays = (days: number) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    const generatedReminders: FarmReminder[] = [
      {
        id: `rem_${Date.now()}_1`,
        cropName: newCycle.cropName,
        fieldName: newCycle.fieldName,
        taskTitle: `${newCycle.cropName} (${newCycle.fieldName}): प्रथम सिंचाई एवं नमी जाँच (21 दिन बाद)`,
        whySuggested: `बुवाई तिथि (${sowingDate}) के 20-22 दिन बाद मुकुट जड़ (CRI) अवस्था पर हल्की सिंचाई आवश्यक होती है।`,
        dueDate: addDays(21),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
      {
        id: `rem_${Date.now()}_2`,
        cropName: newCycle.cropName,
        fieldName: newCycle.fieldName,
        taskTitle: `${newCycle.cropName} (${newCycle.fieldName}): खरपतवार एवं पत्ती स्वास्थ्य निरीक्षण (32 दिन बाद)`,
        whySuggested: 'सिंचाई के बाद ओट आने पर खरपतवार नियंत्रण और निचली पत्तियों के रंग की जाँच करें।',
        dueDate: addDays(32),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
    ];

    onAddCropCycle(newCycle, generatedReminders);
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTask.trim()) return;
    onAddReminder({
      id: `rem_${Date.now()}`,
      cropName: remCrop,
      fieldName: cropCycles[0]?.fieldName || 'सामान्य खेत',
      taskTitle: remTask.trim(),
      whySuggested: 'किसान द्वारा स्वयं जोड़ा गया कृषि कार्य अनुस्मारक',
      dueDate: remDate,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });
    setRemTask('');
  };

  const handleEnableBrowserAlerts = async () => {
    const pendingList = reminders.filter((r) => r.status === 'PENDING');
    if (!('Notification' in window)) {
      setNotifStatus(
        `ब्राउज़र अलर्ट: आपके ${pendingList.length} कार्य लंबित हैं। (इस ब्राउज़र में सिस्टम पुश नोटिफिकेशन समर्थित नहीं है, इसलिए ऐप के भीतर बैज सक्रिय है।)`
      );
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const nextTask = pendingList[0];
      new Notification('Amaura किसान कार्य अनुस्मारक', {
        body: nextTask
          ? `आगामी कार्य (${nextTask.dueDate}): ${nextTask.taskTitle}`
          : 'आपके कृषि कार्य अनुस्मारक अलर्ट सक्रिय हैं।',
      });
      setNotifStatus('ब्राउज़र अलर्ट सफलतापूर्वक सक्रिय हो गए और परीक्षण सूचना भेजी गई!');
    } else {
      setNotifStatus(
        'नोटिफिकेशन अनुमति अस्वीकार की गई — कार्य अलर्ट ऐप के होम और कैलेंडर स्क्रीन पर दिखाई देंगे।'
      );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Farmer Profile & Scheme Eligibility Attributes */}
      <div className="lg:col-span-6 space-y-6">
        <div className="rounded-xl bg-white p-5 shadow-xs border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-[#1B5E20]" />
              <h2 className="text-lg font-bold text-stone-900">
                किसान प्रोफ़ाइल एवं भूमि विवरण (My Profile)
              </h2>
            </div>
            <span className="text-[11px] bg-stone-100 text-stone-600 px-2.5 py-1 rounded">
              कोई नकली डिफ़ॉल्ट नहीं
            </span>
          </div>

          <form onSubmit={handleSaveProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  किसान का नाम
                </label>
                <input
                  type="text"
                  value={formProfile.farmerName}
                  onChange={(e) =>
                    setFormProfile({ ...formProfile, farmerName: e.target.value })
                  }
                  placeholder="अपना नाम लिखें"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  कुल कृषि भूमि (एकड़ में)
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={formProfile.landSizeAcres}
                  onChange={(e) =>
                    setFormProfile({
                      ...formProfile,
                      landSizeAcres: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* District Selector + Custom Geocodable District Input */}
            <div className="rounded-lg bg-stone-50 p-3.5 border border-stone-200 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1B5E20]">
                <MapPin className="h-4 w-4" />
                <span>स्थान चयन (मौसम और क्षेत्रीय योजनाओं के लिए)</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  त्वरित जिला सूची से चुनें (24 प्रमुख जिले) या नीचे अपना कोई भी जिला/तहसील लिखें:
                </label>
                <select
                  value=""
                  onChange={(e) => handlePresetDistrictSelect(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs"
                >
                  <option value="">-- सूची से जिला चुनें (या नीचे टाइप करें) --</option>
                  {SUPPORTED_LOCATIONS.map((loc) => (
                    <option
                      key={`${loc.districtHi}|${loc.stateHi}`}
                      value={`${loc.districtHi}|${loc.stateHi}`}
                    >
                      {loc.districtHi} ({loc.districtEn}) — {loc.stateHi}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    राज्य (State)
                  </label>
                  <input
                    type="text"
                    value={formProfile.stateName}
                    onChange={(e) =>
                      setFormProfile({ ...formProfile, stateName: e.target.value })
                    }
                    placeholder="जैसे: उत्तर प्रदेश"
                    className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    जिला / शहर (किसी भी जिले का लाइव मौसम)
                  </label>
                  <input
                    type="text"
                    value={formProfile.districtName}
                    onChange={(e) =>
                      setFormProfile({ ...formProfile, districtName: e.target.value })
                    }
                    placeholder="जैसे: कानपुर, सीहोर, हिसार..."
                    className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    गाँव / ब्लॉक
                  </label>
                  <input
                    type="text"
                    value={formProfile.villageName}
                    onChange={(e) =>
                      setFormProfile({ ...formProfile, villageName: e.target.value })
                    }
                    placeholder="गाँव का नाम"
                    className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  सिंचाई का मुख्य स्रोत
                </label>
                <select
                  value={formProfile.irrigationType}
                  onChange={(e) =>
                    setFormProfile({ ...formProfile, irrigationType: e.target.value })
                  }
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs"
                >
                  {IRRIGATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  मिट्टी का प्रकार
                </label>
                <select
                  value={formProfile.soilType}
                  onChange={(e) =>
                    setFormProfile({ ...formProfile, soilType: e.target.value })
                  }
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs"
                >
                  {SOIL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scheme Verification Checkboxes & Consent */}
            <div className="rounded-lg bg-stone-50 p-3.5 border border-stone-200 space-y-2.5 text-xs">
              <p className="font-bold text-stone-800">
                सरकारी योजना पात्रता एवं डेटा गोपनीयता सेटिंग्स:
              </p>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formProfile.hasAadhaarEkyc}
                  onChange={(e) =>
                    setFormProfile({ ...formProfile, hasAadhaarEkyc: e.target.checked })
                  }
                  className="mt-0.5 rounded border-stone-300 text-[#1B5E20]"
                />
                <span>आधार e-KYC और बैंक खाते में DBT (NPCI) सीडिंग सक्रिय है</span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formProfile.hasKccCard}
                  onChange={(e) =>
                    setFormProfile({ ...formProfile, hasKccCard: e.target.checked })
                  }
                  className="mt-0.5 rounded border-stone-300 text-[#1B5E20]"
                />
                <span>मेरे पास किसान क्रेडिट कार्ड (KCC) उपलब्ध है</span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formProfile.isIncomeTaxPayer}
                  onChange={(e) =>
                    setFormProfile({ ...formProfile, isIncomeTaxPayer: e.target.checked })
                  }
                  className="mt-0.5 rounded border-stone-300 text-[#1B5E20]"
                />
                <span>परिवार का कोई सदस्य आयकर दाता (Income Tax Payer) है</span>
              </label>

              <div className="pt-2 border-t border-stone-200">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formProfile.consentGiven}
                    onChange={(e) =>
                      setFormProfile({ ...formProfile, consentGiven: e.target.checked })
                    }
                    className="mt-0.5 rounded border-stone-300 text-[#1B5E20]"
                  />
                  <span className="font-medium text-stone-900">
                    <strong>स्पष्ट AI सहमति (Explicit Consent):</strong> मैं अपने कृषि प्रश्न, जिले का नाम और फसल फोटो को प्राथमिक विश्लेषण हेतु सर्वर-सुरक्षित Gemini AI को भेजने की सहमति देता हूँ। (बंद रखने पर ऐप केवल ऑफ़लाइन स्थानीय नियमों का उपयोग करेगा।)
                  </span>
                </label>
              </div>
            </div>

            {profileSavedBanner && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-2.5 text-xs font-semibold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                प्रोफ़ाइल, जिला और सहमति प्राथमिकताएँ सुरक्षित कर दी गईं!
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#1B5E20] hover:bg-[#144718] px-4 py-2.5 text-sm font-bold text-white transition cursor-pointer"
            >
              <Save className="h-4 w-4" />
              प्रोफ़ाइल सुरक्षित करें (Save Profile)
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Active Crops & Crop Calendar Reminders */}
      <div className="lg:col-span-6 space-y-6">
        {/* Active Crop Cycles */}
        <div className="rounded-xl bg-white p-5 shadow-xs border border-stone-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Sprout className="h-5 w-5 text-[#1B5E20]" />
              सक्रिय खेत एवं फसल चक्र ({cropCycles.length})
            </h2>
          </div>

          <form
            onSubmit={handleCreateCropCycle}
            className="rounded-lg bg-stone-50 p-3.5 border border-stone-200 space-y-3"
          >
            <p className="text-xs font-bold text-stone-800">
              + नया खेत / फसल जोड़ें (साथ में सिंचाई व निरीक्षण रिमाइंडर स्वतः बनेंगे):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="खेत का नाम (जैसे: पूर्वी खेत)"
                className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
              />
              <input
                type="text"
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                placeholder="फसल (जैसे: गेहूँ)"
                className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
              />
              <input
                type="text"
                value={varietyName}
                onChange={(e) => setVarietyName(e.target.value)}
                placeholder="किस्म (जैसे: HD-2967)"
                className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10px] text-stone-500">रकबा (एकड़)</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.1"
                  value={areaAcres}
                  onChange={(e) => setAreaAcres(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-stone-500">सीजन</label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value as 'Rabi' | 'Kharif' | 'Zaid')}
                  className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs"
                >
                  <option value="Rabi">रबी (Rabi)</option>
                  <option value="Kharif">खरीफ (Kharif)</option>
                  <option value="Zaid">जायद (Zaid)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-stone-500">बुवाई तिथि</label>
                <input
                  type="date"
                  value={sowingDate}
                  onChange={(e) => setSowingDate(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-stone-500">वर्तमान अवस्था</label>
                <input
                  type="text"
                  value={growthStage}
                  onChange={(e) => setGrowthStage(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2E7D32] hover:bg-[#1B5E20] px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              फसल चक्र और कैलेंडर रिमाइंडर जोड़ें
            </button>
          </form>

          {cropCycles.length === 0 ? (
            <p className="text-xs text-stone-500 text-center py-3">
              अभी कोई फसल दर्ज नहीं है। ऊपर फॉर्म से अपनी पहली फसल जोड़ें।
            </p>
          ) : (
            <div className="space-y-2.5">
              {cropCycles.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50/70 p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-stone-900">{c.cropName}</span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                        {c.fieldName} ({c.areaAcres} एकड़)
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5">
                      किस्म: {c.varietyName} • बुवाई: {c.sowingDate} • अवस्था: {c.growthStage}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteCropCycle(c.id)}
                    className="text-stone-400 hover:text-red-700 p-1"
                    title="हटाएँ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Crop Calendar & Actionable Reminders with Notification Trigger */}
        <div className="rounded-xl bg-white p-5 shadow-xs border border-stone-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#1B5E20]" />
              फसल कैलेंडर एवं कार्य रिमाइंडर ({reminders.length})
            </h2>
            <button
              type="button"
              onClick={handleEnableBrowserAlerts}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 px-3 py-1.5 text-xs font-semibold cursor-pointer"
            >
              <Bell className="h-3.5 w-3.5" />
              अलर्ट सूचना जाँचें / चालू करें
            </button>
          </div>

          {notifStatus && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-950">
              🔔 {notifStatus}
            </div>
          )}

          <form onSubmit={handleCreateReminder} className="flex flex-wrap gap-2">
            <input
              type="text"
              value={remTask}
              onChange={(e) => setRemTask(e.target.value)}
              placeholder="नया कार्य लिखें (जैसे: ओट आने पर यूरिया टॉप-ड्रेसिंग)..."
              className="flex-1 min-w-[200px] rounded-lg border border-stone-300 px-3 py-1.5 text-xs"
            />
            <input
              type="date"
              value={remDate}
              onChange={(e) => setRemDate(e.target.value)}
              className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#1B5E20] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#144718] cursor-pointer"
            >
              + जोड़ें
            </button>
          </form>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {reminders.length === 0 ? (
              <p className="text-xs text-stone-500 text-center py-4">
                कोई कार्य अनुस्मारक नहीं है।
              </p>
            ) : (
              reminders.map((rem) => (
                <div
                  key={rem.id}
                  className={`flex items-start justify-between gap-2.5 rounded-lg border p-3 ${
                    rem.status === 'COMPLETED'
                      ? 'bg-stone-50 border-stone-200 opacity-75'
                      : 'bg-[#FFFDF9] border-amber-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleReminder(rem.id)}
                    className="mt-0.5 text-[#1B5E20] shrink-0 cursor-pointer"
                  >
                    {rem.status === 'COMPLETED' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    ) : (
                      <Circle className="h-4 w-4 text-amber-700" />
                    )}
                  </button>
                  <div className="flex-1 text-xs">
                    <p
                      className={`font-bold ${
                        rem.status === 'COMPLETED'
                          ? 'line-through text-stone-500'
                          : 'text-stone-900'
                      }`}
                    >
                      {rem.taskTitle}
                    </p>
                    <p className="text-stone-600 mt-0.5">{rem.whySuggested}</p>
                    <p className="text-[11px] font-semibold text-amber-900 mt-1">
                      निर्धारित तिथि: {rem.dueDate} • खेत: {rem.fieldName || rem.cropName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteReminder(rem.id)}
                    className="text-stone-400 hover:text-red-700 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
