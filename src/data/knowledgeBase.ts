import {
  CropCycle,
  CriterionStatus,
  DistrictCoordinates,
  EvaluatedCriterion,
  FarmEconomicsSummary,
  FarmerProfile,
  FarmTransaction,
  FarmWeatherAdvisory,
  GovernmentSchemeRule,
  KnowledgeArticle,
  MandiComparisonOption,
  MandiReferenceQuote,
  SchemeEvaluationResult,
  WeatherTaskRecommendation,
} from '../types/amaura';

export const SUPPORTED_LOCATIONS: DistrictCoordinates[] = [
  { stateHi: 'उत्तर प्रदेश', districtHi: 'वाराणसी', districtEn: 'Varanasi', latitude: 25.3176, longitude: 82.9739 },
  { stateHi: 'उत्तर प्रदेश', districtHi: 'लखनऊ', districtEn: 'Lucknow', latitude: 26.8467, longitude: 80.9462 },
  { stateHi: 'उत्तर प्रदेश', districtHi: 'मेरठ', districtEn: 'Meerut', latitude: 28.9845, longitude: 77.7064 },
  { stateHi: 'उत्तर प्रदेश', districtHi: 'गोरखपुर', districtEn: 'Gorakhpur', latitude: 26.7606, longitude: 83.3732 },
  { stateHi: 'उत्तर प्रदेश', districtHi: 'आगरा', districtEn: 'Agra', latitude: 27.1767, longitude: 78.0081 },
  { stateHi: 'उत्तर प्रदेश', districtHi: 'झाँसी', districtEn: 'Jhansi', latitude: 25.4484, longitude: 78.5685 },
  { stateHi: 'उत्तर प्रदेश', districtHi: 'बरेली', districtEn: 'Bareilly', latitude: 28.367, longitude: 79.4304 },
  { stateHi: 'उत्तर प्रदेश', districtHi: 'प्रयागराज', districtEn: 'Prayagraj', latitude: 25.4358, longitude: 81.8463 },
  { stateHi: 'मध्य प्रदेश', districtHi: 'सीहोर', districtEn: 'Sehore', latitude: 23.2032, longitude: 77.0844 },
  { stateHi: 'मध्य प्रदेश', districtHi: 'इंदौर', districtEn: 'Indore', latitude: 22.7196, longitude: 75.8577 },
  { stateHi: 'मध्य प्रदेश', districtHi: 'भोपाल', districtEn: 'Bhopal', latitude: 23.2599, longitude: 77.4126 },
  { stateHi: 'मध्य प्रदेश', districtHi: 'उज्जैन', districtEn: 'Ujjain', latitude: 23.1765, longitude: 75.7885 },
  { stateHi: 'हरियाणा', districtHi: 'करनाल', districtEn: 'Karnal', latitude: 29.6857, longitude: 76.9905 },
  { stateHi: 'हरियाणा', districtHi: 'हिसार', districtEn: 'Hisar', latitude: 29.1492, longitude: 75.7217 },
  { stateHi: 'पंजाब', districtHi: 'लुधियाना', districtEn: 'Ludhiana', latitude: 30.901, longitude: 75.8573 },
  { stateHi: 'पंजाब', districtHi: 'बठिंडा', districtEn: 'Bathinda', latitude: 30.211, longitude: 74.9455 },
  { stateHi: 'राजस्थान', districtHi: 'बूंदी', districtEn: 'Bundi', latitude: 25.4385, longitude: 75.6377 },
  { stateHi: 'राजस्थान', districtHi: 'जयपुर', districtEn: 'Jaipur', latitude: 26.9124, longitude: 75.7873 },
  { stateHi: 'राजस्थान', districtHi: 'कोटा', districtEn: 'Kota', latitude: 25.2138, longitude: 75.8648 },
  { stateHi: 'बिहार', districtHi: 'पटना', districtEn: 'Patna', latitude: 25.5941, longitude: 85.1376 },
  { stateHi: 'बिहार', districtHi: 'मुजफ्फरपुर', districtEn: 'Muzaffarpur', latitude: 26.1209, longitude: 85.3647 },
  { stateHi: 'महाराष्ट्र', districtHi: 'नासिक', districtEn: 'Nashik', latitude: 19.9975, longitude: 73.7898 },
  { stateHi: 'महाराष्ट्र', districtHi: 'नागपुर', districtEn: 'Nagpur', latitude: 21.1458, longitude: 79.0882 },
  { stateHi: 'गुजरात', districtHi: 'राजकोट', districtEn: 'Rajkot', latitude: 22.3039, longitude: 70.8022 },
];

export function findCoordinatesForDistrictOrNull(districtInput: string): DistrictCoordinates | null {
  const clean = districtInput.trim().toLowerCase();
  if (!clean) return null;
  return (
    SUPPORTED_LOCATIONS.find(
      (loc) =>
        loc.districtHi.toLowerCase() === clean ||
        loc.districtEn.toLowerCase() === clean ||
        loc.districtHi.toLowerCase().includes(clean) ||
        loc.districtEn.toLowerCase().includes(clean) ||
        clean.includes(loc.districtHi.toLowerCase()) ||
        clean.includes(loc.districtEn.toLowerCase())
    ) || null
  );
}

/**
 * Live Open-Meteo Weather & All-India Geocoding Service
 * Audit Fix #3, #6, #16:
 * - Never silently substitutes Varanasi for an unconfigured district.
 * - Dynamically geocodes ANY Indian district/town via Open-Meteo Geocoding API.
 * - Explicitly attributes Open-Meteo model and explains exact agronomic threshold rules.
 */
export async function fetchLiveWeatherForProfile(
  profile: FarmerProfile,
  overrideQuery?: string
): Promise<FarmWeatherAdvisory> {
  const queryDistrict = (overrideQuery ?? profile.districtName).trim();
  let coords: DistrictCoordinates | null = findCoordinatesForDistrictOrNull(queryDistrict);
  let unconfiguredWarning: string | undefined;

  if (!queryDistrict) {
    coords = SUPPORTED_LOCATIONS[0];
    unconfiguredWarning =
      'आपकी प्रोफ़ाइल में अभी जिला चयनित नहीं है — नीचे उदाहरण के रूप में वाराणसी का मौसम दिखाया गया है। कृपया अपना वास्तविक जिला चुनें या खोजें।';
  } else if (!coords) {
    // Live geocode via Open-Meteo Geocoding API for any district in India!
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        queryDistrict
      )}&count=5&language=hi&format=json`;
      const geoRes = await fetch(geoUrl);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const results = Array.isArray(geoData.results) ? geoData.results : [];
        const indianMatch =
          results.find((r: any) => r.country_code === 'IN') || results[0];
        if (indianMatch) {
          coords = {
            stateHi: indianMatch.admin1 || profile.stateName || 'भारत',
            districtHi: indianMatch.name || queryDistrict,
            districtEn: indianMatch.name || queryDistrict,
            latitude: indianMatch.latitude,
            longitude: indianMatch.longitude,
          };
        }
      }
    } catch {
      // Geocoding failed offline
    }

    if (!coords) {
      coords = SUPPORTED_LOCATIONS[0];
      unconfiguredWarning = `जिला "${queryDistrict}" के निर्देशांक ऑफ़लाइन सूची में नहीं मिले — कृपया इंटरनेट कनेक्शन जांचें या सूची से नजदीकी जिला चुनें। (अस्थायी रूप से ${coords.districtHi} संदर्भ दिखाया जा रहा है)`;
    }
  }

  const nowFormatted = new Date().toLocaleTimeString('hi-IN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=Asia%2FKolkata&forecast_days=5`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const currentTemp = data.current?.temperature_2m ?? 28.0;
    const humidity = data.current?.relative_humidity_2m ?? 52;
    const windSpeed = data.current?.wind_speed_10m ?? 9.0;
    const dailyProbs: number[] = data.daily?.precipitation_probability_max ?? [10, 15, 20];
    const todayRainProb = dailyProbs[0] ?? 10;
    const max3DayRainProb = Math.max(...dailyProbs.slice(0, 3), todayRainProb);

    const dailyForecast = (data.daily?.time || []).map((dateStr: string, idx: number) => ({
      date: dateStr,
      tempMax: data.daily?.temperature_2m_max?.[idx] ?? 31,
      tempMin: data.daily?.temperature_2m_min?.[idx] ?? 18,
      rainProb: data.daily?.precipitation_probability_max?.[idx] ?? 10,
    }));

    const tasks = buildWeatherTaskRecommendations(
      currentTemp,
      humidity,
      windSpeed,
      todayRainProb,
      max3DayRainProb
    );

    return {
      locationLabelHi: `${coords.districtHi}, ${coords.stateHi}`,
      currentTempC: currentTemp,
      humidityPercent: humidity,
      windSpeedKmh: windSpeed,
      todayRainProbPercent: todayRainProb,
      threeDayRainProbMaxPercent: max3DayRainProb,
      retrievedAtFormatted: `अपडेट समय: ${nowFormatted}`,
      forecastWindowHi: 'अगले 72 घंटे (3-दिन का क्षेत्रीय पूर्वानुमान)',
      uncertaintyNoteHi:
        'पारदर्शिता नोट: यह पूर्वानुमान Open-Meteo संख्यात्मक मौसम मॉडल पर आधारित है (IMD का आधिकारिक बुलेटिन नहीं)। कार्य सुझाव ऐप के स्पष्ट कृषि सावधानी नियमों (हवा ≥15 km/h पर छिड़काव रोकना, बारिश संभावना ≥50% पर सिंचाई टालना) पर आधारित हैं।',
      sourceAttributionHi: `स्रोत: Open-Meteo लाइव मौसम API (${coords.latitude.toFixed(2)}°N, ${coords.longitude.toFixed(2)}°E)`,
      isLiveNetworkData: true,
      unconfiguredDistrictWarningHi: unconfiguredWarning,
      taskRecommendations: tasks,
      dailyForecast,
    };
  } catch {
    const fallbackTasks = buildWeatherTaskRecommendations(27.5, 54, 9.5, 15, 20);
    return {
      locationLabelHi: `${coords.districtHi}, ${coords.stateHi} (ऑफ़लाइन कैश)`,
      currentTempC: 27.5,
      humidityPercent: 54,
      windSpeedKmh: 9.5,
      todayRainProbPercent: 15,
      threeDayRainProbMaxPercent: 20,
      retrievedAtFormatted: `ऑफ़लाइन मोड (${nowFormatted})`,
      forecastWindowHi: 'स्थानीय ऑफ़लाइन अनुमानित संदर्भ',
      uncertaintyNoteHi:
        'इंटरनेट उपलब्ध न होने के कारण लाइव Open-Meteo डेटा प्राप्त नहीं हो सका। सिंचाई या छिड़काव से पहले आसमान और स्थानीय मौसम बुलेटिन की जाँच करें।',
      sourceAttributionHi: 'स्रोत: ऑफ़लाइन स्थानीय बैकअप मोड',
      isLiveNetworkData: false,
      unconfiguredDistrictWarningHi: unconfiguredWarning,
      taskRecommendations: fallbackTasks,
      dailyForecast: [],
    };
  }
}

