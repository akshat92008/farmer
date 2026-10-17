import React, { useState } from 'react';
import {
  Calculator,
  IndianRupee,
  TrendingUp,
  Truck,
  Plus,
  Trash2,
  ExternalLink,
  AlertCircle,
  Layers,
} from 'lucide-react';
import {
  CropCycle,
  FarmerProfile,
  FarmTransaction,
  MandiReferenceQuote,
} from '../types/amaura';
import {
  calculateFarmEconomics,
  calculateMandiComparison,
  MANDI_REFERENCE_QUOTES,
} from '../data/knowledgeBase';

interface AccountsMandiViewProps {
  profile: FarmerProfile;
  cropCycles: CropCycle[];
  transactions: FarmTransaction[];
  onAddTransaction: (tx: Omit<FarmTransaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
}

export const AccountsMandiView: React.FC<AccountsMandiViewProps> = ({
  profile,
  cropCycles,
  transactions,
  onAddTransaction,
  onDeleteTransaction,
}) => {
  const isHi = profile.preferredLanguage === 'hi';
  const [subTab, setSubTab] = useState<'ledger' | 'mandi'>('ledger');

  // Farm Ledger Form State
  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultField = cropCycles[0]?.fieldName || 'पूर्वी खेत (Plot-1)';
  const defaultCrop = cropCycles[0]?.cropName || 'गेहूँ (Wheat)';

  const [txType, setTxType] = useState<'EXPENSE' | 'SALE'>('EXPENSE');
  const [fieldName, setFieldName] = useState(defaultField);
  const [cropName, setCropName] = useState(defaultCrop);
  const [category, setCategory] = useState('खाद एवं उर्वरक (Fertilizer)');
  const [title, setTitle] = useState('');
  const [amountInr, setAmountInr] = useState('');
  const [quantityQuintal, setQuantityQuintal] = useState('');
  const [expectedYieldQuintals, setExpectedYieldQuintals] = useState('35');

  // Mandi Net Proceeds Calculator State
  const [selectedQuoteId, setSelectedQuoteId] = useState(MANDI_REFERENCE_QUOTES[0].id);
  const [customLocalPrice, setCustomLocalPrice] = useState<string>('');
  const [sellQtyQuintals, setSellQtyQuintals] = useState<string>('25');
  const [transportCost, setTransportCost] = useState<string>('650');
  const [handlingCost, setHandlingCost] = useState<string>('250');

  const totalAcres =
    profile.landSizeAcres > 0
      ? profile.landSizeAcres
      : cropCycles.reduce((s, c) => s + (c.areaAcres || 0), 0) || 2.0;

  const economics = calculateFarmEconomics(
    transactions,
    totalAcres,
    parseFloat(expectedYieldQuintals) || 30
  );

  const selectedQuote: MandiReferenceQuote =
    MANDI_REFERENCE_QUOTES.find((q) => q.id === selectedQuoteId) ||
    MANDI_REFERENCE_QUOTES[0];

  const parsedCustomPrice = customLocalPrice.trim()
    ? parseFloat(customLocalPrice)
    : null;

  const mandiResult = calculateMandiComparison(
    selectedQuote,
    parseFloat(sellQtyQuintals) || 0,
    parseFloat(transportCost) || 0,
    parseFloat(handlingCost) || 0,
    parsedCustomPrice
  );

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountInr);
    if (!amt || amt <= 0) return;

    onAddTransaction({
      txType,
      category: txType === 'SALE' ? 'उपज बिक्री (Crop Sale)' : category,
      cropName: cropName.trim() || 'गेहूँ (Wheat)',
      fieldName: fieldName.trim() || 'सामान्य खेत',
      title:
        title.trim() ||
        (txType === 'SALE' ? `${cropName} बिक्री` : `${category} खर्च`),
      amountInr: amt,
      quantityQuintal: txType === 'SALE' ? Math.max(0, parseFloat(quantityQuintal) || 0) : 0,
      txDate: todayStr,
    });
    setTitle('');
    setAmountInr('');
    setQuantityQuintal('');
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#DCE3DC]">
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab('ledger')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              subTab === 'ledger'
                ? 'bg-[#1E4D2B] text-white'
                : 'bg-[#F3F6F3] text-[#1E4D2B] hover:bg-[#E2ECE4]'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>
              {isHi
                ? 'खेत-वार खर्च एवं लागत मूल्य (Break-Even)'
                : 'Per-Field Accounts & Break-Even'}
            </span>
          </button>

