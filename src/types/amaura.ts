export type AppLanguage = 'hi' | 'en';

export type NavTab = 'home' | 'advice' | 'farm' | 'myfarm' | 'accounts' | 'schemes';

export interface FarmerProfile {
  id: string;
  farmerName: string;
  preferredLanguage: AppLanguage;
  voiceEnabled: boolean;
  stateName: string;
  districtName: string;
  villageName: string;
  landSizeAcres: number;
  irrigationType: string;
  soilType: string;
  consentGiven: boolean;
  hasAadhaarEkyc: boolean;
  isIncomeTaxPayer: boolean;
  hasKccCard: boolean;
  authMode?: 'LOCAL_GUEST' | 'VERIFIED_PROFILE';
  updatedAt?: string;
}

export interface CropCycle {
  id: string;
  fieldName: string;
  cropName: string;
  varietyName: string;
  areaAcres: number;
  season: 'Rabi' | 'Kharif' | 'Zaid';
  sowingDate: string;
  growthStage: string;
  irrigationMethod: string;
  notes: string;
  createdAt?: string;
}

export interface CropCase {
  id: string;
  cropName: string;
  growthStage: string;
  symptoms: string;
  spreadScope: string;
  likelyCauses: string;
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  safeNextSteps: string;
  expertStatus: 'NONE' | 'SAVED_FOR_KVK' | 'CALLED_HELPLINE' | 'QUEUED_FOR_KVK' | 'REVIEWED';
  expertTicketId?: string;
  expertNotes: string;
  photoBase64: string;
  photoDimensions?: string;
  photoResolutionLabel?: string;
  sourceLabelHi?: string;
  usedLiveAi?: boolean;
  fallbackNoticeHi?: string | null;
  createdAt: string;
}

export interface FarmTransaction {
  id: string;
  txType: 'EXPENSE' | 'SALE';
  category: string;
  cropName: string;
  fieldName: string;
  title: string;
  amountInr: number;
  quantityQuintal: number;
  txDate: string;
  createdAt?: string;
}

export interface FarmReminder {
  id: string;
  cropName: string;
  fieldName: string;
  taskTitle: string;
  whySuggested: string;
  dueDate: string;
  status: 'PENDING' | 'COMPLETED';
  notified?: boolean;
  createdAt?: string;
}

export interface AssistantMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  topic: string;
  messageText: string;
  sourceCitation: string;
  usedLiveAi?: boolean;
  fallbackNoticeHi?: string | null;
  flaggedHarmful: boolean;
  flagReportId?: string;
  flagReason?: string;
  createdAt: string;
}

export interface SchemeCriterion {
  id: string;
  labelHi: string;
  labelEn: string;
  requiresLandOwnership?: boolean;
  maxAcresLimit?: number;
  exceededLimitNoteHi?: string;
  requiresCropSown?: boolean;
  requiresEkyc?: boolean;
  excludesIncomeTaxPayer?: boolean;
  requiresIrrigationSource?: boolean;
}

export interface GovernmentSchemeRule {
  id: string;
  nameHi: string;
  nameEn: string;
  departmentHi: string;
  scope: string;
  applicableStates: string[];
  benefitSummaryHi: string;
  benefitSummaryEn: string;
  eligibilityCriteria: SchemeCriterion[];
  requiredDocumentsHi: string[];
  applicationStepsHi: string[];
  deadlineHi: string;
  officialPortalUrl: string;
  helplineNumber: string;
  sourceTier: string;
  compilationNoteHi: string;
  lastVerifiedDate?: string;
  exclusionsHi: string;
}

export type CriterionStatus = 'LIKELY_MET' | 'NEEDS_VERIFICATION' | 'NOT_MET';
export type CriterionCheckStatus = CriterionStatus;

export interface EvaluatedCriterion {
  labelHi: string;
  labelEn: string;
  status: CriterionStatus;
  explanationHi: string;
}

export interface SchemeEvaluationResult {
  scheme: GovernmentSchemeRule;
  criteriaResults: EvaluatedCriterion[];
  overallStatus: CriterionStatus;
  overallSummaryHi: string;
  officialDisclaimerHi: string;
}

export interface MandiReferenceQuote {
  id: string;
  cropNameHi: string;
  cropNameEn: string;
  varietyGrade: string;
  mandiNameHi: string;
  stateNameHi: string;
  districtNameHi: string;
  modalPricePerQuintalInr: number;
  minPriceInr: number;
  maxPriceInr: number;
  mspReferenceInr: number | null;
  mspSeasonLabelHi: string;
  distanceKmEstimate: number;
  benchmarkNoteHi: string;
  observationDate?: string;
  sourceLabel: string;
}

export interface MandiComparisonOption {
  quote: MandiReferenceQuote;
  effectivePricePerQuintalInr: number;
  customPricePerQuintalInr: number;
  isCustomUserPrice: boolean;
  quantityQuintals: number;
  grossProceedsInr: number;
  transportCostInr: number;
  mandiHandlingCostInr: number;
  estimatedNetProceedsInr: number;
  netPerQuintalInr: number;
  vsMspDiffPerQuintalInr: number | null;
}

export interface FarmEconomicsSummary {
  totalExpensesInr: number;
  totalSalesInr: number;
  netIncomeInr: number;
  totalAcres: number;
  costPerAcreInr: number;
  totalSoldQuintals: number;
  breakEvenPricePerQuintalInr: number | null;
  expenseByCategory: Record<string, number>;
  expenseByField: Record<string, number>;
}

export interface KnowledgeArticle {
  id: string;
  titleHi: string;
  titleEn: string;
  categoryHi: string;
  cropHi: string;
  summaryHi: string;
  cautiousStepsHi: string[];
  safetyWarningHi: string;
  sourceOrg: string;
  sourceTier: string;
  lastReviewedDate?: string;
  officialUrl: string;
}

export interface DistrictCoordinates {
  stateHi: string;
  districtHi: string;
  districtEn: string;
  latitude: number;
  longitude: number;
}

export interface WeatherTaskRecommendation {
  taskCategoryHi: string;
  recommendationHi: string;
  reasonWhyHi: string;
  isCaution: boolean;
}

export interface FarmWeatherAdvisory {
  locationLabelHi: string;
  currentTempC: number;
  humidityPercent: number;
  windSpeedKmh: number;
  todayRainProbPercent: number;
  threeDayRainProbMaxPercent: number;
  retrievedAtFormatted: string;
  forecastWindowHi: string;
  uncertaintyNoteHi: string;
  sourceAttributionHi: string;
  isLiveNetworkData: boolean;
  unconfiguredDistrictWarningHi?: string;
  taskRecommendations: WeatherTaskRecommendation[];
  dailyForecast: {
    date: string;
    tempMax: number;
    tempMin: number;
    rainProb: number;
    rainMm?: number;
  }[];
}
