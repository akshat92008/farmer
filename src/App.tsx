import React, { useState, useEffect, useCallback } from 'react';
import {
  AssistantMessage,
  CropCase,
  CropCycle,
  FarmerProfile,
  FarmReminder,
  FarmTransaction,
  FarmWeatherAdvisory,
  NavTab,
} from './types/amaura';
import {
  buildOfflineAssistantReply,
  buildOfflineCropDiagnosis,
  CROP_GUIDANCE_LIBRARY,
  fetchLiveWeatherForProfile,
} from './data/knowledgeBase';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { AdviceView } from './components/AdviceView';
import { MyFarmView } from './components/MyFarmView';
import { AccountsMandiView } from './components/AccountsMandiView';
import { SchemesView } from './components/SchemesView';
import {
  EscalatedTicketClient,
  ExpertAdminModal,
  FlaggedMessageTicketClient,
} from './components/ExpertAdminModal';
import { ShieldCheck, ShieldAlert, X } from 'lucide-react';

const STORAGE_KEYS = {
  PROFILE: 'amaura_v2_profile',
  CROPS: 'amaura_v2_crops',
  CASES: 'amaura_v2_cases',
  TXS: 'amaura_v2_transactions',
  REMINDERS: 'amaura_v2_reminders',
  MESSAGES: 'amaura_v2_messages',
};

function getPastDateString(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toISOString().slice(0, 10);
}

function getFutureDateString(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86400000);
  return d.toISOString().slice(0, 10);
}

// Audit Fix #9 & #16: Default profile does NOT assume consent (consentGiven: false) and does NOT silently pretend district is Varanasi
const INITIAL_PROFILE: FarmerProfile = {
  id: 'local-farmer-1',
  farmerName: 'किसान साथी',
  preferredLanguage: 'hi',
  voiceEnabled: true,
  stateName: 'उत्तर प्रदेश',
  districtName: '', // Empty until selected by farmer
  villageName: '',
  landSizeAcres: 2.0,
  irrigationType: 'ट्यूबवेल / बोरवेल (नलकूप)',
  soilType: 'दोमट मिट्टी (Loamy)',
  consentGiven: false, // Explicit opt-in required!
  hasAadhaarEkyc: true,
  isIncomeTaxPayer: false,
  hasKccCard: false,
  authMode: 'LOCAL_GUEST',
};

// Audit Fix #19: Sowing date is 21 days in the past (not in the future!) matching the CRI 21-day stage
const INITIAL_CROPS: CropCycle[] = [
  {
    id: 'crop-1',
    fieldName: 'पूर्वी खेत (Plot-1)',
    cropName: 'गेहूँ (Wheat)',
    varietyName: 'HD-2967',
    areaAcres: 1.5,
    season: 'Rabi',
    sowingDate: getPastDateString(21),
    growthStage: 'CRI / कल्ले निकलने की अवस्था (21 दिन पूरे)',
    irrigationMethod: 'ट्यूबवेल / बोरवेल (नलकूप)',
    notes: '',
  },
  {
    id: 'crop-2',
    fieldName: 'पश्चिमी नलकूप खेत (Plot-2)',
    cropName: 'सरसों (Mustard)',
    varietyName: 'Pusa Bold',
    areaAcres: 0.5,
    season: 'Rabi',
    sowingDate: getPastDateString(38),
    growthStage: 'फूल एवं फली प्रारंभ अवस्था (38 दिन पूरे)',
    irrigationMethod: 'ट्यूबवेल / बोरवेल (नलकूप)',
    notes: '',
  },
];