function buildWeatherTaskRecommendations(
  currentTemp: number,
  humidity: number,
  windSpeed: number,
  todayRainProb: number,
  max3DayRainProb: number
): WeatherTaskRecommendation[] {
  const tasks: WeatherTaskRecommendation[] = [];

  if (max3DayRainProb >= 50) {
    tasks.push({
      taskCategoryHi: 'सिंचाई निर्णय (Irrigation)',
      recommendationHi: 'अगले 48 घंटे सिंचाई रोकें और खेत की जल निकासी नालियाँ साफ रखें।',
      reasonWhyHi: `क्योंकि अगले 3 दिनों में बारिश की अधिकतम संभावना ${max3DayRainProb}% है (नियम सीमा ≥50%)।`,
      isCaution: true,
    });
  } else if (currentTemp >= 34) {
    tasks.push({
      taskCategoryHi: 'सिंचाई निर्णय (Irrigation)',
      recommendationHi: 'शाम के समय हल्की सिंचाई करें ताकि फसल को गर्मी के तनाव से बचाया जा सके।',
      reasonWhyHi: `क्योंकि वर्तमान तापमान ${currentTemp}°C है और बारिश की संभावना कम (${todayRainProb}%) है।`,
      isCaution: false,
    });
  } else {
    tasks.push({
      taskCategoryHi: 'सिंचाई निर्णय (Irrigation)',
      recommendationHi: 'मिट्टी की नमी जांचकर आवश्यकतानुसार सुबह या शाम सिंचाई कर सकते हैं।',
      reasonWhyHi: `क्योंकि तापमान (${currentTemp}°C) सामान्य है और 3-दिन में भारी बारिश की संभावना कम (${max3DayRainProb}%) है।`,
      isCaution: false,
    });
  }

  if (windSpeed >= 15 || todayRainProb >= 40) {
    tasks.push({
      taskCategoryHi: 'छिड़काव सलाह (Spraying)',
      recommendationHi: 'आज पर्ण छिड़काव (Foliar Spray) स्थगित करें।',
      reasonWhyHi: `क्योंकि हवा की गति ${windSpeed} km/h (सीमा ≥15 km/h) या आज बारिश की संभावना ${todayRainProb}% (सीमा ≥40%) होने से दवा बहने/उड़ने का जोखिम है।`,
      isCaution: true,
    });
  } else {
    tasks.push({
      taskCategoryHi: 'छिड़काव सलाह (Spraying)',
      recommendationHi: 'यदि आवश्यक हो, तो सुबह या शाम शांत हवा में छिड़काव के लिए मौसम अनुकूल है।',
      reasonWhyHi: `क्योंकि हवा की गति सामान्य (${windSpeed} km/h) है और आज बारिश की संभावना मात्र ${todayRainProb}% है।`,
      isCaution: false,
    });
  }

  if (max3DayRainProb >= 45 || humidity >= 80) {
    tasks.push({
      taskCategoryHi: 'कटाई एवं भंडारण (Harvest)',
      recommendationHi: 'कटी हुई उपज को तिरपाल से ढककर ऊँचे व सूखे स्थान पर सुरक्षित रखें।',
      reasonWhyHi: `क्योंकि हवा में नमी ${humidity}% है और 3-दिन की बारिश संभावना ${max3DayRainProb}% है।`,
      isCaution: true,
    });
  } else {
    tasks.push({
      taskCategoryHi: 'निराई-गुड़ाई एवं निरीक्षण (Field Work)',
      recommendationHi: 'निराई-गुड़ाई और फसल के निचले पत्तों के निरीक्षण के लिए मौसम अनुकूल है।',
      reasonWhyHi: `क्योंकि बारिश की संभावना कम है और हवा में सापेक्षिक नमी ${humidity}% संतुलित है।`,
      isCaution: false,
    });
  }

  return tasks;
}

/**
 * 7 Verified Government Schemes with Multi-Condition Rules
 * Audit Fix #3, #7, #17:
 * - Honest compilation attribution (never claims automated live verification).
 * - Checks all criteria (Land, Acreage Limit with scheme-specific message, eKYC, Income Tax, Irrigation, Crop Sown).
 */