          <button
            onClick={() => setSubTab('mandi')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              subTab === 'mandi'
                ? 'bg-[#1E4D2B] text-white'
                : 'bg-[#F3F6F3] text-[#1E4D2B] hover:bg-[#E2ECE4]'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>
              {isHi
                ? 'मंडी शुद्ध आय व आधिकारिक MSP कैलकुलेटर'
                : 'Mandi Net Proceeds & MSP Calculator'}
            </span>
          </button>
        </div>

        <a
          href="https://agmarknet.gov.in"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#2E6F40] hover:underline px-2"
        >
          <span>{isHi ? 'लाइव सरकारी भाव: agmarknet.gov.in' : 'Live Portal: agmarknet.gov.in'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {subTab === 'ledger' ? (
        <div className="space-y-6">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-[#DCE3DC] shadow-xs">
              <p className="text-xs text-[#526556] font-semibold">
                {isHi ? 'कुल खेती खर्च' : 'Total Farm Expenses'}
              </p>
              <p className="text-xl font-extrabold text-red-700 mt-1">
                ₹{economics.totalExpensesInr.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {isHi
                  ? `प्रति एकड़ लागत: ₹${Math.round(economics.costPerAcreInr).toLocaleString('en-IN')}`
                  : `Cost/Acre: ₹${Math.round(economics.costPerAcreInr).toLocaleString('en-IN')}`}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#DCE3DC] shadow-xs">
              <p className="text-xs text-[#526556] font-semibold">
                {isHi ? 'कुल उपज बिक्री' : 'Total Crop Sales'}
              </p>
              <p className="text-xl font-extrabold text-emerald-700 mt-1">
                ₹{economics.totalSalesInr.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {isHi
                  ? `बेची गई मात्रा: ${economics.totalSoldQuintals} क्विंटल`
                  : `Sold Qty: ${economics.totalSoldQuintals} Quintals`}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#DCE3DC] shadow-xs">
              <p className="text-xs text-[#526556] font-semibold">
                {isHi ? 'शुद्ध लाभ / बचत' : 'Net Profit / Balance'}
              </p>
              <p
                className={`text-xl font-extrabold mt-1 ${
                  economics.netIncomeInr >= 0 ? 'text-[#1E4D2B]' : 'text-amber-700'
                }`}
              >
                {economics.netIncomeInr >= 0 ? '+' : ''}₹
                {economics.netIncomeInr.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {isHi ? `कुल भूमि: ${economics.totalAcres} एकड़` : `Total Area: ${economics.totalAcres} Acres`}
              </p>
            </div>

            <div className="bg-[#FFFBEB] p-4 rounded-2xl border border-[#F59E0B] shadow-xs">
              <p className="text-xs text-[#92400E] font-bold">
                {isHi
                  ? 'लागत-बराबर भाव (Break-Even / क्विंटल)'
                  : 'Break-Even Price / Quintal'}
              </p>
              <p className="text-xl font-extrabold text-[#78350F] mt-1">
                {economics.breakEvenPricePerQuintalInr
                  ? `₹${Math.round(economics.breakEvenPricePerQuintalInr).toLocaleString('en-IN')} / क्विं.`
                  : '—'}
              </p>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-[#92400E]">
                <span>{isHi ? 'अनुमानित उपज (क्विं.):' : 'Est. Yield (Qtl):'}</span>
                <input
                  type="number"
                  value={expectedYieldQuintals}
                  onChange={(e) => setExpectedYieldQuintals(e.target.value)}
                  className="w-14 px-1.5 py-0.5 rounded border border-amber-400 bg-white text-xs font-bold"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Add Expense/Sale Form with Field Selector (Fixes Audit Point #2) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#DCE3DC] p-5 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-[#1E4D2B] flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-[#2E6F40]" />
                <span>
                  {isHi
                    ? 'खेत-वार नया खर्च या बिक्री दर्ज करें'
                    : 'Record Expense or Sale by Field'}
                </span>
              </h3>

              <form onSubmit={handleAddTx} className="space-y-3 text-xs sm:text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxType('EXPENSE')}
                    className={`py-2 rounded-xl font-bold border cursor-pointer ${
                      txType === 'EXPENSE'
                        ? 'bg-red-700 text-white border-red-700'
                        : 'bg-gray-50 text-gray-700 border-gray-300'
                    }`}
                  >
                    {isHi ? 'खर्च (Expense)' : 'Expense'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('SALE')}
                    className={`py-2 rounded-xl font-bold border cursor-pointer ${
                      txType === 'SALE'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-gray-50 text-gray-700 border-gray-300'
                    }`}
                  >
                    {isHi ? 'उपज बिक्री (Sale)' : 'Crop Sale'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                      {isHi ? 'खेत चुनें (Per-Field Tracking)' : 'Select Field / Plot'}
                    </label>
                    <input
                      type="text"
                      list="farmer-fields-list"
                      value={fieldName}
                      onChange={(e) => setFieldName(e.target.value)}
                      placeholder="जैसे: पूर्वी खेत (Plot-1)"
                      className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8]"
                    />
                    <datalist id="farmer-fields-list">
                      {cropCycles.map((c) => (
                        <option key={c.id} value={c.fieldName}>
                          {c.cropName}
                        </option>
                      ))}
                      <option value="पूर्वी खेत (Plot-1)" />
                      <option value="पश्चिमी नलकूप खेत (Plot-2)" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                      {isHi ? 'फसल का नाम' : 'Crop Name'}
                    </label>
                    <input
                      type="text"
                      value={cropName}
                      onChange={(e) => setCropName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8]"
                    />
                  </div>
                </div>

                {txType === 'EXPENSE' ? (
                  <div>
                    <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                      {isHi ? 'खर्च की श्रेणी (Category)' : 'Expense Category'}
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8] bg-white"
                    >
                      <option value="बीज एवं बुवाई (Seeds)">बीज एवं बुवाई (Seeds)</option>
                      <option value="खाद एवं उर्वरक (Fertilizer)">खाद एवं उर्वरक (Fertilizer)</option>
                      <option value="सिंचाई एवं बिजली/डीज़ल (Irrigation)">
                        सिंचाई एवं बिजली/डीज़ल (Irrigation)
                      </option>
                      <option value="मजदूरी एवं निराई (Labor)">मजदूरी एवं निराई (Labor)</option>
                      <option value="ट्रैक्टर एवं जुताई (Machinery)">
                        ट्रैक्टर एवं जुताई (Machinery)
                      </option>
                      <option value="पौध संरक्षण (Plant Protection)">
                        पौध संरक्षण (Plant Protection)
                      </option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                      {isHi ? 'बेची गई मात्रा (क्विंटल में)' : 'Quantity Sold (Quintals)'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={quantityQuintal}
                      onChange={(e) => setQuantityQuintal(e.target.value)}
                      placeholder="जैसे: 20 क्विंटल"
                      className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                      {isHi ? 'राशि (₹ में) *' : 'Amount (₹) *'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={amountInr}
                      onChange={(e) => setAmountInr(e.target.value)}
                      placeholder="जैसे: 1850"
                      className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                      {isHi ? 'विवरण / नोट' : 'Note'}
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={isHi ? 'जैसे: 2 बोरी डीएपी खाद' : 'e.g. 2 bags DAP'}
                      className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#2E6F40] hover:bg-[#1E4D2B] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isHi ? 'हिसाब में जोड़ें' : 'Add to Farm Ledger'}</span>
                </button>
              </form>
            </div>

            {/* Per-Field & Per-Category Breakdown + Transaction List */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Per-Field Expense Breakdown (Audit Point #2 Fix) */}
                <div className="bg-white rounded-2xl border border-[#DCE3DC] p-4 shadow-xs">
                  <h4 className="text-xs font-bold text-[#1E4D2B] flex items-center gap-1.5 mb-2.5">
                    <Layers className="w-4 h-4 text-[#2E6F40]" />
                    <span>
                      {isHi
                        ? 'खेत-वार खर्च विश्लेषण (Per-Field Cost)'
                        : 'Expenses by Field / Plot'}
                    </span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    {Object.entries(economics.expenseByField).map(([fld, amt]) => (
                      <div
                        key={fld}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#F4F8F5]"
                      >
                        <span className="font-semibold text-[#1C281E]">{fld}</span>
                        <span className="font-bold text-red-700">
                          ₹{amt.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Per-Category Breakdown */}
                <div className="bg-white rounded-2xl border border-[#DCE3DC] p-4 shadow-xs">
                  <h4 className="text-xs font-bold text-[#1E4D2B] flex items-center gap-1.5 mb-2.5">
                    <TrendingUp className="w-4 h-4 text-[#D97706]" />
                    <span>
                      {isHi ? 'मद-वार खर्च विश्लेषण (By Category)' : 'Expenses by Category'}
                    </span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    {Object.entries(economics.expenseByCategory).map(([cat, amt]) => (
                      <div
                        key={cat}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#FAFDFB]"
                      >
                        <span className="text-[#37473B]">{cat}</span>
                        <span className="font-bold text-[#1C281E]">
                          ₹{amt.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transactions History */}
              <div className="bg-white rounded-2xl border border-[#DCE3DC] p-5 shadow-xs">
                <h4 className="text-sm font-bold text-[#1E4D2B] mb-3">
                  {isHi
                    ? `सभी दर्ज लेन-देन (${transactions.length})`
                    : `Recorded Transactions (${transactions.length})`}
                </h4>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl border border-[#E2E8E2] flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#E8F3EA] text-[#1E4D2B] font-bold">
                            {tx.fieldName || 'सामान्य खेत'}
                          </span>
                          <span className="font-bold text-[#1C281E]">{tx.title}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {tx.cropName} • {tx.category} • {tx.txDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-extrabold text-sm ${
                            tx.txType === 'SALE' ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {tx.txType === 'SALE' ? '+' : '-'}₹
                          {tx.amountInr.toLocaleString('en-IN')}
                        </span>
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Transparent Mandi Calculator & Official MSP Comparison (Fixes Audit Point #2 & #10) */
        <div className="space-y-5">
          {/* Honest Transparency Disclosure Banner */}
          <div className="bg-[#FFFBEB] border border-[#F59E0B] rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            <div className="text-xs text-[#78350F] space-y-1">
              <p className="font-bold">
                {isHi
                  ? 'पारदर्शिता नोट (ऑडिट सुधार #2): नीचे दिए गए मंडी कार्ड ऑफ़लाइन ऐतिहासिक बेंचमार्क और आधिकारिक सरकारी MSP (RMS 2025-26 / KMS 2024-25) के संदर्भ हैं — ये लाइव AgmarkNet फीड नहीं हैं।'
                  : 'Transparency Disclosure: The quotes below are Offline Historical Benchmarks + Official Government MSP references, not a live AgmarkNet feed.'}
              </p>
              <p>
                {isHi
                  ? 'अपनी स्थानीय मंडी या व्यापारी का आज का वास्तविक भाव नीचे "आज का वास्तविक मंडी भाव" बॉक्स में डालें ताकि भाड़ा व पल्लेदारी घटाकर आपकी सटीक शुद्ध आय निकले।'
                  : 'Enter your actual local mandi quote below to calculate exact net proceeds after transport and handling.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 6 cols: Mandi Input Controls */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-[#DCE3DC] p-5 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-[#1E4D2B]">
                {isHi
                  ? 'मंडी बिक्री एवं भाड़ा कैलकुलेटर'
                  : 'Mandi Net Proceeds & Transport Calculator'}
              </h3>

              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                    {isHi
                      ? '1. फसल और संदर्भ मंडी बेंचमार्क चुनें'
                      : '1. Select Crop & Reference Benchmark'}
                  </label>
                  <select
                    value={selectedQuoteId}
                    onChange={(e) => {
                      setSelectedQuoteId(e.target.value);
                      setCustomLocalPrice('');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#C5D3C8] bg-white font-medium"
                  >
                    {MANDI_REFERENCE_QUOTES.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.cropNameHi} — {q.mandiNameHi} (बेंचमार्क: ₹{q.modalPricePerQuintalInr}/क्विं.)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#CFE0D2]">
                  <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                    {isHi
                      ? '2. आज का अपना स्थानीय मंडी/व्यापारी भाव दर्ज करें (₹/क्विंटल - वैकल्पिक)'
                      : '2. Enter Your Actual Local Mandi Rate Today (₹/Quintal)'}
                  </label>
                  <input
                    type="number"
                    value={customLocalPrice}
                    onChange={(e) => setCustomLocalPrice(e.target.value)}
                    placeholder={`खाली छोड़ने पर बेंचमार्क भाव ₹${selectedQuote.modalPricePerQuintalInr}/क्विं. उपयोग होगा`}
                    className="w-full px-3 py-2 rounded-xl border border-[#2E6F40] bg-white text-sm font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                      {isHi ? 'मात्रा (क्विंटल)' : 'Quantity (Qtl)'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={sellQtyQuintals}
                      onChange={(e) => setSellQtyQuintals(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                      {isHi ? 'कुल भाड़ा (₹)' : 'Transport (₹)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={transportCost}
                      onChange={(e) => setTransportCost(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1E4D2B] mb-1">
                      {isHi ? 'पल्लेदारी/तौलाई (₹)' : 'Handling (₹)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={handlingCost}
                      onChange={(e) => setHandlingCost(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#C5D3C8]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right 6 cols: Net Proceeds Result & Official MSP Comparison */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-[#DCE3DC] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-[#E8F3EA] text-[#1E4D2B]">
                  {mandiResult.isCustomUserPrice
                    ? isHi
                      ? 'किसान द्वारा दर्ज आज का भाव सक्रिय'
                      : 'Using Farmer-Entered Rate'
                    : selectedQuote.benchmarkNoteHi}
                </span>
                <span className="text-xs font-semibold text-gray-500">
                  {selectedQuote.varietyGrade}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#F0F7F2] border border-[#B8D8BE] space-y-2">
                <p className="text-xs text-[#4A6350] font-semibold">
                  {isHi
                    ? 'भाड़ा और पल्लेदारी घटाने के बाद अनुमानित शुद्ध हाथ आने वाली राशि:'
                    : 'Estimated Net Proceeds in Hand (After Transport & Handling):'}
                </p>
                <p className="text-2xl font-extrabold text-[#1E4D2B]">
                  ₹{ Math.round(mandiResult.estimatedNetProceedsInr).toLocaleString('en-IN') }
                </p>
                <p className="text-xs font-bold text-[#2E6F40]">
                  {isHi
                    ? `शुद्ध प्रभावी भाव: ₹${Math.round(mandiResult.netPerQuintalInr)} / क्विंटल (सकल राशि: ₹${Math.round(mandiResult.grossProceedsInr).toLocaleString('en-IN')})`
                    : `Effective Net Rate: ₹${Math.round(mandiResult.netPerQuintalInr)} / Quintal`}
                </p>
              </div>

              {/* Official MSP Comparison & Break-Even Comparison */}
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="font-bold text-[#1C281E]">{selectedQuote.mspSeasonLabelHi}</p>
                  {mandiResult.vsMspDiffPerQuintalInr !== null && (
                    <p
                      className={`mt-1 font-bold ${
                        mandiResult.vsMspDiffPerQuintalInr >= 0
                          ? 'text-emerald-700'
                          : 'text-red-700'
                      }`}
                    >
                      {mandiResult.vsMspDiffPerQuintalInr >= 0
                        ? `✅ आपका शुद्ध भाव सरकारी MSP से ₹${Math.round(
                            mandiResult.vsMspDiffPerQuintalInr
                          )}/क्विंटल अधिक है।`
                        : `⚠️ ध्यान दें: भाड़ा घटाने के बाद आपका शुद्ध भाव सरकारी MSP से ₹${Math.abs(
                            Math.round(mandiResult.vsMspDiffPerQuintalInr)
                          )}/क्विंटल कम पड़ रहा है। राजकीय क्रय केंद्र पर बेचने पर विचार करें।`}
                    </p>
                  )}
                </div>

                {economics.breakEvenPricePerQuintalInr && (
                  <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#CFE0D2]">
                    <p className="font-bold text-[#1E4D2B]">
                      {isHi
                        ? `आपकी खेती लागत (Break-Even): ₹${Math.round(
                            economics.breakEvenPricePerQuintalInr
                          )}/क्विंटल`
                        : `Your Farm Break-Even Cost: ₹${Math.round(
                            economics.breakEvenPricePerQuintalInr
                          )}/Quintal`}
                    </p>
                    <p className="text-[#37473B] mt-0.5">
                      {mandiResult.netPerQuintalInr >= economics.breakEvenPricePerQuintalInr
                        ? `इस भाव पर आपको लागत के ऊपर लगभग ₹${Math.round(
                            mandiResult.netPerQuintalInr - economics.breakEvenPricePerQuintalInr
                          )}/क्विंटल की बचत हो रही है।`
                        : `इस भाव पर आपकी प्रति क्विंटल लागत भी पूरी नहीं हो रही है।`}
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-gray-500">{selectedQuote.sourceLabel}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