const INITIAL_TXS: FarmTransaction[] = [
  {
    id: 'tx-1',
    txType: 'EXPENSE',
    category: 'बीज एवं बुवाई (Seeds)',
    cropName: 'गेहूँ (Wheat)',
    fieldName: 'पूर्वी खेत (Plot-1)',
    title: 'प्रमाणित गेहूँ बीज (HD-2967) व बीजोपचार',
    amountInr: 2450,
    quantityQuintal: 0,
    txDate: getPastDateString(21),
  },
  {
    id: 'tx-2',
    txType: 'EXPENSE',
    category: 'खाद एवं उर्वरक (Fertilizer)',
    cropName: 'गेहूँ (Wheat)',
    fieldName: 'पूर्वी खेत (Plot-1)',
    title: 'डीएपी (DAP) एवं पोटाश बेसल डोज़',
    amountInr: 3100,
    quantityQuintal: 0,
    txDate: getPastDateString(20),
  },
  {
    id: 'tx-3',
    txType: 'EXPENSE',
    category: 'बीज एवं बुवाई (Seeds)',
    cropName: 'सरसों (Mustard)',
    fieldName: 'पश्चिमी नलकूप खेत (Plot-2)',
    title: 'सरसों बीज व जुताई खर्च',
    amountInr: 1400,
    quantityQuintal: 0,
    txDate: getPastDateString(38),
  },
];

const INITIAL_REMINDERS: FarmReminder[] = [
  {
    id: 'rem-1',
    cropName: 'गेहूँ (Wheat)',
    fieldName: 'पूर्वी खेत (Plot-1)',
    taskTitle: 'गेहूँ में पहली सिंचाई (CRI अवस्था — बुवाई के 21वें दिन)',
    whySuggested:
      'बुवाई को 21 दिन पूरे हो गए हैं; मुकुट जड़ (CRI) अवस्था पर हल्की सिंचाई करने से कल्ले अच्छे निकलते हैं।',
    dueDate: getFutureDateString(0),
    status: 'PENDING',
  },
  {
    id: 'rem-2',
    cropName: 'सरसों (Mustard)',
    fieldName: 'पश्चिमी नलकूप खेत (Plot-2)',
    taskTitle: 'सरसों की ऊपरी टहनियों पर माहू (चेपा) कीट का निरीक्षण',
    whySuggested:
      'बुवाई के 35-45 दिन बाद फूल आते समय माहू कीट की शुरुआती निगरानी से बिना तेज़ रसायन के बचाव संभव है।',
    dueDate: getFutureDateString(2),
    status: 'PENDING',
  },
];