export const VERIFIED_SCHEMES: GovernmentSchemeRule[] = [
  {
    id: 'pm_kisan',
    nameHi: 'प्रधानमंत्री किसान सम्मान निधि (PM-KISAN)',
    nameEn: 'PM-KISAN Samman Nidhi',
    departmentHi: 'कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार',
    scope: 'केंद्र सरकार (सभी राज्य)',
    applicableStates: ['ALL'],
    benefitSummaryHi:
      'पात्र किसान परिवारों को ₹6,000 प्रति वर्ष (₹2,000 की तीन समान किस्तों में सीधे आधार-लिंक्ड बैंक खाते में DBT के माध्यम से)।',
    benefitSummaryEn: '₹6,000 per year in three equal installments of ₹2,000 via Direct Benefit Transfer.',
    eligibilityCriteria: [
      {
        id: 'land_record',
        labelHi: 'कृषि योग्य भूमि किसान के नाम पर दर्ज होनी चाहिए (AgriStack / भूलेख)',
        labelEn: 'Cultivable land recorded in farmer name',
        requiresLandOwnership: true,
      },
      {
        id: 'ekyc',
        labelHi: 'आधार e-KYC और बैंक खाते में NPCI/DBT सीडिंग सक्रिय होनी चाहिए',
        labelEn: 'Active Aadhaar e-KYC and NPCI bank seeding',
        requiresEkyc: true,
      },
      {
        id: 'tax_exclusion',
        labelHi: 'परिवार का कोई सदस्य आयकर दाता या संवैधानिक/सरकारी पद पर न हो',
        labelEn: 'Not an Income Tax payer or institutional holder',
        excludesIncomeTaxPayer: true,
      },
    ],
    requiredDocumentsHi: [
      'आधार कार्ड (मोबाइल नंबर से जुड़ा हुआ)',
      'खतौनी / भूमि स्वामित्व प्रमाण (Farmer Registry / खसरा-खतौनी)',
      'आधार-सीडेड बैंक पासबुक',
    ],
    applicationStepsHi: [
      '1. आधिकारिक पोर्टल pmkisan.gov.in या नजदीकी जन सेवा केंद्र (CSC) पर जाएँ।',
      '2. "New Farmer Registration" चुनें और आधार व राज्य विवरण दर्ज करें।',
      '3. भूमि विवरण (खतौनी) अपलोड करें और OTP/बायोमेट्रिक द्वारा e-KYC पूर्ण करें।',
      '4. "Know Your Status" सेक्शन में पंजीकरण संख्या से किस्त की स्थिति जांचें।',
    ],
    deadlineHi: 'वर्ष भर खुला (अगली किस्त से पहले e-KYC और भूलेख सत्यापन अनिवार्य)',
    officialPortalUrl: 'https://pmkisan.gov.in',
    helplineNumber: '155261 / 011-24300606',
    sourceTier: 'आधिकारिक पोर्टल नियम सारांश (pmkisan.gov.in)',
    compilationNoteHi: 'संदर्भ नियम संकलन: 2025-26 (आवेदन से पूर्व आधिकारिक पोर्टल पर नवीनतम सूचना देखें)',
    exclusionsHi: 'संस्थागत भूमिधारक, आयकर दाता, और ₹10,000/माह से अधिक पेंशनभोगी अपात्र हैं।',
  },
  {
    id: 'pmfby',
    nameHi: 'प्रधानमंत्री फसल बीमा योजना (PMFBY)',
    nameEn: 'Pradhan Mantri Fasal Bima Yojana',
    departmentHi: 'कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार',
    scope: 'केंद्र एवं राज्य सरकार',
    applicableStates: ['ALL'],
    benefitSummaryHi:
      'प्राकृतिक आपदा, सूखा, बाढ़, ओलावृष्टि या रोग से फसल नुकसान पर बीमा सुरक्षा। किसान प्रीमियम: खरीफ 2%, रबी 1.5%, बागवानी/वाणिज्यिक 5%।',
    benefitSummaryEn: 'Crop insurance against natural calamities. Farmer premium: Kharif 2%, Rabi 1.5%, Commercial 5%.',
    eligibilityCriteria: [
      {
        id: 'crop_sown',
        labelHi: 'अधिसूचित क्षेत्र में अधिसूचित फसल की बुवाई की गई हो',
        labelEn: 'Notified crop sown in notified area',
        requiresCropSown: true,
      },
      {
        id: 'land_or_tenant',
        labelHi: 'भूमि स्वामी और बटाईदार/किरायेदार किसान दोनों पात्र',
        labelEn: 'Landowner or tenant farmer with valid land record',
        requiresLandOwnership: true,
      },
    ],
    requiredDocumentsHi: [
      'आधार कार्ड और बैंक खाता पासबुक',
      'खतौनी / भू-अभिलेख या बटाईदार सहमति पत्र',
      'फसल बुवाई प्रमाण पत्र (पटवारी/लेखपाल या स्व-घोषणा)',
    ],
    applicationStepsHi: [
      '1. बुवाई के तुरंत बाद pmfby.gov.in, KCC बैंक शाखा, या CSC केंद्र पर संपर्क करें।',
      '2. अपनी अधिसूचित फसल और खेत का रकबा दर्ज कर प्रीमियम जमा करें।',
      '3. फसल नुकसान होने पर 72 घंटे के भीतर क्रॉप इंश्योरेंस ऐप या हेल्पलाइन 14447 पर सूचना दें।',
    ],
    deadlineHi: 'रबी सीजन: प्रायः 31 दिसंबर तक; खरीफ सीजन: प्रायः 31 जुलाई तक (राज्य अधिसूचना अनुसार)',
    officialPortalUrl: 'https://pmfby.gov.in',
    helplineNumber: '14447',
    sourceTier: 'आधिकारिक पोर्टल नियम सारांश (pmfby.gov.in)',
    compilationNoteHi: 'संदर्भ नियम संकलन: 2025-26 (राज्य-वार कट-ऑफ तिथि पोर्टल पर जांचें)',
    exclusionsHi: 'नुकसान की सूचना घटना के 72 घंटे के भीतर देना अनिवार्य है।',
  },
  {
    id: 'kcc_credit',
    nameHi: 'किसान क्रेडिट कार्ड (KCC एवं 4% ब्याज सहायता)',
    nameEn: 'Kisan Credit Card (Modified Interest Subvention)',
    departmentHi: 'वित्तीय सेवाएं विभाग एवं नाबार्ड (NABARD)',
    scope: 'केंद्र सरकार (सभी बैंक शाखाएं)',
    applicableStates: ['ALL'],
    benefitSummaryHi:
      'फसल उत्पादन, खाद-बीज और पशुपालन हेतु सस्ता ऋण। समय पर भुगतान करने पर ₹3 लाख तक के फसल ऋण पर प्रभावी ब्याज दर मात्र 4% प्रति वर्ष।',
    benefitSummaryEn: 'Short-term crop loan up to ₹3 Lakh at effective 4% p.a. interest rate on timely repayment.',
    eligibilityCriteria: [
      {
        id: 'active_farmer',
        labelHi: 'व्यक्तिगत/संयुक्त किसान, बटाईदार या स्वयं सहायता समूह (कृषि भूमि सहित)',
        labelEn: 'Active cultivator with land/tenancy record',
        requiresLandOwnership: true,
      },
      {
        id: 'ekyc_bank',
        labelHi: 'आधार KYC और सक्रिय बैंक खाता उपलब्ध हो',
        labelEn: 'Completed Aadhaar KYC and bank account',
        requiresEkyc: true,
      },
    ],
    requiredDocumentsHi: [
      'आधार कार्ड, पैन कार्ड एवं पासपोर्ट साइज फोटो',
      'भूमि अभिलेख (खसरा-खतौनी) और फसल विवरण',
      'बैंक शाखा का भरा हुआ KCC आवेदन प्रपत्र',
    ],
    applicationStepsHi: [
      '1. अपने नजदीकी राष्ट्रीयकृत/ग्रामीण बैंक शाखा या pmkisan.gov.in से KCC फॉर्म प्राप्त करें।',
      '2. पीएम-किसान लाभार्थियों के लिए 1-पृष्ठ का सरल KCC फॉर्म उपलब्ध है।',
      '3. बैंक द्वारा भूमि रकबा और फसल लागत मानक (Scale of Finance) के आधार पर सीमा तय की जाती है।',
    ],
    deadlineHi: 'पूरे वर्ष बैंक शाखाओं में आवेदन खुला',
    officialPortalUrl: 'https://pmkisan.gov.in',
    helplineNumber: '1800-180-1551',
    sourceTier: 'RBI / NABARD आधिकारिक दिशानिर्देश सारांश',
    compilationNoteHi: 'संदर्भ नियम संकलन: 2025-26',
    exclusionsHi: '3% अतिरिक्त ब्याज छूट केवल 1 वर्ष के भीतर समय पर ऋण चुकाने वाले किसानों को मिलती है।',
  },
  {
    id: 'pmksy_micro',
    nameHi: 'प्रधानमंत्री कृषि सिंचाई योजना (Per Drop More Crop)',
    nameEn: 'PMKSY Micro Irrigation (Drip & Sprinkler)',
    departmentHi: 'कृषि एवं किसान कल्याण विभाग',
    scope: 'केंद्र एवं राज्य साझा योजना',
    applicableStates: ['ALL'],
    benefitSummaryHi:
      'ड्रिप और स्प्रिंकलर सिंचाई संयंत्र लगाने पर लघु एवं सीमांत किसानों को 55% तथा अन्य किसानों को 45% सरकारी अनुदान (राज्य अतिरिक्त टॉप-अप दे सकते हैं)।',
    benefitSummaryEn: '55% subsidy for small/marginal farmers and 45% for other farmers on Drip/Sprinkler irrigation.',
    eligibilityCriteria: [
      {
        id: 'land_water',
        labelHi: 'किसान के पास कृषि भूमि और सिंचाई जल स्रोत (बोरवेल/कुआँ/नहर) उपलब्ध हो',
        labelEn: 'Agricultural land and confirmed irrigation water source',
        requiresLandOwnership: true,
        requiresIrrigationSource: true,
      },
      {
        id: 'small_marginal',
        labelHi: '5 एकड़ (2 हेक्टेयर) तक के लघु एवं सीमांत किसानों को उच्च अनुदान (55%)',
        labelEn: 'Up to 5 acres for 55% Small/Marginal subsidy tier',
        maxAcresLimit: 5.0,
        exceededLimitNoteHi:
          'आपकी भूमि 5 एकड़ से अधिक है, इसलिए PMKSY में लघु/सीमांत (55%) के स्थान पर सामान्य श्रेणी (45%) का अनुदान लागू होगा।',
      },
    ],
    requiredDocumentsHi: [
      'आधार कार्ड और बैंक खाता विवरण',
      'खतौनी / भूमि नक्शा और सिंचाई स्रोत प्रमाण',
      'पंजीकृत विक्रेता का कोटेशन एवं मृदा/जल विवरण',
    ],
    applicationStepsHi: [
      '1. pmksy.gov.in या अपने राज्य के कृषि/बागवानी पोर्टल (जैसे upagriculture.com) पर पंजीकरण करें।',
      '2. अनुमोदित कंपनी का चयन करें और भौतिक सत्यापन के बाद अनुदान प्राप्त करें।',
    ],
    deadlineHi: 'राज्य कृषि विभाग के वार्षिक लक्ष्य एवं टोकन जारी होने के अनुसार',
    officialPortalUrl: 'https://pmksy.gov.in',
    helplineNumber: '1800-180-1551',
    sourceTier: 'PMKSY आधिकारिक दिशानिर्देश सारांश',
    compilationNoteHi: 'संदर्भ नियम संकलन: 2025-26',
    exclusionsHi: 'एक ही भूमि पर 7 वर्षों के भीतर दोबारा समान संयंत्र पर अनुदान देय नहीं होता।',
  },
  {
    id: 'up_agristack_kusum',
    nameHi: 'फार्मर रजिस्ट्री एवं पीएम-कुसुम सोलर पंप (AgriStack & PM-KUSUM)',
    nameEn: 'Farmer Registry & PM-KUSUM Solar Pump',
    departmentHi: 'कृषि विभाग एवं नवीन और नवीकरणीय ऊर्जा मंत्रालय (MNRE)',
    scope: 'केंद्र एवं राज्य कृषि विभाग',
    applicableStates: ['उत्तर प्रदेश', 'ALL'],
    benefitSummaryHi:
      'AgriStack फार्मर आईडी से सरकारी योजनाओं का त्वरित लाभ, तथा पीएम-कुसुम के अंतर्गत 2 HP से 10 HP सोलर पंप पर 60% तक सरकारी अनुदान।',
    benefitSummaryEn: 'Up to 60% government subsidy on 2 HP to 10 HP standalone solar agricultural pumps.',
    eligibilityCriteria: [
      {
        id: 'up_registry',
        labelHi: 'AgriStack पोर्टल पर किसान रजिस्ट्री (Farmer ID), आधार e-KYC और भूलेख लिंक होना चाहिए',
        labelEn: 'AgriStack Farmer ID, Aadhaar e-KYC and land ownership',
        requiresLandOwnership: true,
        requiresEkyc: true,
      },
      {
        id: 'solar_water',
        labelHi: 'सोलर पंप हेतु सिंचाई/बोरिंग जल स्रोत होना चाहिए',
        labelEn: 'Active borewell or water source for solar pump installation',
        requiresIrrigationSource: true,
      },
    ],
    requiredDocumentsHi: [
      'आधार कार्ड एवं आधार से लिंक मोबाइल नंबर',
      'खतौनी की फर्द (गाटा संख्या सहित)',
      'किसान पंजीकरण संख्या (राज्य कृषि पोर्टल)',
    ],
    applicationStepsHi: [
      '1. फार्मर आईडी हेतु agristack.gov.in या पंचायत कैंप/CSC में आधार व खतौनी लिंक कराएँ।',
      '2. सोलर पंप बुकिंग हेतु pmkusum.mnre.gov.in या राज्य कृषि पोर्टल पर टोकन जनरेट करें।',
    ],
    deadlineHi: 'फार्मर रजिस्ट्री अभियान चालू; सोलर पंप बुकिंग मंडलवार टोकन तिथियों के अनुसार',
    officialPortalUrl: 'https://pmkusum.mnre.gov.in',
    helplineNumber: '1800-180-3333',
    sourceTier: 'MNRE / AgriStack आधिकारिक संदर्भ सारांश',
    compilationNoteHi: 'संदर्भ नियम संकलन: 2025-26',
    exclusionsHi: 'बिना आधिकारिक सरकारी पोर्टल टोकन के किसी निजी एजेंट या अनधिकृत वेबसाइट को भुगतान न करें।',
  },
  {
    id: 'soil_health_card',
    nameHi: 'मृदा स्वास्थ्य कार्ड योजना (Soil Health Card)',
    nameEn: 'Soil Health Card Scheme',
    departmentHi: 'कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार',
    scope: 'केंद्र एवं राज्य सरकार',
    applicableStates: ['ALL'],
    benefitSummaryHi:
      'खेत की मिट्टी में 12 प्रमुख पोषक तत्वों (N, P, K, pH, ऑर्गेनिक कार्बन, जिंक, सल्फर आदि) की जाँच और फसल-वार संतुलित खाद की सिफारिश।',
    benefitSummaryEn: 'Testing of 12 soil parameters (N, P, K, pH, OC, micronutrients) and crop-wise fertilizer recommendations.',
    eligibilityCriteria: [
      {
        id: 'active_plot',
        labelHi: 'किसान के पास खेती योग्य भूमि उपलब्ध हो',
        labelEn: 'Cultivable farm plot available for soil sampling',
        requiresLandOwnership: true,
      },
    ],
    requiredDocumentsHi: [
      'आधार कार्ड एवं मोबाइल नंबर',
      'खेत का खसरा/गाटा संख्या और मिट्टी का नमूना',
    ],
    applicationStepsHi: [
      '1. बुवाई से पहले खेत के 4-5 स्थानों से 15 सेमी गहराई से मिट्टी का नमूना लें।',
      '2. नजदीकी राजकीय मृदा परीक्षण प्रयोगशाला, KVK या कृषि सहायक को नमूना दें।',
      '3. soilhealth.dac.gov.in पर मोबाइल नंबर से अपना मृदा स्वास्थ्य कार्ड डाउनलोड करें।',
    ],
    deadlineHi: 'रबी और खरीफ बुवाई से पूर्व पूरे वर्ष उपलब्ध',
    officialPortalUrl: 'https://soilhealth.dac.gov.in',
    helplineNumber: '1800-180-1551',
    sourceTier: 'आधिकारिक पोर्टल संदर्भ (soilhealth.dac.gov.in)',
    compilationNoteHi: 'संदर्भ नियम संकलन: 2025-26',
    exclusionsHi: 'खाद डालने के तुरंत बाद या मेड़ के बिल्कुल पास से मिट्टी का नमूना न लें।',
  },
  {
    id: 'pkvy_organic',
    nameHi: 'परम्परागत कृषि विकास योजना (PKVY जैविक खेती)',
    nameEn: 'Paramparagat Krishi Vikas Yojana (Organic Farming)',
    departmentHi: 'कृषि एवं किसान कल्याण मंत्रालय',
    scope: 'केंद्र एवं राज्य साझा योजना',
    applicableStates: ['ALL'],
    benefitSummaryHi:
      'जैविक खेती (Organic Farming) क्लस्टर में जुड़ने पर 3 वर्षों में ₹31,500 प्रति हेक्टेयर तक की सहायता (जैविक बीज, जीवामृत, वर्मीकम्पोस्ट और प्रमाणीकरण हेतु)।',
    benefitSummaryEn: 'Financial assistance up to ₹31,500/ha over 3 years for organic inputs, certification, and cluster farming.',
    eligibilityCriteria: [
      {
        id: 'organic_land',
        labelHi: 'किसान के पास कृषि भूमि हो (सहायता अधिकतम 2 हेक्टेयर / 5 एकड़ तक)',
        labelEn: 'Agricultural land ownership (assistance capped at 2 hectares / 5 acres)',
        requiresLandOwnership: true,
        maxAcresLimit: 5.0,
        exceededLimitNoteHi:
          'PKVY योजना के तहत क्लस्टर अनुदान अधिकतम 2 हेक्टेयर (लगभग 5 एकड़) की सीमा तक देय होता है; शेष भूमि पर भी जैविक खेती कर सकते हैं।',
      },
    ],
    requiredDocumentsHi: ['आधार कार्ड और बैंक खाता पासबुक', 'भूमि खतौनी / खसरा नकल'],
    applicationStepsHi: [
      '1. अपने ब्लॉक के कृषि कार्यालय या pgsindia-ncof.gov.in पोर्टल के माध्यम से 20+ किसानों के क्लस्टर में पंजीकरण करें।',
      '2. PGS-India जैविक प्रमाणीकरण मानकों का पालन करें और DBT से अनुदान प्राप्त करें।',
    ],
    deadlineHi: 'राज्य कृषि विभाग के क्लस्टर चयन के अनुसार',
    officialPortalUrl: 'https://pgsindia-ncof.gov.in',
    helplineNumber: '1800-180-1551',
    sourceTier: 'NCOF / कृषि मंत्रालय संदर्भ सारांश',
    compilationNoteHi: 'संदर्भ नियम संकलन: 2025-26',
    exclusionsHi: 'पंजीकृत जैविक क्लस्टर में रासायनिक कीटनाशक और सिंथेटिक उर्वरकों का प्रयोग वर्जित है।',
  },
];

