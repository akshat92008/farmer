import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  CloudRain,
  Wind,
  Droplets,
  MapPin,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Flag,
  Sparkles,
  CalendarClock,
  ShieldAlert,
  Search,
} from 'lucide-react';
import {
  AssistantMessage,
  CropCycle,
  FarmerProfile,
  FarmReminder,
  FarmWeatherAdvisory,
  NavTab,
} from '../types/amaura';
import { SUPPORTED_LOCATIONS } from '../data/knowledgeBase';

interface HomeViewProps {
  profile: FarmerProfile;
  weather: FarmWeatherAdvisory | null;
  weatherLoading: boolean;
  onRefreshWeather: (customDistrict?: string) => void;
  onUpdateDistrict: (stateName: string, districtName: string) => void;
  messages: AssistantMessage[];
  assistantLoading: boolean;
  onAskQuestion: (question: string) => void;
  onFlagMessage: (message: AssistantMessage) => void;
  onSpeakText: (text: string) => void;
  reminders: FarmReminder[];
  onToggleReminder: (id: string) => void;
  cropCycles: CropCycle[];
  onNavigateTab: (tab: NavTab) => void;
  onOpenConsentModal: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  profile,
  weather,
  weatherLoading,
  onRefreshWeather,
  onUpdateDistrict,
  messages,
  assistantLoading,
  onAskQuestion,
  onFlagMessage,
  onSpeakText,
  reminders,
  onToggleReminder,
  cropCycles,
  onNavigateTab,
  onOpenConsentModal,
}) => {
  const isHi = profile.preferredLanguage === 'hi';
  const [questionInput, setQuestionInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [customCityQuery, setCustomCityQuery] = useState('');
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);

  const quickPrompts = isHi
    ? [
        'गेहूँ की पत्तियाँ पीली पड़ रही हैं, क्या जांचें?',
        'गेहूँ में पहली सिंचाई (CRI) कब और कैसे करें?',
        'सरसों में माहू (चेंपा) कीट से बचाव कैसे करें?',
        'PM-KISAN और फसल बीमा की पात्रता क्या है?',
      ]
    : [
        'Wheat leaves are turning yellow, what should I check?',
        'When to do first CRI irrigation in wheat?',
        'How to manage aphids in mustard safely?',
        'Check eligibility for PM-KISAN & Crop Insurance',
      ];

  const handleStartVoice = () => {
    setVoiceError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError(
        isHi
          ? 'आपके ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है। कृपया नीचे बॉक्स में टाइप करें।'
          : 'Browser speech recognition is not supported here. Please type your question.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = isHi ? 'hi-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => {
        setIsListening(false);
        setVoiceError(
          isHi
            ? 'आवाज़ सुनने में समस्या आई (माइक्रोफ़ोन अनुमति जांचें या टाइप करें)।'
            : 'Could not capture voice (check microphone permission or type below).'
        );
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript.trim()) {
          setQuestionInput(transcript.trim());
          onAskQuestion(transcript.trim());
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim() || assistantLoading) return;
    onAskQuestion(questionInput.trim());
    setQuestionInput('');
  };

  const handleCustomDistrictSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCityQuery.trim()) return;
    onUpdateDistrict(profile.stateName || 'भारत', customCityQuery.trim());
    onRefreshWeather(customCityQuery.trim());
    setShowDistrictPicker(false);
    setCustomCityQuery('');
  };

  const pendingReminders = reminders.filter((r) => r.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Consent & Audit Honesty Banner */}
      {!profile.consentGiven && (
        <div className="bg-[#FFFBEB] border border-[#F59E0B] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-[#78350F]">
              <span className="font-bold">
                {isHi
                  ? 'गोपनीयता सुरक्षा सक्रिय (ऑफ़लाइन नियम मोड): '
                  : 'Privacy Guard Active (Offline Reference Mode): '}
              </span>
              {isHi
                ? 'आपकी अनुमति के बिना कोई भी फोटो या खेत का डेटा बाहरी AI (Google Gemini) को नहीं भेजा जाता। लाइव AI विश्लेषण चालू करने के लिए सहमति दें।'
                : 'No photo or farm data is sent to external Gemini AI without your explicit opt-in consent.'}
            </div>
          </div>
          <button
            onClick={onOpenConsentModal}
            className="px-3.5 py-1.5 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold shrink-0 cursor-pointer transition"
          >
            {isHi ? 'AI सहमति सेटिंग्स खोलें' : 'Configure AI Consent'}
          </button>
        </div>
      )}

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Voice & AI Kisan Sahayak */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-2xl border border-[#DCE3DC] shadow-xs overflow-hidden">
            <div className="bg-[#E8F3EA] px-5 py-4 border-b border-[#DCE3DC] flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#1E4D2B] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#2E6F40]" />
                  <span>
                    {isHi
                      ? 'अमौरा किसान सहायक (बोलकर या लिखकर पूछें)'
                      : 'Amaura Kisan Assistant (Voice & Text)'}
                  </span>
                </h2>
                <p className="text-xs text-[#4A6350] mt-0.5">
                  {isHi
                    ? 'सरवर-सुरक्षित Gemini AI + स्थानीय कृषि संदर्भ नोट्स (स्पष्ट स्रोत के साथ)'
                    : 'Server-protected Gemini AI + Local Agricultural Reference Notes'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartVoice}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-[#1E4D2B] hover:bg-[#2E6F40] text-white'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>{isHi ? 'सुन रहा है...' : 'Listening...'}</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>{isHi ? 'बोलकर पूछें' : 'Speak in Hindi'}</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-5 space-y-4">
              {voiceError && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900">
                  {voiceError}
                </div>
              )}

              {/* Quick Question Chips */}
              <div>
                <p className="text-xs font-semibold text-[#526556] mb-2">
                  {isHi ? 'त्वरित प्रश्न चुनें:' : 'Quick Questions:'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => onAskQuestion(q)}
                      disabled={assistantLoading}
                      className="text-left text-xs px-3 py-1.5 rounded-lg bg-[#F3F6F3] hover:bg-[#E1EDE4] text-[#1E4D2B] border border-[#CFE0D2] transition cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSubmitQuestion} className="flex gap-2">
                <input
                  type="text"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder={
                    isHi
                      ? 'अपना कृषि प्रश्न यहाँ लिखें (जैसे: गेहूँ में पीलापन, सिंचाई, योजना)...'
                      : 'Ask a farming question (e.g., wheat yellowing, irrigation, schemes)...'
                  }
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#C5D3C8] bg-[#FAFBF9] text-sm focus:outline-none focus:border-[#2E6F40]"
                />
                <button
                  type="submit"
                  disabled={assistantLoading || !questionInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#2E6F40] hover:bg-[#1E4D2B] disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isHi ? 'पूछें' : 'Ask'}</span>
                </button>
              </form>

              {/* Conversation History */}
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {assistantLoading && (
                  <div className="p-4 rounded-xl bg-[#F3F6F3] border border-[#DCE3DC] text-xs text-[#2E6F40] font-medium flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>
                      {isHi
                        ? 'संदर्भ और सुरक्षित सलाह तैयार की जा रही है...'
                        : 'Preparing safe agricultural guidance...'}
                    </span>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl border ${
                      msg.role === 'USER'
                        ? 'bg-[#F7F9F7] border-[#DCE3DC] ml-6'
                        : 'bg-[#F0F7F2] border-[#B8D8BE]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-[#1E4D2B]">
                        {msg.role === 'USER'
                          ? isHi
                            ? 'आपका प्रश्न'
                            : 'Your Question'
                          : isHi
                          ? 'अमौरा किसान सहायक'
                          : 'Amaura Assistant'}
                      </span>
                      <div className="flex items-center gap-2">
                        {msg.role === 'ASSISTANT' && (
                          <>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                                msg.usedLiveAi
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {msg.usedLiveAi
                                ? isHi
                                  ? 'लाइव Gemini AI'
                                  : 'Live Gemini AI'
                                : isHi
                                ? 'ऑफ़लाइन संदर्भ नियम'
                                : 'Offline Reference'}
                            </span>
                            <button
                              onClick={() => onSpeakText(msg.messageText)}
                              className="p-1 rounded hover:bg-black/5 text-[#1E4D2B] cursor-pointer"
                              title={isHi ? 'उत्तर सुनें' : 'Listen to reply'}
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onFlagMessage(msg)}
                              disabled={msg.flaggedHarmful}
                              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition cursor-pointer ${
                                msg.flaggedHarmful
                                  ? 'bg-red-100 border-red-300 text-red-800'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-red-50'
                              }`}
                              title={
                                isHi
                                  ? 'असुरक्षित या गलत उत्तर को ऑडिट लॉग में रिपोर्ट करें'
                                  : 'Flag harmful or inaccurate answer to Audit Log'
                              }
                            >
                              <Flag className="w-3 h-3" />
                              <span>
                                {msg.flaggedHarmful
                                  ? isHi
                                    ? `रिपोर्ट दर्ज (${msg.flagReportId || 'LOG'})`
                                    : 'Flagged in Audit Log'
                                  : isHi
                                  ? 'गलत उत्तर रिपोर्ट करें'
                                  : 'Flag Answer'}
                              </span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {msg.fallbackNoticeHi && (
                      <div className="mb-2 px-2.5 py-1.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                        ℹ️ {msg.fallbackNoticeHi}
                      </div>
                    )}

                    <p className="text-sm text-[#1C281E] whitespace-pre-line leading-relaxed">
                      {msg.messageText}
                    </p>

                    {msg.sourceCitation && (
                      <p className="mt-2 pt-2 border-t border-[#CFE0D2] text-[11px] text-[#4A6350] font-medium">
                        {msg.sourceCitation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Crop Calendar & Active Reminders Section */}
          <div className="bg-white rounded-2xl border border-[#DCE3DC] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-[#1E4D2B] flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-[#D97706]" />
                  <span>
                    {isHi
                      ? `फसल कैलेंडर और कार्य अनुस्मारक (${pendingReminders.length} बाकी)`
                      : `Crop Calendar & Task Reminders (${pendingReminders.length} due)`}
                  </span>
                </h3>
                <p className="text-xs text-[#526556]">
                  {isHi
                    ? 'बुवाई तिथि और फसल अवस्था के अनुसार सुझाए गए कार्य'
                    : 'Tasks generated from your actual crop sowing dates'}
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('farm')}
                className="text-xs font-bold text-[#2E6F40] hover:underline cursor-pointer"
              >
                {isHi ? '+ नया कार्य / फसल जोड़ें' : '+ Manage Crops & Tasks'}
              </button>
            </div>

            {reminders.length === 0 ? (
              <p className="text-xs text-gray-500 py-3">
                {isHi
                  ? 'अभी कोई अनुस्मारक नहीं है। "मेरी खेती" में फसल जोड़ें।'
                  : 'No reminders yet. Add a crop cycle in My Farm.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {reminders.slice(0, 4).map((rem) => {
                  const done = rem.status === 'COMPLETED';
                  return (
                    <div
                      key={rem.id}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                        done
                          ? 'bg-gray-50 border-gray-200 opacity-75'
                          : 'bg-[#FAFDFB] border-[#CFE0D2]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#E8F3EA] text-[#1E4D2B]">
                            {rem.cropName}
                          </span>
                          <span className="text-xs text-[#D97706] font-semibold">
                            📅 {rem.dueDate}
                          </span>
                        </div>
                        <p
                          className={`text-sm font-semibold ${
                            done ? 'line-through text-gray-500' : 'text-[#1C281E]'
                          }`}
                        >
                          {rem.taskTitle}
                        </p>
                        <p className="text-xs text-[#526556]">{rem.whySuggested}</p>
                      </div>
                      <button
                        onClick={() => onToggleReminder(rem.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer transition ${
                          done
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-[#2E6F40] text-white hover:bg-[#1E4D2B]'
                        }`}
                      >
                        {done ? (isHi ? 'पूर्ण ✓' : 'Done ✓') : isHi ? 'पूर्ण करें' : 'Mark Done'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Live Weather & Any-District Geocoding */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl border border-[#DCE3DC] shadow-xs overflow-hidden">
            <div className="bg-[#1E4D2B] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#FBBF24]" />
                <div>
                  <h2 className="text-base font-bold leading-tight">
                    {weather?.locationLabelHi ||
                      (profile.districtName
                        ? `${profile.districtName}, ${profile.stateName}`
                        : isHi
                        ? 'जिला चुनें (मौसम सलाह)'
                        : 'Select District')}
                  </h2>
                  <p className="text-[11px] text-[#C6E2CC]">
                    {weather?.retrievedAtFormatted || (isHi ? 'लाइव Open-Meteo मौसम' : 'Live Weather')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowDistrictPicker(!showDistrictPicker)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold cursor-pointer"
                >
                  {isHi ? 'जिला बदलें' : 'Change District'}
                </button>
                <button
                  onClick={() => onRefreshWeather()}
                  disabled={weatherLoading}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 cursor-pointer"
                  title={isHi ? 'ताज़ा करें' : 'Refresh'}
                >
                  <RefreshCw className={`w-4 h-4 ${weatherLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* District Switcher & All-India Live Geocoding Search (Fixes Audit Point #3 & #16) */}
            {showDistrictPicker && (
              <div className="p-4 bg-[#F3F6F3] border-b border-[#DCE3DC] space-y-3">
                <form onSubmit={handleCustomDistrictSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={customCityQuery}
                      onChange={(e) => setCustomCityQuery(e.target.value)}
                      placeholder={
                        isHi
                          ? 'भारत का कोई भी जिला/तहसील खोजें (जैसे: Hisar, Satna, Akola)...'
                          : 'Search ANY district/town in India...'
                      }
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-[#2E6F40] text-white text-xs font-bold cursor-pointer"
                  >
                    {isHi ? 'खोजें' : 'Search'}
                  </button>
                </form>

                <div>
                  <p className="text-[11px] font-semibold text-[#526556] mb-1.5">
                    {isHi ? 'या प्रमुख कृषि जिलों में से चुनें (24 जिले):' : 'Or pick from 24 major districts:'}
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {SUPPORTED_LOCATIONS.map((loc) => (
                      <button
                        key={loc.districtEn}
                        onClick={() => {
                          onUpdateDistrict(loc.stateHi, loc.districtHi);
                          onRefreshWeather(loc.districtHi);
                          setShowDistrictPicker(false);
                        }}
                        className="px-2 py-1 rounded bg-white hover:bg-[#E8F3EA] border border-[#CFE0D2] text-[11px] font-medium text-[#1E4D2B] cursor-pointer"
                      >
                        {isHi ? `${loc.districtHi} (${loc.stateHi})` : `${loc.districtEn}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="p-5 space-y-4">
              {weather?.unconfiguredDistrictWarningHi && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p>{weather.unconfiguredDistrictWarningHi}</p>
                    <button
                      onClick={() => setShowDistrictPicker(true)}
                      className="mt-1 font-bold text-[#1E4D2B] underline cursor-pointer"
                    >
                      {isHi ? 'यहाँ क्लिक कर अपना जिला चुनें' : 'Select your district now'}
                    </button>
                  </div>
                </div>
              )}

              {/* Weather Metrics */}
              {weather && (
                <>
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#DCE3DC]">
                      <p className="text-[11px] text-[#526556] font-medium">
                        {isHi ? 'तापमान' : 'Temperature'}
                      </p>
                      <p className="text-xl font-extrabold text-[#1E4D2B] mt-0.5">
                        {weather.currentTempC.toFixed(1)}°C
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#DCE3DC]">
                      <p className="text-[11px] text-[#526556] font-medium flex items-center justify-center gap-1">
                        <CloudRain className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isHi ? '3-दिन बारिश' : '3-Day Rain'}</span>
                      </p>
                      <p className="text-xl font-extrabold text-blue-700 mt-0.5">
                        {weather.threeDayRainProbMaxPercent}%
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#DCE3DC]">
                      <p className="text-[11px] text-[#526556] font-medium flex items-center justify-center gap-1">
                        <Wind className="w-3.5 h-3.5 text-teal-700" />
                        <span>{isHi ? 'हवा / नमी' : 'Wind / Hum'}</span>
                      </p>
                      <p className="text-sm font-bold text-[#1E4D2B] mt-1">
                        {weather.windSpeedKmh} km/h • {weather.humidityPercent}%
                      </p>
                    </div>
                  </div>

                  {/* Task Recommendations with Reason Why */}
                  <div className="space-y-2.5">
                    <p className="text-xs font-bold text-[#1E4D2B]">
                      {isHi
                        ? 'मौसम आधारित खेत कार्य सलाह (कारण सहित):'
                        : 'Weather-Based Field Advisory (with Reasoning):'}
                    </p>
                    {weather.taskRecommendations.map((rec, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border ${
                          rec.isCaution
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-[#F3F8F4] border-[#C5DEC9]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1E4D2B]">
                            {rec.taskCategoryHi}
                          </span>
                          {rec.isCaution ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                              {isHi ? 'सावधानी' : 'Caution'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                              {isHi ? 'अनुकूल' : 'Favorable'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-[#1C281E] mt-1">
                          {rec.recommendationHi}
                        </p>
                        <p className="text-[11px] text-[#526556] mt-0.5">{rec.reasonWhyHi}</p>
                      </div>
                    ))}
                  </div>

                  {/* Transparent Attribution Note */}
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-600 space-y-1">
                    <p className="font-semibold text-gray-800">{weather.sourceAttributionHi}</p>
                    <p>{weather.uncertaintyNoteHi}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Action Cards to Crop Doctor & Mandi */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigateTab('advice')}
              className="p-4 rounded-2xl bg-white hover:bg-[#F3F8F4] border border-[#DCE3DC] text-left transition cursor-pointer shadow-xs"
            >
              <span className="text-xs font-bold text-[#2E6F40] block">
                {isHi ? 'फसल डॉक्टर' : 'Crop Doctor'}
              </span>
              <span className="text-sm font-bold text-[#1C281E] mt-1 block">
                {isHi ? 'पत्ती फोटो व रोग जाँच →' : 'Leaf Photo Diagnosis →'}
              </span>
              <span className="text-[11px] text-[#526556] mt-1 block">
                {isHi ? 'केस हिस्ट्री और KVK पर्ची' : 'With photo history & KVK slip'}
              </span>
            </button>

            <button
              onClick={() => onNavigateTab('accounts')}
              className="p-4 rounded-2xl bg-white hover:bg-[#F3F8F4] border border-[#DCE3DC] text-left transition cursor-pointer shadow-xs"
            >
              <span className="text-xs font-bold text-[#D97706] block">
                {isHi ? 'मंडी व खेत-वार हिसाब' : 'Mandi & Field Ledger'}
              </span>
              <span className="text-sm font-bold text-[#1C281E] mt-1 block">
                {isHi ? 'MSP तुलना व लागत →' : 'MSP & Break-Even →'}
              </span>
              <span className="text-[11px] text-[#526556] mt-1 block">
                {isHi ? 'प्रति खेत खर्च व शुद्ध आय' : 'Per-field expense tracking'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
