import {
  buildCautiousCropDiagnosis,
  CROP_GUIDANCE_LIBRARY,
  findCoordinatesForDistrictOrNull,
  getOfflineAssistantReply,
  SUPPORTED_LOCATIONS,
} from '../data/knowledgeBase';
import {
  CropCycle,
  DistrictCoordinates,
  FarmerProfile,
  FarmWeatherAdvisory,
  WeatherTaskRecommendation,
} from '../types/amaura';

export async function resolveDistrictCoordinates(
  districtInput: string,
  stateInput = ''
): Promise<{ coords: DistrictCoordinates; isGeocoded: boolean; warningHi?: string }> {
  const cleanDistrict = districtInput.trim();
  if (!cleanDistrict) {
    return {
      coords: SUPPORTED_LOCATIONS[0],
      isGeocoded: false,
      warningHi:
        'आपकी प्रोफ़ाइल में जिला दर्ज नहीं है — नीचे उदाहरण के रूप में वाराणसी का मौसम दिखाया गया है। कृपया "मेरी खेती" में अपना जिला चुनें।',
    };
  }

  const preset = findCoordinatesForDistrictOrNull(cleanDistrict);
  if (preset) {
    return { coords: preset, isGeocoded: false };
  }

  // Geocode any Indian district/village via Open-Meteo Geocoding API
  try {
    const query = encodeURIComponent(cleanDistrict);
    const resp = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=hi&format=json`
    );
    if (resp.ok) {
      const data = await resp.json();
      const results: Array<{
        name: string;
        latitude: number;
        longitude: number;
        admin1?: string;
        country_code?: string;
      }> = data?.results || [];
      const indiaMatch =
        results.find((r) => r.country_code?.toUpperCase() === 'IN') || results[0];
      if (indiaMatch && typeof indiaMatch.latitude === 'number') {
        return {
          coords: {
            stateHi: stateInput || indiaMatch.admin1 || 'भारत',
            districtHi: cleanDistrict,
            districtEn: indiaMatch.name || cleanDistrict,
            latitude: Number(indiaMatch.latitude.toFixed(4)),
            longitude: Number(indiaMatch.longitude.toFixed(4)),
          },
          isGeocoded: true,
        };
      }
    }
  } catch {
    // Fall through to explicit warning
  }

  return {
    coords: SUPPORTED_LOCATIONS[0],
    isGeocoded: false,
    warningHi: `"${cleanDistrict}" के निर्देशांक ऑफ़लाइन सूची में नहीं मिले — कृपया "मेरी खेती" में सूचीबद्ध जिला चुनें या इंटरनेट कनेक्शन जांचें।`,
  };
}

export async function fetchFarmWeatherAdvisory(
  profile: FarmerProfile
): Promise<FarmWeatherAdvisory> {
  const { coords, warningHi } = await resolveDistrictCoordinates(
    profile.districtName,
    profile.stateName
  );

  const nowFormatted = new Date().toLocaleString('hi-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=Asia%2FKolkata&forecast_days=5`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const data = await resp.json();

    const tempC = Number(data?.current?.temperature_2m ?? 28);
    const humidity = Number(data?.current?.relative_humidity_2m ?? 55);
    const windKmh = Number(data?.current?.wind_speed_10m ?? 8);

    const times: string[] = data?.daily?.time || [];
    const maxTemps: number[] = data?.daily?.temperature_2m_max || [];
    const minTemps: number[] = data?.daily?.temperature_2m_min || [];
    const rainProbs: number[] = data?.daily?.precipitation_probability_max || [];
    const rainSums: number[] = data?.daily?.precipitation_sum || [];

    const todayRainProb = Number(rainProbs[0] ?? 10);
    const threeDayRainProbMax = Math.max(
      todayRainProb,
      Number(rainProbs[1] ?? 0),
      Number(rainProbs[2] ?? 0)
    );

    const tasks: WeatherTaskRecommendation[] = [];

    // 1. Irrigation decision
    if (threeDayRainProbMax >= 50) {
      tasks.push({
        taskCategoryHi: 'सिंचाई निर्णय (Irrigation)',
        recommendationHi: 'अगले 48-72 घंटों में सिंचाई टालें और खेत की जल निकासी नालियाँ साफ रखें।',
        reasonWhyHi: `क्योंकि 3-दिन के मॉडल पूर्वानुमान में अधिकतम बारिश संभावना ${threeDayRainProbMax}% है।`,
        isCaution: true,
      });
    } else {
      tasks.push({
        taskCategoryHi: 'सिंचाई निर्णय (Irrigation)',
        recommendationHi: 'फसल की अवस्था (जैसे गेहूँ में CRI/कल्ले अवस्था) के अनुसार सुबह या शाम हल्की सिंचाई कर सकते हैं।',
        reasonWhyHi: `क्योंकि अगले 3 दिनों में बारिश की अधिकतम संभावना कम (${threeDayRainProbMax}%) है और तापमान ${tempC}°C है।`,
        isCaution: false,
      });
    }

    // 2. Spraying decision
    if (windKmh >= 15 || todayRainProb >= 40) {
      tasks.push({
        taskCategoryHi: 'छिड़काव सावधानी (Spraying)',
        recommendationHi: 'अभी पर्ण छिड़काव (Foliar Spray) न करें — दवा बहने या हवा में उड़ने (Drift) का जोखिम है।',
        reasonWhyHi: `क्योंकि हवा की गति ${windKmh} km/h है और आज बारिश की संभावना ${todayRainProb}% है।`,
        isCaution: true,
      });
    } else {
      tasks.push({
        taskCategoryHi: 'छिड़काव सलाह (Spraying)',
        recommendationHi: 'यदि विशेषज्ञ द्वारा सुझाया गया हो, तो शांत हवा में सुबह/शाम छिड़काव अनुकूल है।',
        reasonWhyHi: `क्योंकि हवा की गति सामान्य (${windKmh} km/h) है और आज बारिश की संभावना कम (${todayRainProb}%) है।`,
        isCaution: false,
      });
    }

    // 3. Harvest & Storage decision
    if (threeDayRainProbMax >= 45 || humidity >= 80) {
      tasks.push({
        taskCategoryHi: 'कटाई एवं भंडारण (Harvest)',
        recommendationHi: 'कटी हुई उपज को तिरपाल से ढककर ऊँचे व हवादार स्थान पर रखें।',
        reasonWhyHi: `क्योंकि सापेक्षिक नमी ${humidity}% है और 3-दिन की बारिश संभावना ${threeDayRainProbMax}% है।`,
        isCaution: true,
      });
    } else {
      tasks.push({
        taskCategoryHi: 'खेत कार्य एवं निरीक्षण (Field Work)',
        recommendationHi: 'निराई-गुड़ाई और फसल निरीक्षण के लिए मौसम अनुकूल है।',
        reasonWhyHi: `क्योंकि बारिश की संभावना कम है और हवा में नमी ${humidity}% संतुलित है।`,
        isCaution: false,
      });
    }

    const dailyForecast = times.slice(0, 5).map((dateStr, idx) => ({
      date: dateStr,
      tempMax: Number(maxTemps[idx] ?? tempC),
      tempMin: Number(minTemps[idx] ?? tempC - 8),
      rainProb: Number(rainProbs[idx] ?? 0),
      rainMm: Number(rainSums[idx] ?? 0),
    }));

    return {
      locationLabelHi: `${coords.districtHi}, ${coords.stateHi}`,
      currentTempC: tempC,
      humidityPercent: humidity,
      windSpeedKmh: windKmh,
      todayRainProbPercent: todayRainProb,
      threeDayRainProbMaxPercent: threeDayRainProbMax,
      retrievedAtFormatted: nowFormatted,
      forecastWindowHi: 'अगले 72 घंटे (3-5 दिन का क्षेत्रीय संख्यात्मक पूर्वानुमान)',
      uncertaintyNoteHi:
        (warningHi ? `⚠️ ${warningHi} ` : '') +
        'पारदर्शिता नोट: यह पूर्वानुमान Open-Meteo संख्यात्मक मौसम मॉडल पर आधारित है (IMD का आधिकारिक बुलेटिन नहीं)। कार्य सुझाव ऐप के सामान्य सावधानी नियमों (हवा ≥15 km/h या बारिश संभावना ≥40-50%) पर आधारित हैं।',
      sourceAttributionHi: `स्रोत: Open-Meteo लाइव मौसम API (अक्षांश ${coords.latitude}, देशांतर ${coords.longitude})`,
      isLiveNetworkData: true,
      taskRecommendations: tasks,
      dailyForecast,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'नेटवर्क त्रुटि';
    return {
      locationLabelHi: `${coords.districtHi}, ${coords.stateHi} (ऑफ़लाइन मोड)`,
      currentTempC: 27,
      humidityPercent: 58,
      windSpeedKmh: 9,
      todayRainProbPercent: 15,
      threeDayRainProbMaxPercent: 20,
      retrievedAtFormatted: nowFormatted,
      forecastWindowHi: 'लाइव मौसम डेटा अनुपलब्ध (ऑफ़लाइन सावधानी मोड)',
      uncertaintyNoteHi: `लाइव मौसम सेवा से संपर्क नहीं हो सका (${msg})। कृपया सिंचाई या छिड़काव से पहले स्थानीय आकाश व हवा की स्थिति जांचें।`,
      sourceAttributionHi: 'स्रोत: ऑफ़लाइन बैकअप सावधानी नियम',
      isLiveNetworkData: false,
      taskRecommendations: [
        {
          taskCategoryHi: 'सामान्य सावधानी',
          recommendationHi: 'तेज हवा या बादल दिखने पर रासायनिक छिड़काव न करें।',
          reasonWhyHi: 'लाइव मौसम नेटवर्क उपलब्ध न होने के कारण सुरक्षा नियम लागू।',
          isCaution: true,
        },
      ],
      dailyForecast: [],
    };
  }
}

export async function processImageFileForDiagnosis(file: File): Promise<{
  analysisBase64: string;
  thumbnailBase64: string;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('फोटो फ़ाइल पढ़ने में त्रुटि हुई।'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('फोटो का प्रारूप मान्य नहीं है।'));
      img.onload = () => {
        const origWidth = img.naturalWidth || img.width;
        const origHeight = img.naturalHeight || img.height;

        // 1. High-resolution image (up to 1024px) for Gemini leaf lesion analysis
        const maxAnalysisDim = 1024;
        const analysisScale = Math.min(
          1,
          maxAnalysisDim / Math.max(origWidth, origHeight, 1)
        );
        const aW = Math.max(1, Math.round(origWidth * analysisScale));
        const aH = Math.max(1, Math.round(origHeight * analysisScale));
        const analysisCanvas = document.createElement('canvas');
        analysisCanvas.width = aW;
        analysisCanvas.height = aH;
        const aCtx = analysisCanvas.getContext('2d');
        aCtx?.drawImage(img, 0, 0, aW, aH);
        const analysisBase64 = analysisCanvas.toDataURL('image/jpeg', 0.84);

        // 2. Persistent case history thumbnail (up to 360px) saved in localStorage / case log
        const maxThumbDim = 360;
        const thumbScale = Math.min(
          1,
          maxThumbDim / Math.max(origWidth, origHeight, 1)
        );
        const tW = Math.max(1, Math.round(origWidth * thumbScale));
        const tH = Math.max(1, Math.round(origHeight * thumbScale));
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = tW;
        thumbCanvas.height = tH;
        const tCtx = thumbCanvas.getContext('2d');
        tCtx?.drawImage(img, 0, 0, tW, tH);
        const thumbnailBase64 = thumbCanvas.toDataURL('image/jpeg', 0.72);

        resolve({
          analysisBase64,
          thumbnailBase64,
          width: origWidth,
          height: origHeight,
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function askAgriculturalAssistant(
  question: string,
  profile: FarmerProfile,
  cropCycles: CropCycle[]
): Promise<{
  replyText: string;
  sourceCitation: string;
  usedLiveAi: boolean;
  fallbackNoticeHi?: string | null;
  quotaRemaining?: number;
}> {
  const qLower = question.toLowerCase();
  const matchingArticle = CROP_GUIDANCE_LIBRARY.find(
    (art) =>
      qLower.includes(art.cropHi.split(' ')[0].toLowerCase()) ||
      art.titleHi
        .toLowerCase()
        .split(' ')
        .some((w) => w.length > 3 && qLower.includes(w))
  );

  const localReferenceSnippet = matchingArticle
    ? `संदर्भ (${matchingArticle.sourceOrg}): ${matchingArticle.summaryHi} सुरक्षित कदम: ${matchingArticle.cautiousStepsHi.join('; ')}`
    : '';

  const farmContext = [
    profile.districtName ? `जिला: ${profile.districtName}, राज्य: ${profile.stateName}` : '',
    profile.landSizeAcres > 0 ? `भूमि: ${profile.landSizeAcres} एकड़` : '',
    cropCycles.length > 0
      ? `सक्रिय फसलें: ${cropCycles.map((c) => `${c.cropName} (${c.growthStage})`).join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join(' | ');

  try {
    const resp = await fetch('/api/ai/assistant', {
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

    if (resp.ok) {
      const data = await resp.json();
      if (data.usedLiveAi && data.replyText) {
        return {
          replyText: data.replyText,
          sourceCitation: data.sourceCitation,
          usedLiveAi: true,
          fallbackNoticeHi: null,
          quotaRemaining: data.quotaRemaining,
        };
      }
      const offline = getOfflineAssistantReply(question);
      return {
        replyText: offline.replyText,
        sourceCitation: offline.sourceCitation,
        usedLiveAi: false,
        fallbackNoticeHi: data.fallbackNoticeHi || null,
        quotaRemaining: data.quotaRemaining,
      };
    }
  } catch {
    // Fall through to deterministic offline library
  }

  const offline = getOfflineAssistantReply(question);
  return {
    replyText: offline.replyText,
    sourceCitation: offline.sourceCitation,
    usedLiveAi: false,
    fallbackNoticeHi:
      'सर्वर से संपर्क नहीं हो सका — ऑफ़लाइन संदर्भ पुस्तकालय से सुरक्षित उत्तर दिखाया गया है।',
  };
}

export async function runCropDoctorDiagnosis(params: {
  cropName: string;
  growthStage: string;
  symptoms: string;
  spreadScope: string;
  analysisBase64?: string;
  thumbnailBase64?: string;
  photoWidth?: number;
  photoHeight?: number;
  profile: FarmerProfile;
}): Promise<{
  likelyCauses: string;
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  safeNextSteps: string;
  usedLiveAi: boolean;
  fallbackNoticeHi?: string | null;
  quotaRemaining?: number;
}> {
  const hasClearPhoto =
    Boolean(params.analysisBase64) &&
    (params.photoWidth === undefined || params.photoWidth >= 240) &&
    (params.photoHeight === undefined || params.photoHeight >= 240);

  try {
    const resp = await fetch('/api/ai/crop-doctor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cropName: params.cropName,
        growthStage: params.growthStage,
        symptoms: params.symptoms,
        spreadScope: params.spreadScope,
        districtName: params.profile.districtName,
        stateName: params.profile.stateName,
        photoBase64: params.analysisBase64 || '',
        photoWidth: params.photoWidth || 0,
        photoHeight: params.photoHeight || 0,
        consentGiven: params.profile.consentGiven,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.usedLiveAi && data.likelyCauses) {
        return {
          likelyCauses: data.likelyCauses,
          confidenceLevel: data.confidenceLevel || 'LOW',
          safeNextSteps: data.safeNextSteps,
          usedLiveAi: true,
          fallbackNoticeHi: data.fallbackNoticeHi || null,
          quotaRemaining: data.quotaRemaining,
        };
      }
      const localDiag = buildCautiousCropDiagnosis(
        params.cropName,
        params.growthStage,
        params.symptoms,
        params.spreadScope,
        hasClearPhoto
      );
      return {
        ...localDiag,
        confidenceLevel: data.isLowResPhoto ? 'LOW' : localDiag.confidenceLevel,
        usedLiveAi: false,
        fallbackNoticeHi: data.fallbackNoticeHi || null,
        quotaRemaining: data.quotaRemaining,
      };
    }
  } catch {
    // Fall through to deterministic cautious diagnosis
  }

  const localDiag = buildCautiousCropDiagnosis(
    params.cropName,
    params.growthStage,
    params.symptoms,
    params.spreadScope,
    hasClearPhoto
  );
  return {
    ...localDiag,
    usedLiveAi: false,
    fallbackNoticeHi:
      'सर्वर उपलब्ध न होने के कारण ऑफ़लाइन संदर्भ पुस्तकालय से सुरक्षित प्राथमिक सलाह दी गई है।',
  };
}