export function evaluateSchemeForFarmer(
  scheme: GovernmentSchemeRule,
  profile: FarmerProfile,
  cropCycles: CropCycle[]
): SchemeEvaluationResult {
  const landAcres = profile.landSizeAcres || 0;
  const hasCrops = cropCycles.length > 0;
  const hasIrrigation =
    Boolean(profile.irrigationType) &&
    !profile.irrigationType.includes('सिंचाई स्रोत चुनें') &&
    !profile.irrigationType.toLowerCase().includes('वर्षा आधारित');

  const criteriaResults: EvaluatedCriterion[] = scheme.eligibilityCriteria.map((crit) => {
    if (crit.excludesIncomeTaxPayer && profile.isIncomeTaxPayer) {
      return {
        labelHi: crit.labelHi,
        labelEn: crit.labelEn,
        status: 'NOT_MET',
        explanationHi:
          'आपकी प्रोफ़ाइल में "आयकर दाता: हाँ" दर्ज है। योजना नियमों के अनुसार आयकर दाता परिवार पात्र नहीं हैं।',
      };
    }

    if (crit.requiresLandOwnership && landAcres <= 0) {
      return {
        labelHi: crit.labelHi,
        labelEn: crit.labelEn,
        status: 'NOT_MET',
        explanationHi:
          'आपकी प्रोफ़ाइल में कृषि भूमि 0 एकड़ दर्ज है। कृपया "मेरी खेती" में अपना भूमि रकबा अपडेट करें।',
      };
    }

    if (crit.requiresIrrigationSource && !hasIrrigation) {
      return {
        labelHi: crit.labelHi,
        labelEn: crit.labelEn,
        status: 'NEEDS_VERIFICATION',
        explanationHi:
          'इस योजना के लिए सिंचाई जल स्रोत (बोरवेल/कुआँ/नहर) आवश्यक है। कृपया प्रोफ़ाइल में सिंचाई स्रोत चुनें।',
      };
    }

    if (crit.maxAcresLimit !== undefined && landAcres > crit.maxAcresLimit) {
      return {
        labelHi: crit.labelHi,
        labelEn: crit.labelEn,
        status: 'NEEDS_VERIFICATION',
        explanationHi:
          crit.exceededLimitNoteHi ||
          `आपकी भूमि (${landAcres} एकड़) निर्धारित सीमा (${crit.maxAcresLimit} एकड़) से अधिक है; कृपया योजना के श्रेणी नियम देखें।`,
      };
    }

    if (crit.requiresCropSown && !hasCrops) {
      return {
        labelHi: crit.labelHi,
        labelEn: crit.labelEn,
        status: 'NEEDS_VERIFICATION',
        explanationHi:
          '"मेरी खेती" में अभी कोई सक्रिय फसल दर्ज नहीं है। आवेदन के समय बुवाई प्रमाण आवश्यक होगा।',
      };
    }

    if (crit.requiresEkyc && !profile.hasAadhaarEkyc) {
      return {
        labelHi: crit.labelHi,
        labelEn: crit.labelEn,
        status: 'NEEDS_VERIFICATION',
        explanationHi:
          'प्रोफ़ाइल में आधार e-KYC अपूर्ण है। कृपया आधिकारिक पोर्टल या CSC पर अपना आधार e-KYC और बैंक NPCI सीडिंग सत्यापित करें।',
      };
    }

    // All required checks for this criterion passed!
    const reasons: string[] = [];
    if (crit.requiresLandOwnership) reasons.push(`${landAcres} एकड़ भूमि दर्ज`);
    if (crit.requiresIrrigationSource) reasons.push(`सिंचाई: ${profile.irrigationType}`);
    if (crit.requiresEkyc) reasons.push('आधार e-KYC सक्रिय');
    if (crit.excludesIncomeTaxPayer) reasons.push('आयकर अपवाद श्रेणी से बाहर');
    if (crit.requiresCropSown) reasons.push(`सक्रिय फसल (${cropCycles.map((c) => c.cropName).join(', ')})`);
    if (crit.maxAcresLimit !== undefined && landAcres <= crit.maxAcresLimit) {
      reasons.push(`भूमि (${landAcres} एकड़) ${crit.maxAcresLimit} एकड़ सीमा के भीतर`);
    }

    return {
      labelHi: crit.labelHi,
      labelEn: crit.labelEn,
      status: 'LIKELY_MET',
      explanationHi: `प्रोफ़ाइल के अनुसार शर्त पूरी: ${reasons.join(' • ')}।`,
    };
  });

  const hasNotMet = criteriaResults.some((c) => c.status === 'NOT_MET');
  const allMet = criteriaResults.every((c) => c.status === 'LIKELY_MET');

  const overallStatus: CriterionStatus = hasNotMet
    ? 'NOT_MET'
    : allMet
    ? 'LIKELY_MET'
    : 'NEEDS_VERIFICATION';

  const overallSummaryHi =
    overallStatus === 'NOT_MET'
      ? 'प्रोफ़ाइल विवरण के अनुसार एक या अधिक अनिवार्य शर्तें पूरी नहीं हो रही हैं'
      : overallStatus === 'LIKELY_MET'
      ? 'प्रोफ़ाइल विवरण के अनुसार आप प्राथमिक रूप से पात्र प्रतीत होते हैं'
      : 'आंशिक रूप से पात्र — कुछ दस्तावेज़ों/शर्तों का सत्यापन आवश्यक है';

  return {
    scheme,
    criteriaResults,
    overallStatus,
    overallSummaryHi,
    officialDisclaimerHi:
      'अस्वीकरण: यह केवल आपकी प्रोफ़ाइल पर आधारित प्राथमिक नियम जाँच है; अंतिम पात्रता एवं भुगतान का निर्णय संबंधित सरकारी विभाग के आधिकारिक पोर्टल द्वारा किया जाता है।',
  };
}

