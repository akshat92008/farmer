import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const MODEL_NAME = 'gemini-3.8-flash';
const MAX_AI_CALLS_PER_HOUR = 15;
const MIN_AI_INTERVAL_MS = 3000;

interface RateRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateRecord>();

export interface EscalatedTicket {
  ticketId: string;
  caseId: string;
  farmerName: string;
  district: string;
  state: string;
  phoneOrContact: string;
  cropName: string;
  growthStage: string;
  symptoms: string;
  spreadScope: string;
  aiLikelyCauses: string;
  aiConfidence: string;
  photoBase64?: string;
  status: 'QUEUED_FOR_KVK' | 'ASSIGNED_TO_SCIENTIST' | 'REVIEWED';
  scientistName?: string;
  scientistResponseHi?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface FlaggedMessageTicket {
  reportId: string;
  messageId: string;
  questionText: string;
  aiReplyText: string;
  reasonHi: string;
  reportedAt: string;
  status: 'OPEN' | 'RESOLVED';
  reviewerActionHi?: string;
}

const kvkQueue: EscalatedTicket[] = [
  {
    ticketId: 'KVK-2026-1042',
    caseId: 'demo-case-1',
    farmerName: 'रामेश्वर प्रसाद (उदाहरण टिकट)',
    district: 'वाराणसी',
    state: 'उत्तर प्रदेश',
    phoneOrContact: 'स्थानीय KVK डेमो कतार',
    cropName: 'गेहूँ (Wheat)',
    growthStage: 'कल्ले निकलना (Tillering - 25-35 दिन)',
    symptoms: 'निचली पत्तियों पर पीलापन और उंगली छूने पर हल्का पीला पाउडर दिख रहा है।',
    spreadScope: 'खेत के कुछ हिस्सों में (10-25% पौधे)',
    aiLikelyCauses: 'पीला रतुआ (Yellow Rust) या नाइट्रोजन की कमी की प्रारंभिक संभावना।',
    aiConfidence: 'MEDIUM',
    status: 'REVIEWED',
    scientistName: 'डॉ. अरविंद सिंह (पादप रोग विशेषज्ञ - KVK संदर्भ)',
    scientistResponseHi:
      'उंगली पर पीला पाउडर आना पीला रतुआ (Stripe/Yellow Rust) का संकेत है। तुरंत खेत के प्रभावित हिस्से की निगरानी करें, अनावश्यक यूरिया न डालें और नजदीकी कृषि विज्ञान केंद्र से अनुमोदित फफूंदनाशक सलाह लें या 1800-180-1551 पर बात करें।',
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
    reviewedAt: new Date(Date.now() - 43200000).toISOString(),
  },
];

const flaggedReports: FlaggedMessageTicket[] = [];

function checkRateLimit(clientKey: string): { allowed: boolean; remaining: number; errorHi?: string } {
  const now = Date.now();
  const oneHourAgo = now - 3600_000;
  const rec = rateLimitStore.get(clientKey) || { timestamps: [] };
  rec.timestamps = rec.timestamps.filter((t) => t > oneHourAgo);

  const lastCall = rec.timestamps[rec.timestamps.length - 1] || 0;
  if (now - lastCall < MIN_AI_INTERVAL_MS) {
    rateLimitStore.set(clientKey, rec);
    return {
      allowed: false,
      remaining: Math.max(0, MAX_AI_CALLS_PER_HOUR - rec.timestamps.length),
      errorHi: 'कृपया अगला AI प्रश्न पूछने से पहले 3 सेकंड प्रतीक्षा करें।',
    };
  }

  if (rec.timestamps.length >= MAX_AI_CALLS_PER_HOUR) {
    rateLimitStore.set(clientKey, rec);
    return {
      allowed: false,
      remaining: 0,
      errorHi: `प्रति घंटे अधिकतम ${MAX_AI_CALLS_PER_HOUR} AI प्रश्नों की सीमा पूरी हो गई है (लागत एवं सुरक्षा नियंत्रण)। ऑफ़लाइन संदर्भ पुस्तकालय सक्रिय है।`,
    };
  }

  rec.timestamps.push(now);
  rateLimitStore.set(clientKey, rec);
  return {
    allowed: true,
    remaining: Math.max(0, MAX_AI_CALLS_PER_HOUR - rec.timestamps.length),
  };
}

function getRemainingQuota(clientKey: string): number {
  const now = Date.now();
  const oneHourAgo = now - 3600_000;
  const rec = rateLimitStore.get(clientKey);
  if (!rec) return MAX_AI_CALLS_PER_HOUR;
  const valid = rec.timestamps.filter((t) => t > oneHourAgo);
  return Math.max(0, MAX_AI_CALLS_PER_HOUR - valid.length);
}

function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY || '';
  return Boolean(key && key.trim() !== '' && key !== 'MY_GEMINI_API_KEY' && !key.startsWith('YOUR_'));
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '6mb' }));

  // 1. Server-side AI & Security Status
  app.get('/api/ai/status', (req, res) => {
    const clientKey = (req.headers['x-farmer-session'] as string) || req.ip || 'default';
    res.json({
      geminiConfiguredOnServer: isGeminiConfigured(),
      modelName: MODEL_NAME,
      remainingHourlyQuota: getRemainingQuota(clientKey),
      maxHourlyQuota: MAX_AI_CALLS_PER_HOUR,
      keyProtectedServerSide: true,
      kvkQueueCount: kvkQueue.length,
      flaggedReportsCount: flaggedReports.length,
    });
  });

  // 2. Server-side Hindi/English Agricultural Assistant
  app.post('/api/ai/ask', async (req, res) => {
    const clientKey = (req.headers['x-farmer-session'] as string) || req.ip || 'default';
    const { question, consentGiven, farmContext, localReferenceSnippet, language } = req.body || {};

    if (!question || typeof question !== 'string' || !question.trim()) {
      res.status(400).json({ errorHi: 'कृपया अपना प्रश्न लिखें या बोलें।' });
      return;
    }

    if (!consentGiven) {
      res.json({
        usedLiveAi: false,
        consentBlocked: true,
        remainingQuota: getRemainingQuota(clientKey),
        fallbackNoticeHi:
          'डेटा गोपनीयता सहमति बंद है — आपकी जानकारी बाहरी AI को नहीं भेजी गई; नीचे ऑफ़लाइन संदर्भ पुस्तकालय से उत्तर दिया गया है।',
      });
      return;
    }

    if (!isGeminiConfigured()) {
      res.json({
        usedLiveAi: false,
        remainingQuota: getRemainingQuota(clientKey),
        fallbackNoticeHi:
          'सर्वर पर GEMINI_API_KEY कॉन्फ़िगर नहीं है — ऑफ़लाइन स्थानीय कृषि संदर्भ पुस्तकालय से सुरक्षित उत्तर दिखाया जा रहा है।',
      });
      return;
    }

    const quota = checkRateLimit(clientKey);
    if (!quota.allowed) {
      res.json({
        usedLiveAi: false,
        remainingQuota: quota.remaining,
        fallbackNoticeHi: quota.errorHi,
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const langInstruction =
        language === 'en'
          ? 'Always respond in clear, simple English suitable for an Indian farmer.'
          : 'हमेशा सरल, छोटे वाक्यों वाली हिंदी में उत्तर दें।';

      const systemInstruction = `आप 'Amaura किसान सहायक' हैं — भारतीय किसानों के लिए एक सतर्क, ईमानदार कृषि सहायक।
अनिवार्य सुरक्षा और ईमानदारी नियम:
1. ${langInstruction}
2. कभी भी सरकारी योजना की पात्रता, अंतिम तिथि, मंडी भाव या मौसम के आँकड़े खुद से न गढ़ें (invent न करें)।
3. बिना पूरी जानकारी के किसी तेज़ रासायनिक कीटनाशक की मात्रा या दो रसायनों के मिश्रण (tank-mix) की सलाह कभी न दें।
4. स्पष्ट बताएं कि यह AI जनित सामान्य सुझाव है, आधिकारिक ICAR/KVK वैज्ञानिक प्रमाणपत्र नहीं।
किसान का संदर्भ: ${farmContext || 'सामान्य भारतीय किसान'}
${localReferenceSnippet ? `ऐप के स्थानीय संदर्भ नोट्स: ${localReferenceSnippet}` : ''}`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: question.trim(),
        config: {
          systemInstruction,
          temperature: 0.25,
        },
      });

      const replyText = response.text?.trim();
      if (!replyText) {
        throw new Error('Empty response from Gemini model');
      }

      const sourceCitation = localReferenceSnippet
        ? `स्रोत: AI जनित सुझाव (${MODEL_NAME}) + ऐप के स्थानीय संदर्भ नोट्स (आधिकारिक ICAR प्रमाणपत्र नहीं)`
        : `स्रोत: AI जनित सामान्य सुझाव (${MODEL_NAME} — KVK या 1800-180-1551 से पुष्टि करें)`;

      res.json({
        usedLiveAi: true,
        replyText,
        sourceCitation,
        remainingQuota: quota.remaining,
        fallbackNoticeHi: null,
      });
    } catch (err: any) {
      res.json({
        usedLiveAi: false,
        remainingQuota: getRemainingQuota(clientKey),
        fallbackNoticeHi: `AI सेवा से उत्तर प्राप्त नहीं हो सका (${err?.message || 'नेटवर्क त्रुटि'}) — ऑफ़लाइन संदर्भ पुस्तकालय से सुरक्षित उत्तर दिखाया गया है।`,
      });
    }
  });

  // 3. Server-side Multimodal Crop Doctor Analysis
  app.post('/api/ai/crop-doctor', async (req, res) => {
    const clientKey = (req.headers['x-farmer-session'] as string) || req.ip || 'default';
    const {
      cropName,
      growthStage,
      symptoms,
      spreadScope,
      districtName,
      stateName,
      photoBase64,
      photoMimeType,
      isLowResPhoto,
      consentGiven,
    } = req.body || {};

    if (!cropName || !symptoms || String(symptoms).trim().length < 5) {
      res.status(400).json({
        errorHi: 'कृपया फसल का नाम और खेत में दिख रहे वास्तविक लक्षण (कम से कम एक वाक्य) दर्ज करें।',
      });
      return;
    }

    if (!consentGiven) {
      res.json({
        usedLiveAi: false,
        consentBlocked: true,
        remainingQuota: getRemainingQuota(clientKey),
        fallbackNoticeHi:
          'डेटा गोपनीयता सहमति बंद होने के कारण फोटो व विवरण बाहरी AI को नहीं भेजे गए; ऑफ़लाइन संदर्भ पुस्तकालय से प्राथमिक विश्लेषण किया गया।',
      });
      return;
    }

    if (!isGeminiConfigured()) {
      res.json({
        usedLiveAi: false,
        remainingQuota: getRemainingQuota(clientKey),
        fallbackNoticeHi:
          'सर्वर पर GEMINI_API_KEY कॉन्फ़िगर नहीं है — ऑफ़लाइन स्थानीय कृषि संदर्भ पुस्तकालय से सुरक्षित विश्लेषण किया गया।',
      });
      return;
    }

    const quota = checkRateLimit(clientKey);
    if (!quota.allowed) {
      res.json({
        usedLiveAi: false,
        remainingQuota: quota.remaining,
        fallbackNoticeHi: quota.errorHi,
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const promptText = `फसल डॉक्टर जाँच अनुरोध:
- फसल: ${cropName}
- अवस्था: ${growthStage || 'अज्ञात'}
- देखे गए लक्षण: ${symptoms}
- फैलाव: ${spreadScope || 'अज्ञात'}
- स्थान: ${districtName || 'अज्ञात'}, ${stateName || 'भारत'}
- फोटो संलग्न: ${photoBase64 ? 'हाँ' : 'नहीं'}

कृपया सरल हिंदी में 3 भागों में उत्तर दें (भागों को '|||' से अलग करें):
भाग 1 (आत्मविश्वास स्तर): केवल एक शब्द लिखें — LOW, MEDIUM, या HIGH (यदि फोटो नहीं है, धुंधली है या लक्षण अस्पष्ट हैं तो LOW लिखें; केवल बहुत स्पष्ट फोटो व विशिष्ट लक्षण होने पर HIGH लिखें)।
भाग 2 (संभावित कारण और विकल्प): कम से कम 2 संभावित कारण (जैसे पोषक तत्व की कमी बनाम फफूंद/कीट) बताएं और स्पष्ट लिखें कि केवल फोटो/लक्षण से 100% पक्का निदान संभव नहीं है, तथा किसान को खेत में पक्का करने के लिए क्या देखना चाहिए।
भाग 3 (सुरक्षित अगले कदम और सावधानी): बिना पुष्टि के तेज़ रसायन या दो दवाओं का मिश्रण न डालने की सलाह दें, सुरक्षित निरीक्षण व प्राथमिक उपाय बताएं, और कब नजदीकी KVK या 1800-180-1551 से संपर्क करना चाहिए यह स्पष्ट करें।`;

      const contents: any[] = [];
      if (photoBase64 && typeof photoBase64 === 'string') {
        const cleanBase64 = photoBase64.includes(',') ? photoBase64.split(',')[1] : photoBase64;
        contents.push({
          inlineData: {
            mimeType: photoMimeType || 'image/jpeg',
            data: cleanBase64,
          },
        });
      }
      contents.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: {
          systemInstruction:
            'आप एक सतर्क कृषि पौध संरक्षण सहायक हैं। कभी भी बिना लेबल/विशेषज्ञ पुष्टि के खतरनाक रासायनिक खुराक न लिखें। हमेशा अनिश्चितता स्वीकार करें।',
          temperature: 0.2,
        },
      });

      const rawText = response.text?.trim() || '';
      if (!rawText) {
        throw new Error('Empty response from Gemini Crop Doctor');
      }

      const parts = rawText.split('|||').map((p) => p.trim());
      let parsedConfidence: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (isLowResPhoto) {
        parsedConfidence = 'LOW';
      } else if (parts.length >= 3) {
        const c = parts[0].toUpperCase();
        if (c.includes('HIGH') && photoBase64) parsedConfidence = 'HIGH';
        else if (c.includes('MEDIUM')) parsedConfidence = 'MEDIUM';
        else parsedConfidence = 'LOW';
      } else if (photoBase64 && String(symptoms).length >= 25) {
        parsedConfidence = 'MEDIUM';
      }

      const likelyCauses = (parts.length >= 3 ? parts[1] : parts[0] || rawText).slice(0, 1500);
      const safeNextSteps = (
        parts.length >= 3
          ? parts[2]
          : parts[1] ||
            'प्रभावित पत्ते के दोनों तरफ की जाँच करें और बिना पुष्टि के तेज़ रसायन न डालें। समस्या बढ़ने पर KVK विशेषज्ञ को दिखाएँ।'
      ).slice(0, 1500);

      res.json({
        usedLiveAi: true,
        confidenceLevel: parsedConfidence,
        likelyCauses,
        safeNextSteps,
        remainingQuota: quota.remaining,
        fallbackNoticeHi: isLowResPhoto
          ? 'फोटो का रिज़ॉल्यूशन कम होने के कारण आत्मविश्वास स्तर LOW रखा गया है।'
          : null,
      });
    } catch (err: any) {
      res.json({
        usedLiveAi: false,
        remainingQuota: getRemainingQuota(clientKey),
        fallbackNoticeHi: `AI फसल डॉक्टर सेवा उपलब्ध नहीं हो सकी (${err?.message || 'नेटवर्क त्रुटि'}) — ऑफ़लाइन संदर्भ पुस्तकालय से सुरक्षित सलाह दिखाई गई है।`,
      });
    }
  });

  // 4. Real KVK / Expert Escalation Queue Endpoints (Fixing Audit Point #1 & #12 & #13)
  app.get('/api/kvk-queue', (_req, res) => {
    res.json({
      tickets: kvkQueue,
      flaggedReports,
    });
  });

  app.post('/api/kvk-escalate', (req, res) => {
    const {
      caseId,
      farmerName,
      district,
      state,
      phoneOrContact,
      cropName,
      growthStage,
      symptoms,
      spreadScope,
      aiLikelyCauses,
      aiConfidence,
      photoBase64,
    } = req.body || {};

    const ticketId = `KVK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket: EscalatedTicket = {
      ticketId,
      caseId: caseId || `case-${Date.now()}`,
      farmerName: farmerName || 'किसान साथी',
      district: district || 'अज्ञात जिला',
      state: state || 'भारत',
      phoneOrContact: phoneOrContact || 'ऐप उपयोगकर्ता',
      cropName: cropName || 'फसल',
      growthStage: growthStage || '',
      symptoms: symptoms || '',
      spreadScope: spreadScope || '',
      aiLikelyCauses: aiLikelyCauses || '',
      aiConfidence: aiConfidence || 'LOW',
      photoBase64: photoBase64 || '',
      status: 'QUEUED_FOR_KVK',
      submittedAt: new Date().toISOString(),
    };

    kvkQueue.unshift(newTicket);
    res.json({
      success: true,
      ticket: newTicket,
      honestDisclosureHi:
        'आपका केस ऐप की समीक्षा कतार (Review Queue) में दर्ज हो गया है। ध्यान दें: यह सीधे सरकारी KVK सर्वर से रियल-टाइम में नहीं जुड़ा है — तुरंत सरकारी कृषि वैज्ञानिक से बात करने के लिए निःशुल्क किसान कॉल सेंटर 1800-180-1551 पर कॉल करें या केस पर्ची (Slip) डाउनलोड कर नजदीकी KVK में दिखाएँ।',
    });
  });

  app.post('/api/kvk-review', (req, res) => {
    const { ticketId, scientistName, scientistResponseHi, status } = req.body || {};
    const ticket = kvkQueue.find((t) => t.ticketId === ticketId);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    ticket.status = status || 'REVIEWED';
    ticket.scientistName = scientistName || 'कृषि विशेषज्ञ (समीक्षा पैनल)';
    ticket.scientistResponseHi = scientistResponseHi || '';
    ticket.reviewedAt = new Date().toISOString();
    res.json({ success: true, ticket });
  });

  app.post('/api/flag-message', (req, res) => {
    const { messageId, questionText, aiReplyText, reasonHi } = req.body || {};
    const report: FlaggedMessageTicket = {
      reportId: `FLAG-${Math.floor(100 + Math.random() * 900)}`,
      messageId: messageId || `msg-${Date.now()}`,
      questionText: questionText || '',
      aiReplyText: aiReplyText || '',
      reasonHi: reasonHi || 'किसान द्वारा असुरक्षित/गलत उत्तर के रूप में चिह्नित',
      reportedAt: new Date().toISOString(),
      status: 'OPEN',
    };
    flaggedReports.unshift(report);
    res.json({
      success: true,
      report,
      honestDisclosureHi:
        'आपकी रिपोर्ट ऐप के ऑडिट लॉग (Admin Review Log) में दर्ज कर ली गई है। कृपया किसी भी संदिग्ध सलाह पर अमल न करें और 1800-180-1551 से पुष्टि करें।',
    });
  });

  app.delete('/api/user-data', (req, res) => {
    const clientKey = (req.headers['x-farmer-session'] as string) || req.ip || 'default';
    rateLimitStore.delete(clientKey);
    res.json({ success: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Amaura Farmer server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