const INITIAL_MESSAGES: AssistantMessage[] = [
  {
    id: 'msg-welcome',
    role: 'ASSISTANT',
    topic: 'WELCOME',
    messageText:
      'नमस्ते किसान साथी! मैं अमौरा कृषि सहायक हूँ।\n\n• आपकी गोपनीयता के लिए डेटा सहमति डिफ़ॉल्ट रूप से बंद (ऑफ़लाइन मोड) रखी गई है।\n• आप ऊपर से अपना जिला चुनकर लाइव मौसम, "फसल डॉक्टर" में पत्ती की फोटो जाँच, "हिसाब व मंडी" में खेत-वार खर्च व MSP तुलना, और "योजनाएँ" में 7 सरकारी योजनाओं की पात्रता देख सकते हैं।',
    sourceCitation: 'स्रोत: अमौरा पारदर्शी कृषि प्रणाली (सहायता: किसान कॉल सेंटर 1800-180-1551)',
    usedLiveAi: false,
    flaggedHarmful: false,
    createdAt: new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }),
  },
];

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  const [profile, setProfile] = useState<FarmerProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved ? JSON.parse(saved) : INITIAL_PROFILE;
    } catch {
      return INITIAL_PROFILE;
    }
  });

  const [cropCycles, setCropCycles] = useState<CropCycle[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CROPS);
      return saved ? JSON.parse(saved) : INITIAL_CROPS;
    } catch {
      return INITIAL_CROPS;
    }
  });

  const [cropCases, setCropCases] = useState<CropCase[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CASES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [transactions, setTransactions] = useState<FarmTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TXS);
      return saved ? JSON.parse(saved) : INITIAL_TXS;
    } catch {
      return INITIAL_TXS;
    }
  });

  const [reminders, setReminders] = useState<FarmReminder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REMINDERS);
      return saved ? JSON.parse(saved) : INITIAL_REMINDERS;
    } catch {
      return INITIAL_REMINDERS;
    }
  });

  const [messages, setMessages] = useState<AssistantMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
    } catch {
      return INITIAL_MESSAGES;
    }
  });

  const [weather, setWeather] = useState<FarmWeatherAdvisory | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [doctorAnalyzing, setDoctorAnalyzing] = useState(false);
  const [doctorErrorBanner, setDoctorErrorBanner] = useState<string | null>(null);

  // Server status & KVK Queue state
  const [geminiConfiguredOnServer, setGeminiConfiguredOnServer] = useState(false);
  const [remainingAiQuota, setRemainingAiQuota] = useState(15);
  const [kvkTickets, setKvkTickets] = useState<EscalatedTicketClient[]>([]);
  const [flaggedReports, setFlaggedReports] = useState<FlaggedMessageTicketClient[]>([]);

  // Modals
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [kvkAdminModalOpen, setKvkAdminModalOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch {}
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CROPS, JSON.stringify(cropCycles));
    } catch {}
  }, [cropCycles]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(cropCases));
    } catch {}
  }, [cropCases]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
    } catch {}
  }, [reminders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  const loadServerStatusAndQueue = useCallback(async () => {
    try {
      const [statusRes, queueRes] = await Promise.all([
        fetch('/api/ai/status'),
        fetch('/api/kvk-queue'),
      ]);
      if (statusRes.ok) {
        const s = await statusRes.json();
        setGeminiConfiguredOnServer(Boolean(s.geminiConfiguredOnServer));
        if (typeof s.remainingHourlyQuota === 'number') {
          setRemainingAiQuota(s.remainingHourlyQuota);
        }
      }
      if (queueRes.ok) {
        const q = await queueRes.json();
        if (Array.isArray(q.tickets)) setKvkTickets(q.tickets);
        if (Array.isArray(q.flaggedReports)) setFlaggedReports(q.flaggedReports);
      }
    } catch {
      // Offline mode
    }
  }, []);

  const loadWeather = useCallback(
    async (customDistrict?: string) => {
      setWeatherLoading(true);
      try {
        const adv = await fetchLiveWeatherForProfile(profile, customDistrict);
        setWeather(adv);
      } finally {
        setWeatherLoading(false);
      }
    },
    [profile]
  );

  useEffect(() => {
    loadWeather();
    loadServerStatusAndQueue();
  }, [loadWeather, loadServerStatusAndQueue]);

  // Spoken Audio (Web Speech Synthesis)
  const speakText = useCallback(
    (text: string) => {
      if (!('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = profile.preferredLanguage === 'hi' ? 'hi-IN' : 'en-IN';
        utter.rate = 0.95;
        window.speechSynthesis.speak(utter);
      } catch {}
    },
    [profile.preferredLanguage]
  );

  // Ask Agricultural Assistant
  const handleAskQuestion = async (question: string) => {
    const nowTime = new Date().toLocaleTimeString('hi-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'USER',
      topic: 'GENERAL',
      messageText: question,
      sourceCitation: '',
      usedLiveAi: false,
      flaggedHarmful: false,
      createdAt: nowTime,
    };

    setMessages((prev) => [userMsg, ...prev]);
    setAssistantLoading(true);

    // Find matching local reference snippet to ground the answer
    const qLower = question.toLowerCase();
    const matchingArt = CROP_GUIDANCE_LIBRARY.find(
      (art) =>
        qLower.includes(art.cropHi.split(' ')[0].toLowerCase()) ||
        art.titleHi
          .toLowerCase()
          .split(' ')
          .some((w) => w.length > 3 && qLower.includes(w))
    );
    const localReferenceSnippet = matchingArt
      ? `${matchingArt.sourceOrg}: ${matchingArt.summaryHi} सुरक्षित कदम: ${matchingArt.cautiousStepsHi.join('; ')}`
      : '';

    const farmContext = `किसान: ${profile.farmerName}, जिला: ${
      profile.districtName || 'अज्ञात'
    }, भूमि: ${profile.landSizeAcres} एकड़, फसलें: ${cropCycles
      .map((c) => `${c.cropName} (${c.fieldName})`)
      .join(', ')}`;

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          consentGiven: profile.consentGiven,
          farmContext,
          localReferenceSnippet,
          language: profile.preferredLanguage,
        }),
      });

      const data = await res.json();
      if (typeof data.remainingQuota === 'number') {
        setRemainingAiQuota(data.remainingQuota);
      }

      if (data.usedLiveAi && data.replyText) {
        const aiMsg: AssistantMessage = {
          id: `ai-${Date.now()}`,
          role: 'ASSISTANT',
          topic: 'AI',
          messageText: data.replyText,
          sourceCitation: data.sourceCitation,
          usedLiveAi: true,
          fallbackNoticeHi: data.fallbackNoticeHi || null,
          flaggedHarmful: false,
          createdAt: nowTime,
        };
        setMessages((prev) => [aiMsg, ...prev]);
        if (profile.voiceEnabled) speakText(data.replyText);
      } else {
        const offline = buildOfflineAssistantReply(question);
        const fallbackMsg: AssistantMessage = {
          id: `offline-${Date.now()}`,
          role: 'ASSISTANT',
          topic: 'OFFLINE_REF',
          messageText: offline.replyText,
          sourceCitation: offline.sourceCitation,
          usedLiveAi: false,
          fallbackNoticeHi: data.fallbackNoticeHi || null,
          flaggedHarmful: false,
          createdAt: nowTime,
        };
        setMessages((prev) => [fallbackMsg, ...prev]);
        if (profile.voiceEnabled) speakText(offline.replyText);
      }
    } catch (err: any) {
      const offline = buildOfflineAssistantReply(question);
      const fallbackMsg: AssistantMessage = {
        id: `offline-${Date.now()}`,
        role: 'ASSISTANT',
        topic: 'OFFLINE_REF',
        messageText: offline.replyText,
        sourceCitation: offline.sourceCitation,
        usedLiveAi: false,
        fallbackNoticeHi:
          'नेटवर्क त्रुटि के कारण सर्वर से संपर्क नहीं हो सका — ऑफ़लाइन कृषि संदर्भ पुस्तकालय से उत्तर दिखाया गया है।',
        flaggedHarmful: false,
        createdAt: nowTime,
      };
      setMessages((prev) => [fallbackMsg, ...prev]);
    } finally {
      setAssistantLoading(false);
    }
  };

  // Flag Harmful/Inaccurate Answer to Real Backend Audit Log
  const handleFlagMessage = async (msg: AssistantMessage) => {
    try {
      const res = await fetch('/api/flag-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: msg.id,
          questionText: 'किसान सहायक संवाद',
          aiReplyText: msg.messageText,
          reasonHi: 'किसान द्वारा संदिग्ध/असुरक्षित उत्तर के रूप में चिह्नित',
        }),
      });
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                flaggedHarmful: true,
                flagReportId: data.report?.reportId || 'FLAG',
                fallbackNoticeHi: data.honestDisclosureHi,
              }
            : m
        )
      );
      loadServerStatusAndQueue();
    } catch {}
  };

  // Run Crop Doctor Analysis
  const handleRunCropDoctor = async (payload: {
    cropName: string;
    growthStage: string;
    symptoms: string;
    spreadScope: string;
    photoAnalysisBase64: string;
    photoThumbnailBase64: string;
    photoResolutionLabel: string;
    isLowResPhoto: boolean;
  }) => {
    setDoctorAnalyzing(true);
    setDoctorErrorBanner(null);

    const nowFormatted = new Date().toLocaleDateString('hi-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      const res = await fetch('/api/ai/crop-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropName: payload.cropName,
          growthStage: payload.growthStage,
          symptoms: payload.symptoms,
          spreadScope: payload.spreadScope,
          districtName: profile.districtName,
          stateName: profile.stateName,
          photoBase64: payload.photoAnalysisBase64,
          photoMimeType: 'image/jpeg',
          isLowResPhoto: payload.isLowResPhoto,
          consentGiven: profile.consentGiven,
        }),
      });

      const data = await res.json();
      if (typeof data.remainingQuota === 'number') {
        setRemainingAiQuota(data.remainingQuota);
      }

      if (data.fallbackNoticeHi) {
        setDoctorErrorBanner(data.fallbackNoticeHi);
      }

      if (data.usedLiveAi && data.likelyCauses) {
        const newCase: CropCase = {
          id: `case-${Date.now()}`,
          cropName: payload.cropName,
          growthStage: payload.growthStage,
          symptoms: payload.symptoms,
          spreadScope: payload.spreadScope,
          likelyCauses: data.likelyCauses,
          confidenceLevel: data.confidenceLevel || 'LOW',
          safeNextSteps: data.safeNextSteps,
          expertStatus: 'NONE',
          expertNotes: '',
          photoBase64: payload.photoThumbnailBase64,
          photoResolutionLabel: payload.photoResolutionLabel,
          sourceLabelHi:
            'स्रोत: Gemini 3.8 Flash मल्टीमॉडल विश्लेषण (आधिकारिक वैज्ञानिक प्रमाणपत्र नहीं — खेत में पुष्टि करें)',
          createdAt: nowFormatted,
        };
        setCropCases((prev) => [newCase, ...prev]);
        if (profile.voiceEnabled) {
          speakText(`${payload.cropName} विश्लेषण परिणाम: ${data.likelyCauses}`);
        }
      } else {
        const offlineDiag = buildOfflineCropDiagnosis(
          payload.cropName,
          payload.growthStage,
          payload.symptoms,
          payload.spreadScope,
          Boolean(payload.photoThumbnailBase64) && !payload.isLowResPhoto
        );
        const newCase: CropCase = {
          id: `case-${Date.now()}`,
          cropName: payload.cropName,
          growthStage: payload.growthStage,
          symptoms: payload.symptoms,
          spreadScope: payload.spreadScope,
          likelyCauses: offlineDiag.likelyCauses,
          confidenceLevel: payload.isLowResPhoto ? 'LOW' : offlineDiag.confidenceLevel,
          safeNextSteps: offlineDiag.safeNextSteps,
          expertStatus: 'NONE',
          expertNotes: '',
          photoBase64: payload.photoThumbnailBase64,
          photoResolutionLabel: payload.photoResolutionLabel,
          sourceLabelHi:
            'स्रोत: अमौरा ऑफ़लाइन स्थानीय कृषि संदर्भ पुस्तकालय (ICAR/KVK मानकों पर आधारित प्राथमिक नियम)',
          createdAt: nowFormatted,
        };
        setCropCases((prev) => [newCase, ...prev]);
        if (profile.voiceEnabled) {
          speakText(`${payload.cropName} सुरक्षित सलाह: ${offlineDiag.likelyCauses}`);
        }
      }
    } catch {
      setDoctorErrorBanner(
        'सर्वर से संपर्क नहीं हो सका — ऑफ़लाइन स्थानीय कृषि संदर्भ पुस्तकालय से प्राथमिक विश्लेषण किया गया।'
      );
      const offlineDiag = buildOfflineCropDiagnosis(
        payload.cropName,
        payload.growthStage,
        payload.symptoms,
        payload.spreadScope,
        Boolean(payload.photoThumbnailBase64) && !payload.isLowResPhoto
      );
      const newCase: CropCase = {
        id: `case-${Date.now()}`,
        cropName: payload.cropName,
        growthStage: payload.growthStage,
        symptoms: payload.symptoms,
        spreadScope: payload.spreadScope,
        likelyCauses: offlineDiag.likelyCauses,
        confidenceLevel: 'LOW',
        safeNextSteps: offlineDiag.safeNextSteps,
        expertStatus: 'NONE',
        expertNotes: '',
        photoBase64: payload.photoThumbnailBase64,
        sourceLabelHi: 'स्रोत: ऑफ़लाइन स्थानीय कृषि संदर्भ पुस्तकालय',
        createdAt: nowFormatted,
      };
      setCropCases((prev) => [newCase, ...prev]);
    } finally {
      setDoctorAnalyzing(false);
    }
  };

  // Escalate Case to Real Backend KVK Review Queue (Fixes Audit Point #1)
  const handleEscalateToKvk = async (cropCase: CropCase) => {
    try {
      const res = await fetch('/api/kvk-escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: cropCase.id,
          farmerName: profile.farmerName,
          district: profile.districtName || 'अज्ञात जिला',
          state: profile.stateName || 'भारत',
          cropName: cropCase.cropName,
          growthStage: cropCase.growthStage,
          symptoms: cropCase.symptoms,
          spreadScope: cropCase.spreadScope,
          aiLikelyCauses: cropCase.likelyCauses,
          aiConfidence: cropCase.confidenceLevel,
          photoBase64: cropCase.photoBase64,
        }),
      });
      const data = await res.json();
      const ticketId = data.ticket?.ticketId || 'KVK-QUEUE';
      const disclosure =
        data.honestDisclosureHi ||
        'ऐप समीक्षा कतार में दर्ज। तुरंत सरकारी विशेषज्ञ से बात करने के लिए 1800-180-1551 पर कॉल करें।';

      setCropCases((prev) =>
        prev.map((c) =>
          c.id === cropCase.id
            ? {
                ...c,
                expertStatus: 'QUEUED_FOR_KVK',
                expertTicketId: ticketId,
                expertNotes: disclosure,
              }
            : c
        )
      );
      await loadServerStatusAndQueue();
    } catch {}
  };

  // Submit Scientist Review from KVK Reviewer Modal
  const handleSubmitScientistReview = async (
    ticketId: string,
    caseId: string,
    scientistName: string,
    scientistResponseHi: string
  ) => {
    try {
      await fetch('/api/kvk-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          scientistName,
          scientistResponseHi,
          status: 'REVIEWED',
        }),
      });

      setCropCases((prev) =>
        prev.map((c) =>
          c.id === caseId || c.expertTicketId === ticketId
            ? {
                ...c,
                expertStatus: 'REVIEWED',
                expertNotes: `${scientistName}: ${scientistResponseHi}`,
              }
            : c
        )
      );
      await loadServerStatusAndQueue();
    } catch {}
  };

  // Complete Data Deletion (Fixes Audit Point #11)
  const handleDeleteAllUserData = async () => {
    Object.values(STORAGE_KEYS).forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
    try {
      await fetch('/api/user-data', { method: 'DELETE' });
    } catch {}

    setProfile({
      ...INITIAL_PROFILE,
      farmerName: 'किसान साथी',
      districtName: '',
      landSizeAcres: 0,
      consentGiven: false,
    });
    setCropCycles([]);
    setCropCases([]);
    setTransactions([]);
    setReminders([]);
    setMessages([
      {
        id: `msg-wiped-${Date.now()}`,
        role: 'ASSISTANT',
        topic: 'PRIVACY',
        messageText:
          'आपका सारा व्यक्तिगत डेटा, खेत विवरण, फोटो, हिसाब और पुराना चैट इतिहास पूरी तरह मिटा दिया गया है।',
        sourceCitation: 'गोपनीयता सुरक्षा प्रणाली',
        usedLiveAi: false,
        flaggedHarmful: false,
        createdAt: new Date().toLocaleTimeString('hi-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
    setActiveTab('home');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F5EE] text-[#1C281E]">
      <Navbar
        profile={profile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onToggleLanguage={() =>
          setProfile((p) => ({
            ...p,
            preferredLanguage: p.preferredLanguage === 'hi' ? 'en' : 'hi',
          }))
        }
        onToggleVoice={() =>
          setProfile((p) => ({ ...p, voiceEnabled: !p.voiceEnabled }))
        }
        onOpenConsentModal={() => setConsentModalOpen(true)}
        onOpenKvkAdminModal={() => {
          loadServerStatusAndQueue();
          setKvkAdminModalOpen(true);
        }}
        kvkQueueCount={kvkTickets.length}
        remainingAiQuota={remainingAiQuota}
      />

      <main className="max-w-6xl w-full mx-auto px-4 py-6 flex-1">
        {activeTab === 'home' && (
          <HomeView
            profile={profile}
            weather={weather}
            weatherLoading={weatherLoading}
            onRefreshWeather={(customDistrict) => loadWeather(customDistrict)}
            onUpdateDistrict={(stateName, districtName) =>
              setProfile((prev) => ({ ...prev, stateName, districtName }))
            }
            messages={messages}
            assistantLoading={assistantLoading}
            onAskQuestion={handleAskQuestion}
            onFlagMessage={handleFlagMessage}
            onSpeakText={speakText}
            reminders={reminders}
            onToggleReminder={(id) =>
              setReminders((prev) =>
                prev.map((r) =>
                  r.id === id
                    ? { ...r, status: r.status === 'PENDING' ? 'COMPLETED' : 'PENDING' }
                    : r
                )
              )
            }
            cropCycles={cropCycles}
            onNavigateTab={setActiveTab}
            onOpenConsentModal={() => setConsentModalOpen(true)}
          />
        )}

        {activeTab === 'advice' && (
          <AdviceView
            profile={profile}
            cropCycles={cropCycles}
            cropCases={cropCases}
            analyzing={doctorAnalyzing}
            errorBanner={doctorErrorBanner}
            onRunCropDoctor={handleRunCropDoctor}
            onEscalateToKvk={handleEscalateToKvk}
            onSpeakText={speakText}
            onOpenKvkAdminModal={() => {
              loadServerStatusAndQueue();
              setKvkAdminModalOpen(true);
            }}
          />
        )}

        {activeTab === 'farm' && (
          <MyFarmView
            profile={profile}
            onSaveProfile={(updated) => setProfile(updated)}
            cropCycles={cropCycles}
            onAddCropCycle={(cycle) => {
              const id = `crop-${Date.now()}`;
              setCropCycles((prev) => [{ ...cycle, id }, ...prev]);
              // Auto-create a stage reminder for the new crop cycle
              setReminders((prev) => [
                {
                  id: `rem-${Date.now()}`,
                  cropName: cycle.cropName,
                  fieldName: cycle.fieldName,
                  taskTitle: `${cycle.cropName} (${cycle.fieldName}) — नमी एवं शुरुआती सिंचाई जाँच`,
                  whySuggested: `बुवाई तिथि (${cycle.sowingDate}) के अनुसार खेत निरीक्षण अनुस्मारक।`,
                  dueDate: getFutureDateString(3),
                  status: 'PENDING',
                },
                ...prev,
              ]);
            }}
            onDeleteCropCycle={(id) =>
              setCropCycles((prev) => prev.filter((c) => c.id !== id))
            }
            reminders={reminders}
            onAddReminder={(rem) =>
              setReminders((prev) => [{ ...rem, id: `rem-${Date.now()}` }, ...prev])
            }
            onToggleReminder={(id) =>
              setReminders((prev) =>
                prev.map((r) =>
                  r.id === id
                    ? { ...r, status: r.status === 'PENDING' ? 'COMPLETED' : 'PENDING' }
                    : r
                )
              )
            }
            onDeleteAllUserData={handleDeleteAllUserData}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsMandiView
            profile={profile}
            cropCycles={cropCycles}
            transactions={transactions}
            onAddTransaction={(tx) =>
              setTransactions((prev) => [{ ...tx, id: `tx-${Date.now()}` }, ...prev])
            }
            onDeleteTransaction={(id) =>
              setTransactions((prev) => prev.filter((t) => t.id !== id))
            }
          />
        )}

        {activeTab === 'schemes' && (
          <SchemesView
            profile={profile}
            cropCycles={cropCycles}
            onSaveProfile={(updated) => setProfile(updated)}
            onSpeakText={speakText}
            onNavigateTab={setActiveTab}
          />
        )}
      </main>

      {/* Explicit Consent & Privacy Modal (Fixes Audit Point #9) */}
      {consentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-[#DCE3DC] shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                {profile.consentGiven ? (
                  <ShieldCheck className="w-5 h-5 text-[#2E6F40]" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-[#D97706]" />
                )}
                <h3 className="text-base font-bold text-[#1E4D2B]">
                  डेटा गोपनीयता एवं AI सहमति सेटिंग्स
                </h3>
              </div>
              <button
                onClick={() => setConsentModalOpen(false)}
                className="p-1 rounded hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[#37473B] space-y-2.5 leading-relaxed">
              <p>
                <strong>1. डिफ़ॉल्ट ऑफ़लाइन सुरक्षा:</strong> आपकी अनुमति के बिना आपकी कोई भी पत्ती की फोटो, जिले का नाम या प्रश्न बाहरी AI (Google Gemini) को नहीं भेजा जाता।
              </p>
              <p>
                <strong>2. सर्वर-साइड API सुरक्षा:</strong> जब आप सहमति चालू करते हैं, तो अनुरोध हमारे सुरक्षित सर्वर प्रॉक्सी (प्रति घंटा अधिकतम 15 अनुरोध सीमा) के माध्यम से भेजा जाता है ताकि कोई API कुंजी लीक न हो।
              </p>
              <p>
                <strong>3. सहमति बंद रखने पर क्या होगा?</strong> सहमति बंद रहने पर भी ऐप के सभी ऑफ़लाइन फीचर (मौसम, मंडी कैलकुलेटर, खेत-वार हिसाब, 7 सरकारी योजना पात्रता इंजन और 8 स्थानीय संदर्भ लेख) 100% काम करते हैं।
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F4F8F5] border border-[#CFE0D2] flex items-center justify-between">
              <span className="text-xs font-bold text-[#1E4D2B]">
                लाइव Gemini AI विश्लेषण के लिए मेरी सहमति:
              </span>
              <button
                onClick={() =>
                  setProfile((p) => ({ ...p, consentGiven: !p.consentGiven }))
                }
                className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition ${
                  profile.consentGiven
                    ? 'bg-[#2E6F40] text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {profile.consentGiven ? 'सहमति चालू है (ON)' : 'सहमति बंद है (OFF)'}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setConsentModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#1E4D2B] text-white text-xs font-bold cursor-pointer"
              >
                ठीक है
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KVK Reviewer & 30-Point Audit Verification Dashboard */}
      <ExpertAdminModal
        isOpen={kvkAdminModalOpen}
        onClose={() => setKvkAdminModalOpen(false)}
        tickets={kvkTickets}
        flaggedReports={flaggedReports}
        onSubmitScientistReview={handleSubmitScientistReview}
        geminiConfiguredOnServer={geminiConfiguredOnServer}
        remainingAiQuota={remainingAiQuota}
      />
    </div>
  );
}
export default App;