/**
 * Transparent Mandi Benchmark Quotes & Official MSP Reference
 * Audit Fix #2 & #10:
 * - Never pretends static code prices are live AgmarkNet feeds.
 * - Explicitly labels each card as an Offline Historical Reference Benchmark + Official Government MSP (RMS 2025-26 / KMS 2024-25).
 * - Farmers can enter their actual local mandi quote to calculate exact net proceeds.
 */
export const MANDI_REFERENCE_QUOTES: MandiReferenceQuote[] = [
  {
    id: 'wheat_vns',
    cropNameHi: 'गेहूँ (Wheat)',
    cropNameEn: 'Wheat',
    varietyGrade: 'दारा / FAQ (HD-2967)',
    mandiNameHi: 'पहड़िया मंडी, वाराणसी (संदर्भ बेंचमार्क)',
    stateNameHi: 'उत्तर प्रदेश',
    districtNameHi: 'वाराणसी',
    modalPricePerQuintalInr: 2510,
    minPriceInr: 2425,
    maxPriceInr: 2580,
    mspReferenceInr: 2425,
    mspSeasonLabelHi: 'रबी विपणन सीजन (RMS 2025-26) आधिकारिक MSP: ₹2,425/क्विंटल (RMS 2024-25 में ₹2,275 था)',
    distanceKmEstimate: 14,
    benchmarkNoteHi: 'ऑफ़लाइन उदाहरण बेंचमार्क (लाइव मंडी भाव नहीं)',
    sourceLabel: 'स्रोत: CACP/सरकारी MSP संदर्भ (₹2,425) + ऑफ़लाइन मंडी बेंचमार्क उदाहरण',
  },
  {
    id: 'wheat_lko',
    cropNameHi: 'गेहूँ (Wheat)',
    cropNameEn: 'Wheat',
    varietyGrade: 'शरबती / FAQ',
    mandiNameHi: 'सीतापुर रोड मंडी, लखनऊ (संदर्भ बेंचमार्क)',
    stateNameHi: 'उत्तर प्रदेश',
    districtNameHi: 'लखनऊ',
    modalPricePerQuintalInr: 2565,
    minPriceInr: 2460,
    maxPriceInr: 2630,
    mspReferenceInr: 2425,
    mspSeasonLabelHi: 'रबी विपणन सीजन (RMS 2025-26) आधिकारिक MSP: ₹2,425/क्विंटल',
    distanceKmEstimate: 42,
    benchmarkNoteHi: 'ऑफ़लाइन उदाहरण बेंचमार्क (लाइव मंडी भाव नहीं)',
    sourceLabel: 'स्रोत: सरकारी MSP संदर्भ + ऑफ़लाइन मंडी बेंचमार्क उदाहरण',
  },
  {
    id: 'wheat_knl',
    cropNameHi: 'गेहूँ (Wheat)',
    cropNameEn: 'Wheat',
    varietyGrade: 'FAQ ग्रेड-A',
    mandiNameHi: 'करनाल अनाज मंडी (संदर्भ बेंचमार्क)',
    stateNameHi: 'हरियाणा',
    districtNameHi: 'करनाल',
    modalPricePerQuintalInr: 2490,
    minPriceInr: 2425,
    maxPriceInr: 2540,
    mspReferenceInr: 2425,
    mspSeasonLabelHi: 'रबी विपणन सीजन (RMS 2025-26) आधिकारिक MSP: ₹2,425/क्विंटल',
    distanceKmEstimate: 25,
    benchmarkNoteHi: 'ऑफ़लाइन उदाहरण बेंचमार्क (लाइव मंडी भाव नहीं)',
    sourceLabel: 'स्रोत: सरकारी MSP संदर्भ + ऑफ़लाइन मंडी बेंचमार्क उदाहरण',
  },
  {
    id: 'paddy_vns',
    cropNameHi: 'धान (Paddy)',
    cropNameEn: 'Paddy',
    varietyGrade: 'सामान्य (Common FAQ)',
    mandiNameHi: 'पहड़िया मंडी, वाराणसी (संदर्भ बेंचमार्क)',
    stateNameHi: 'उत्तर प्रदेश',
    districtNameHi: 'वाराणसी',
    modalPricePerQuintalInr: 2320,
    minPriceInr: 2210,
    maxPriceInr: 2385,
    mspReferenceInr: 2300,
    mspSeasonLabelHi: 'खरीफ विपणन सीजन (KMS 2024-25) आधिकारिक MSP: ₹2,300/क्विंटल (ग्रेड-A: ₹2,320)',
    distanceKmEstimate: 14,
    benchmarkNoteHi: 'ऑफ़लाइन उदाहरण बेंचमार्क (लाइव मंडी भाव नहीं)',
    sourceLabel: 'स्रोत: सरकारी MSP संदर्भ (₹2,300) + ऑफ़लाइन मंडी बेंचमार्क उदाहरण',
  },
  {
    id: 'paddy_bundi',
    cropNameHi: 'धान (Paddy)',
    cropNameEn: 'Paddy',
    varietyGrade: 'बासमती / 1509',
    mandiNameHi: 'कुंवारती कृषि उपज मंडी, बूंदी (संदर्भ बेंचमार्क)',
    stateNameHi: 'राजस्थान',
    districtNameHi: 'बूंदी',
    modalPricePerQuintalInr: 3150,
    minPriceInr: 2850,
    maxPriceInr: 3380,
    mspReferenceInr: 2300,
    mspSeasonLabelHi: 'सामान्य धान आधिकारिक MSP संदर्भ: ₹2,300/क्विंटल',
    distanceKmEstimate: 30,
    benchmarkNoteHi: 'ऑफ़लाइन उदाहरण बेंचमार्क (लाइव मंडी भाव नहीं)',
    sourceLabel: 'स्रोत: ऑफ़लाइन मंडी बेंचमार्क उदाहरण',
  },
  {
    id: 'mustard_jpr',
    cropNameHi: 'सरसों (Mustard)',
    cropNameEn: 'Mustard',
    varietyGrade: 'काली सरसों (42% तेल)',
    mandiNameHi: 'कूकरखेड़ा मंडी, जयपुर (संदर्भ बेंचमार्क)',
    stateNameHi: 'राजस्थान',
    districtNameHi: 'जयपुर',
    modalPricePerQuintalInr: 5980,
    minPriceInr: 5720,
    maxPriceInr: 6150,
    mspReferenceInr: 5950,
    mspSeasonLabelHi: 'रबी विपणन सीजन (RMS 2025-26) आधिकारिक MSP: ₹5,950/क्विंटल (2024-25 में ₹5,650 था)',
    distanceKmEstimate: 22,
    benchmarkNoteHi: 'ऑफ़लाइन उदाहरण बेंचमार्क (लाइव मंडी भाव नहीं)',
    sourceLabel: 'स्रोत: सरकारी MSP संदर्भ (₹5,950) + ऑफ़लाइन मंडी बेंचमार्क उदाहरण',
  },
  {
    id: 'gram_sehore',
    cropNameHi: 'चना (Chickpea)',
    cropNameEn: 'Chickpea',
    varietyGrade: 'देसी FAQ',
    mandiNameHi: 'सीहोर कृषि उपज मंडी (संदर्भ बेंचमार्क)',
    stateNameHi: 'मध्य प्रदेश',
    districtNameHi: 'सीहोर',
    modalPricePerQuintalInr: 5740,
    minPriceInr: 5500,
    maxPriceInr: 5910,
    mspReferenceInr: 5650,
    mspSeasonLabelHi: 'रबी विपणन सीजन (RMS 2025-26) आधिकारिक MSP: ₹5,650/क्विंटल (2024-25 में ₹5,440 था)',
    distanceKmEstimate: 18,
    benchmarkNoteHi: 'ऑफ़लाइन उदाहरण बेंचमार्क (लाइव मंडी भाव नहीं)',
    sourceLabel: 'स्रोत: सरकारी MSP संदर्भ (₹5,650) + ऑफ़लाइन मंडी बेंचमार्क उदाहरण',
  },
  {
    id: 'potato_lko',
    cropNameHi: 'आलू (Potato)',
    cropNameEn: 'Potato',
    varietyGrade: 'कुफरी ज्योति / सफेद',
    mandiNameHi: 'दुबग्गा मंडी, लखनऊ (संदर्भ बेंचमार्क)',
    stateNameHi: 'उत्तर प्रदेश',
    districtNameHi: 'लखनऊ',
    modalPricePerQuintalInr: 1680,
    minPriceInr: 1450,
    maxPriceInr: 1820,
    mspReferenceInr: null,
    mspSeasonLabelHi: 'MSP लागू नहीं (बागवानी फसल — राज्य MIS या मंडी बोली पर आधारित)',
    distanceKmEstimate: 28,
    benchmarkNoteHi: 'ऑफ़लाइन उदाहरण बेंचमार्क (लाइव मंडी भाव नहीं)',
    sourceLabel: 'स्रोत: ऑफ़लाइन मंडी बेंचमार्क उदाहरण',
  },
];

export function calculateMandiComparison(
  quote: MandiReferenceQuote,
  quantityQuintals: number,
  transportCostInr: number,
  mandiHandlingCostInr: number,
  customPricePerQuintal?: number | null
): MandiComparisonOption {
  const safeQty = Math.max(0, quantityQuintals || 0);
  const isCustom = typeof customPricePerQuintal === 'number' && customPricePerQuintal > 0;
  const effectivePrice = isCustom ? customPricePerQuintal! : quote.modalPricePerQuintalInr;
  const gross = safeQty * effectivePrice;
  const totalCost = Math.max(0, transportCostInr || 0) + Math.max(0, mandiHandlingCostInr || 0);
  const net = gross - totalCost;
  const netPerQuintal = safeQty > 0 ? net / safeQty : 0;
  const vsMsp = quote.mspReferenceInr !== null ? netPerQuintal - quote.mspReferenceInr : null;

  return {
    quote,
    effectivePricePerQuintalInr: effectivePrice,
    customPricePerQuintalInr: effectivePrice,
    isCustomUserPrice: isCustom,
    quantityQuintals: safeQty,
    grossProceedsInr: gross,
    transportCostInr: Math.max(0, transportCostInr || 0),
    mandiHandlingCostInr: Math.max(0, mandiHandlingCostInr || 0),
    estimatedNetProceedsInr: net,
    netPerQuintalInr: netPerQuintal,
    vsMspDiffPerQuintalInr: vsMsp,
  };
}

/**
 * Deterministic Farm Economics & Per-Field Cost Calculator
 * Audit Fix #2: Supports tracking and aggregating expenses both by Category AND by Field (`fieldName`).
 */
export function calculateFarmEconomics(
  transactions: FarmTransaction[],
  totalAcres: number,
  expectedYieldQuintals: number
): FarmEconomicsSummary {
  const expenses = transactions.filter((t) => t.txType === 'EXPENSE');
  const sales = transactions.filter((t) => t.txType === 'SALE');

  const totalExpenses = expenses.reduce((sum, t) => sum + (Number(t.amountInr) || 0), 0);
  const totalSales = sales.reduce((sum, t) => sum + (Number(t.amountInr) || 0), 0);
  const netIncome = totalSales - totalExpenses;

  const safeAcres = totalAcres > 0 ? totalAcres : 1;
  const costPerAcre = totalExpenses / safeAcres;

  const soldQuintals = sales.reduce((sum, t) => sum + (Number(t.quantityQuintal) || 0), 0);
  const divisorQuintals =
    soldQuintals > 0 ? soldQuintals : expectedYieldQuintals > 0 ? expectedYieldQuintals : 0;
  const breakEvenPrice = divisorQuintals > 0 ? totalExpenses / divisorQuintals : null;

  const expenseByCategory: Record<string, number> = {};
  const expenseByField: Record<string, number> = {};

  for (const exp of expenses) {
    const cat = exp.category?.trim() || 'अन्य (Other)';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(exp.amountInr) || 0);

    const fld = exp.fieldName?.trim() || exp.cropName?.trim() || 'सामान्य खेत';
    expenseByField[fld] = (expenseByField[fld] || 0) + (Number(exp.amountInr) || 0);
  }

  return {
    totalExpensesInr: totalExpenses,
    totalSalesInr: totalSales,
    netIncomeInr: netIncome,
    totalAcres: safeAcres,
    costPerAcreInr: costPerAcre,
    totalSoldQuintals: soldQuintals,
    breakEvenPricePerQuintalInr: breakEvenPrice,
    expenseByCategory,
    expenseByField,
  };
}

export const CROP_GUIDANCE_LIBRARY: KnowledgeArticle[] = [
  {
    id: 'wheat_yellowing',
    titleHi: 'गेहूँ में पत्तियों का पीला पड़ना: नाइट्रोजन की कमी बनाम पीला रतुआ (Yellow Rust)',
    titleEn: 'Wheat Leaf Yellowing: Nitrogen Deficiency vs Yellow Rust',
    categoryHi: 'रोग एवं पोषण पहचान',
    cropHi: 'गेहूँ (Wheat)',
    summaryHi:
      'गेहूँ की पत्तियाँ पीली होने के 3 मुख्य कारण हो सकते हैं: (1) निचली पुरानी पत्तियों का पीला होना अक्सर नाइट्रोजन की कमी या अधिक सिंचाई से जड़ में ऑक्सीजन की कमी दर्शाता है; (2) पत्ते पर पीले रंग का पाउडर जो उंगलियों पर लगे, वह "पीला रतुआ (Yellow Rust)" हो सकता है; (3) नई पत्तियों का बीच से सफेद/पीला होना जिंक की कमी का संकेत है।',
    cautiousStepsHi: [
      'सबसे पहले प्रभावित पत्ती को उंगली से छूकर देखें — क्या पीला पाउडर हाथ में लग रहा है?',
      'निचली पत्तियाँ पीली हैं या ऊपर की नई पत्तियाँ? यह देखें कि समस्या पूरे खेत में है या केवल निचले जलभराव वाले हिस्से में।',
      'यदि खेत में पानी भरा है, तो तुरंत जल निकासी करें और बिना पुष्टि के कोई तेज़ फफूंदनाशक या कीटनाशक न मिलाएँ।',
      'पीला पाउडर दिखने पर नजदीकी कृषि विज्ञान केंद्र (KVK) या किसान कॉल सेंटर (1800-180-1551) से सम्पर्क करें।',
    ],
    safetyWarningHi:
      'केवल फोटो से पीला रतुआ और पोषक तत्व की कमी में 100% अंतर करना संभव नहीं है। बिना जाँच के दो रसायनों को मिलाकर छिड़काव कभी न करें।',
    sourceOrg: 'ऐप स्थानीय संदर्भ नोट्स (ICAR-IIWBR करनाल मानक सस्य सारांश पर आधारित)',
    sourceTier: 'स्थानीय कृषि संदर्भ पुस्तकालय',
    officialUrl: 'https://iiwbr.icar.gov.in',
  },
  {
    id: 'wheat_cri_irrigation',
    titleHi: 'गेहूँ में पहली सिंचाई (CRI अवस्था - बुवाई के 20-22 दिन बाद)',
    titleEn: 'Wheat First Irrigation (CRI Stage - 20-22 Days After Sowing)',
    categoryHi: 'सिंचाई एवं फसल कैलेंडर',
    cropHi: 'गेहूँ (Wheat)',
    summaryHi:
      'गेहूँ में मुकुट जड़ (Crown Root Initiation - CRI) अवस्था बुवाई के 20 से 22 दिन बाद आती है। इस समय सिंचाई में देरी होने से कल्ले कम निकलते हैं और पैदावार सीधे प्रभावित होती है।',
    cautiousStepsHi: [
      'बुवाई के 20-22 दिन बाद हल्की सिंचाई करें ताकि खेत में जलभराव न हो।',
      'सिंचाई के 2-3 दिन बाद जब पैर न धँसे (ओट आने पर) ही यूरिया की टॉप-ड्रेसिंग करें।',
      'तेज हवा या भारी बारिश की संभावना होने पर सिंचाई 2 दिन टालें ताकि फसल गिरे नहीं।',
    ],
    safetyWarningHi: 'खड़े पानी में यूरिया न डालें, इससे नाइट्रोजन का नुकसान (लीचिंग) होता है।',
    sourceOrg: 'ऐप स्थानीय संदर्भ नोट्स (KVK मानक सस्य क्रियाएँ)',
    sourceTier: 'स्थानीय कृषि संदर्भ पुस्तकालय',
    officialUrl: 'https://icar.org.in',
  },
  {
    id: 'paddy_stem_borer',
    titleHi: 'धान में तना छेदक (Stem Borer) और जीवाणु झुलसा (BLB) की पहचान',
    titleEn: 'Paddy Stem Borer and Bacterial Leaf Blight Identification',
    categoryHi: 'कीट एवं रोग प्रबंधन',
    cropHi: 'धान (Paddy)',
    summaryHi:
      'यदि धान की बीच वाली गोभ (गाभा) सूखकर आसानी से खिंच आती है ("डेड हार्ट"), तो यह तना छेदक कीट का लक्षण हो सकता है। यदि पत्तियों के किनारे ऊपर से नीचे की ओर सूख रहे हैं, तो यह जीवाणु झुलसा (BLB) हो सकता है।',
    cautiousStepsHi: [
      'सूखी गोभ को धीरे से खींचकर देखें — यदि आधार सड़ा हुआ और छेद युक्त है, तो तना छेदक की संभावना है।',
      'खेत में फेरोमोन ट्रैप या प्रकाश प्रपंश लगाकर कीट की संख्या का आकलन करें।',
      'जीवाणु झुलसा दिखने पर खेत से अतिरिक्त पानी निकालें और नाइट्रोजन खाद (यूरिया) का प्रयोग अस्थायी रूप से रोकें।',
    ],
    safetyWarningHi:
      'प्रारंभिक अवस्था में अनावश्यक ब्रॉड-स्पेक्ट्रम कीटनाशक के छिड़काव से मित्र कीट (मकड़ी, लेडीबर्ड) नष्ट हो जाते हैं।',
    sourceOrg: 'ऐप स्थानीय संदर्भ नोट्स (ICAR-NRRI कटक मानक पर आधारित)',
    sourceTier: 'स्थानीय कृषि संदर्भ पुस्तकालय',
    officialUrl: 'https://icar-nrri.in',
  },
  {
    id: 'mustard_aphid',
    titleHi: 'सरसों में माहू (Aphid / चेपा) की निगरानी एवं सुरक्षित नियंत्रण',
    titleEn: 'Mustard Aphid Monitoring and Safe Management',
    categoryHi: 'कीट प्रबंधन',
    cropHi: 'सरसों (Mustard)',
    summaryHi:
      'ठंड और बादल छाए रहने पर सरसों की फलियों और कोमल टहनियों पर छोटे हरे-पीले माहू कीट रस चूसते हैं, जिससे फलियाँ कमजोर रह जाती हैं।',
    cautiousStepsHi: [
      'खेत के चारों कोनों और बीच में 10-12 पौधों की ऊपरी टहनियों का निरीक्षण करें।',
      'शुरुआती अवस्था में केवल प्रभावित टहनियों को तोड़कर नष्ट करने से फैलाव रुकता है।',
      'खेत में पीले चिपचिपे ट्रैप (Yellow Sticky Traps) लगाएँ और नीम तेल (Azadirachtin 1500 ppm) आधारित सुरक्षित विकल्पों को प्राथमिकता दें।',
    ],
    safetyWarningHi:
      'मधुमक्खियों की सुरक्षा के लिए फूल खिलने की अवस्था में सुबह के समय कभी भी रसायन का छिड़काव न करें; आवश्यकता होने पर केवल शाम 4 बजे के बाद ही कृषि विशेषज्ञ की सलाह लें।',
    sourceOrg: 'ऐप स्थानीय संदर्भ नोट्स (ICAR-DRMR भरतपुर संदर्भ पर आधारित)',
    sourceTier: 'स्थानीय कृषि संदर्भ पुस्तकालय',
    officialUrl: 'https://www.drmr.res.in',
  },
  {
    id: 'cotton_whitefly',
    titleHi: 'कपास में सफेद मक्खी (Whitefly) और पत्ती मरोड़ समस्या',
    titleEn: 'Cotton Whitefly and Leaf Curl Monitoring',
    categoryHi: 'कीट एवं विषाणु निगरानी',
    cropHi: 'कपास (Cotton)',
    summaryHi:
      'कपास की पत्तियों के निचले हिस्से में सफेद छोटे कीट और पत्तियों पर चिपचिपा पदार्थ (हनीड्यू) सफेद मक्खी का संकेत है, जो लीफ कर्ल वायरस भी फैला सकती है।',
    cautiousStepsHi: [
      'सुबह के समय पत्ती को पलटकर देखें और खेत के मेड़ों से खरपतवार हटाएँ।',
      'अत्यधिक यूरिया के प्रयोग से बचें क्योंकि अधिक कोमल पत्तियाँ रस चूसक कीटों को आकर्षित करती हैं।',
      'सिंथेटिक पायरेथ्रॉइड के अंधाधुंध प्रयोग से सफेद मक्खी का प्रकोप बढ़ सकता है — KVK विशेषज्ञ से जाँच कराएँ।',
    ],
    safetyWarningHi:
      'कपास में दो कीटनाशकों का मनमाना मिश्रण (Tank Mix) फसल और किसान के स्वास्थ्य के लिए गंभीर जोखिम है।',
    sourceOrg: 'ऐप स्थानीय संदर्भ नोट्स (ICAR-CICR नागपुर संदर्भ पर आधारित)',
    sourceTier: 'स्थानीय कृषि संदर्भ पुस्तकालय',
    officialUrl: 'https://cicr.org.in',
  },
  {
    id: 'potato_late_blight',
    titleHi: 'आलू में पछेती झुलसा (Late Blight) की प्रारंभिक पहचान एवं बचाव',
    titleEn: 'Potato Late Blight Early Identification and Protection',
    categoryHi: 'रोग प्रबंधन',
    cropHi: 'आलू (Potato)',
    summaryHi:
      'कोहरे, बादल और अधिक नमी (80% से ऊपर) में आलू की निचली पत्तियों के किनारों पर भूरे-काले जले हुए धब्बे दिखते हैं और पत्ती के नीचे सफेद फफूंद की परत बनती है।',
    cautiousStepsHi: [
      'कोहरे के दिनों में प्रतिदिन सुबह खेत के निचले व छायादार हिस्सों का निरीक्षण करें।',
      'झुलसा के लक्षण दिखने पर तुरंत सिंचाई रोकें और मेड़ों पर मिट्टी चढ़ाए रखें ताकि कंद खुले न रहें।',
      'रोग तेजी से फैलने पर नजदीकी KVK या उद्यान विभाग से अनुमोदित फफूंदनाशक की जानकारी लें।',
    ],
    safetyWarningHi: 'बारिश या ओस से भीगी पत्तियों पर छिड़काव न करें, क्योंकि दवा पत्तियों पर टिकती नहीं है।',
    sourceOrg: 'ऐप स्थानीय संदर्भ नोट्स (ICAR-CPRI शिमला संदर्भ पर आधारित)',
    sourceTier: 'स्थानीय कृषि संदर्भ पुस्तकालय',
    officialUrl: 'https://cpri.icar.gov.in',
  },
  {
    id: 'chickpea_wilt_podborer',
    titleHi: 'चना में उकठा रोग (Wilt) और फली छेदक (Pod Borer) नियंत्रण',
    titleEn: 'Chickpea Wilt and Pod Borer Management',
    categoryHi: 'कीट एवं मृदा रोग प्रबंधन',
    cropHi: 'चना (Chickpea)',
    summaryHi:
      'चना में पौधा पूरा सूखना और जड़ को चीरने पर अंदर काली धारी दिखना उकठा (Fusarium Wilt) का लक्षण है। फूल व फली बनते समय हरी इल्ली (Pod Borer) फलियों में छेद कर दाने खाती है।',
    cautiousStepsHi: [
      'उकठा से बचाव हेतु बुवाई से पूर्व ट्राइकोडर्मा (Trichoderma viride) से बीजोपचार करें।',
      'फली छेदक की निगरानी के लिए खेत में T-आकार की खूँटियाँ (पक्षी बैठने हेतु) और फेरोमोन ट्रैप लगाएँ।',
      'छोटी इल्लियाँ दिखने पर 5% नीम निंबोली अर्क (NSKE) का प्रयोग सुरक्षित प्राथमिक कदम है।',
    ],
    safetyWarningHi: 'फूल आने की अवस्था में अनावश्यक सिंचाई न करें, इससे पौधे की वानस्पतिक वृद्धि बढ़कर फलियाँ कम लगती हैं।',
    sourceOrg: 'ऐप स्थानीय संदर्भ नोट्स (ICAR-IIPR कानपुर संदर्भ पर आधारित)',
    sourceTier: 'स्थानीय कृषि संदर्भ पुस्तकालय',
    officialUrl: 'https://iipr.icar.gov.in',
  },
  {
    id: 'pesticide_safety_protocol',
    titleHi: 'खेत में छिड़काव करते समय किसान सुरक्षा के 6 अनिवार्य नियम',
    titleEn: '6 Mandatory Farmer Safety Rules During Field Spraying',
    categoryHi: 'किसान स्वास्थ्य एवं सुरक्षा',
    cropHi: 'सभी फसलें (All Crops)',
    summaryHi:
      'कीटनाशक या फफूंदनाशक का उपयोग अंतिम विकल्प के रूप में और केवल अनुमोदित लेबल के अनुसार ही करें। छिड़काव के दौरान किसान भाई की व्यक्तिगत सुरक्षा सर्वोपरि है।',
    cautiousStepsHi: [
      'डिब्बे पर बने रंग के तिकोन (लाल = अत्यंत विषैला, पीला = अधिक विषैला, नीला = मध्यम, हरा = कम विषैला) को अवश्य पढ़ें।',
      'छिड़काव करते समय चेहरा, नाक, हाथ और शरीर को पूरी तरह ढकें तथा हवा की दिशा में ही छिड़काव करें।',
      'कभी भी मुँह से फूँक मारकर स्प्रेयर का बंद नोजल साफ न करें — इसके लिए पतली सीख या पानी का प्रयोग करें।',
      'दो अलग-अलग रसायनों को बिना कृषि वैज्ञानिक की लिखित सलाह के कभी न मिलाएँ (No Blind Tank-Mixing)।',
    ],
    safetyWarningHi:
      'चक्कर आने, आँखों में जलन या उल्टी होने पर तुरंत काम रोकें, साफ पानी से धोएँ और नजदीकी स्वास्थ्य केंद्र पर दवा का डिब्बा साथ ले जाएँ।',
    sourceOrg: 'ऐप स्थानीय संदर्भ नोट्स (CIBRC एवं ICAR सुरक्षा मानक)',
    sourceTier: 'स्थानीय कृषि संदर्भ पुस्तकालय',
    officialUrl: 'https://ppqs.gov.in',
  },
];

export function buildOfflineCropDiagnosis(
  cropName: string,
  growthStage: string,
  symptoms: string,
  spreadScope: string,
  hasClearPhoto: boolean
): {
  likelyCauses: string;
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  safeNextSteps: string;
} {
  const s = `${cropName} ${symptoms}`.toLowerCase();
  const confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
    hasClearPhoto && symptoms.trim().length >= 30 ? 'MEDIUM' : 'LOW';

  if (s.includes('पील') || s.includes('yellow') || s.includes('रतुआ') || s.includes('rust')) {
    return {
      confidenceLevel,
      likelyCauses:
        'संभावित कारण (अनिश्चितता सहित):\n1. पोषक तत्व (नाइट्रोजन या जिंक) की कमी या अधिक पानी से जड़ों में घुटन (यदि निचली पत्तियाँ एक समान पीली हैं)।\n2. पीला रतुआ / फफूंद संक्रमण (यदि पत्तियों पर पीली धारियाँ हैं और छूने पर पाउडर हाथ में लगता है)।\nनोट: केवल विवरण/फोटो से 100% पक्का अंतर करना संभव नहीं है।',
      safeNextSteps:
        '1. प्रभावित पत्ती को उंगली से छूकर जांचें कि क्या पीला पाउडर लग रहा है।\n2. यदि खेत में जलभराव है तो तुरंत पानी निकालें।\n3. बिना पुष्टि के कोई तेज़ रासायनिक फफूंदनाशक या टैंक-मिक्स न डालें; KVK या 1800-180-1551 से पुष्टि करें।',
    };
  }

  if (s.includes('माहू') || s.includes('चेपा') || s.includes('aphid') || s.includes('कीट') || s.includes('छेद')) {
    return {
      confidenceLevel,
      likelyCauses:
        'संभावित कारण:\n1. रस चूसक कीट (माहू / सफेद मक्खी / थ्रिप्स) या तना/फली छेदक कीट का प्रारंभिक प्रकोप।\n2. मौसम में नमी और बादल के कारण कीट संख्या में वृद्धि।',
      safeNextSteps:
        '1. खेत के 10-12 पौधों की पत्तियों के निचले हिस्से और गोभ की जाँच करें।\n2. अत्यधिक यूरिया खाद न डालें और शुरुआती नियंत्रण हेतु पीले चिपचिपे ट्रैप (Yellow Sticky Traps) या नीम तेल (Azadirachtin) का प्रयोग करें।\n3. फूल खिलने की अवस्था में सुबह छिड़काव न करें ताकि मधुमक्खियाँ सुरक्षित रहें।',
    };
  }

  if (s.includes('झुलसा') || s.includes('धब्ब') || s.includes('blight') || s.includes('सूख')) {
    return {
      confidenceLevel,
      likelyCauses:
        'संभावित कारण:\n1. पछेती/अगेती झुलसा (Fungal Blight) या जीवाणु पत्ती झुलसा (विशेषकर अधिक नमी या कोहरे में)।\n2. मृदा जनित उकठा (Wilt) या जड़ गलन।',
      safeNextSteps:
        '1. पत्ती के निचले हिस्से में सुबह सफेद फफूंद या काले धब्बों की जाँच करें।\n2. झुलसा दिखने पर अस्थायी रूप से सिंचाई और नाइट्रोजन (यूरिया) रोकें।\n3. नजदीकी KVK वैज्ञानिक को प्रभावित पौधा दिखाएँ या केस पर्ची डाउनलोड कर साझा करें।',
    };
  }

  return {
    confidenceLevel: 'LOW',
    likelyCauses: `फसल (${cropName}, अवस्था: ${growthStage || 'सामान्य'}, फैलाव: ${
      spreadScope || 'आंशिक'
    }) में दर्ज लक्षणों के आधार पर यह पोषण असंतुलन, नमी तनाव या प्रारंभिक कीट/रोग प्रभाव हो सकता है। बिना प्रत्यक्ष निरीक्षण के एक निश्चित कारण बताना सुरक्षित नहीं है।`,
    safeNextSteps:
      '1. प्रभावित पौधे की पत्तियों के दोनों ओर और जड़ के पास मिट्टी की नमी की जाँच करें।\n2. बिना पक्की पहचान के कोई तेज़ रासायनिक दवा या दो दवाओं का मिश्रण न डालें।\n3. नीचे दिए गए बटन से "KVK केस पर्ची" तैयार करें या निःशुल्क किसान कॉल सेंटर 1800-180-1551 पर बात करें।',
  };
}

export function buildOfflineAssistantReply(question: string): {
  replyText: string;
  sourceCitation: string;
} {
  const q = question.toLowerCase();

  if (q.includes('पील') || q.includes('गेहूँ') || q.includes('wheat') || q.includes('रतुआ')) {
    const art = CROP_GUIDANCE_LIBRARY[0];
    return {
      replyText: `नमस्ते किसान साथी!\n\n${art.summaryHi}\n\nसुरक्षित अगले कदम:\n• ${art.cautiousStepsHi.join(
        '\n• '
      )}\n\n⚠️ सावधानी: ${art.safetyWarningHi}`,
      sourceCitation: `स्रोत: ${art.sourceOrg}`,
    };
  }

  if (q.includes('सिंचाई') || q.includes('पानी') || q.includes('cri')) {
    const art = CROP_GUIDANCE_LIBRARY[1];
    return {
      replyText: `${art.titleHi}:\n\n${art.summaryHi}\n\nसुरक्षित कदम:\n• ${art.cautiousStepsHi.join('\n• ')}`,
      sourceCitation: `स्रोत: ${art.sourceOrg}`,
    };
  }

  if (q.includes('धान') || q.includes('तना') || q.includes('paddy')) {
    const art = CROP_GUIDANCE_LIBRARY[2];
    return {
      replyText: `${art.titleHi}:\n\n${art.summaryHi}\n\nसुरक्षित कदम:\n• ${art.cautiousStepsHi.join('\n• ')}`,
      sourceCitation: `स्रोत: ${art.sourceOrg}`,
    };
  }

  if (q.includes('माहू') || q.includes('सरसों') || q.includes('mustard') || q.includes('कीट')) {
    const art = CROP_GUIDANCE_LIBRARY[3];
    return {
      replyText: `${art.titleHi}:\n\n${art.summaryHi}\n\nसुरक्षित कदम:\n• ${art.cautiousStepsHi.join(
        '\n• '
      )}\n\n⚠️ ${art.safetyWarningHi}`,
      sourceCitation: `स्रोत: ${art.sourceOrg}`,
    };
  }

  if (q.includes('आलू') || q.includes('झुलसा') || q.includes('potato')) {
    const art = CROP_GUIDANCE_LIBRARY[5];
    return {
      replyText: `${art.titleHi}:\n\n${art.summaryHi}\n\nसुरक्षित कदम:\n• ${art.cautiousStepsHi.join('\n• ')}`,
      sourceCitation: `स्रोत: ${art.sourceOrg}`,
    };
  }

  if (q.includes('योजना') || q.includes('किसान सम्मान') || q.includes('बीमा') || q.includes('kcc')) {
    return {
      replyText:
        'सरकारी योजनाओं (PM-KISAN ₹6,000/वर्ष, PMFBY फसल बीमा, KCC 4% ब्याज ऋण, PMKSY सिंचाई अनुदान और PM-KUSUM सोलर पंप) की सटीक शर्त-दर-शर्त पात्रता जांचने के लिए नीचे "योजनाएँ" टैब खोलें।',
      sourceCitation: 'स्रोत: अमौरा ऑफ़लाइन सरकारी योजना नियम इंजन',
    };
  }

  if (q.includes('मंडी') || q.includes('भाव') || q.includes('msp')) {
    return {
      replyText:
        'आधिकारिक MSP संदर्भ (जैसे रबी 2025-26 गेहूँ MSP: ₹2,425/क्विंटल, सरसों: ₹5,950/क्विंटल, चना: ₹5,650/क्विंटल) और भाड़ा घटाकर शुद्ध आय की गणना करने के लिए "हिसाब व मंडी" टैब खोलें।',
      sourceCitation: 'स्रोत: CACP सरकारी MSP संदर्भ एवं अमौरा मंडी कैलकुलेटर',
    };
  }

  return {
    replyText: `नमस्ते किसान साथी! आपके प्रश्न ("${question}") के लिए सुरक्षित सुझाव:\n\n1. यदि यह फसल के पत्तों या कीट की समस्या है, तो "सलाह (फसल डॉक्टर)" टैब में पत्ते की साफ फोटो और लक्षण दर्ज करें।\n2. सरकारी योजनाओं की पात्रता देखने के लिए "योजनाएँ" टैब खोलें।\n3. बिना पक्की पहचान के कोई तेज़ रासायनिक दवा न डालें। निःशुल्क सरकारी वैज्ञानिक सलाह के लिए किसान कॉल सेंटर 1800-180-1551 पर कॉल करें।`,
    sourceCitation: 'स्रोत: अमौरा ऑफ़लाइन स्थानीय कृषि संदर्भ पुस्तकालय',
  };
}

export const buildCautiousCropDiagnosis = buildOfflineCropDiagnosis;
export const getOfflineAssistantReply = buildOfflineAssistantReply;

