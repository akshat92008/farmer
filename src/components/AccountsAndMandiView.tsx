import React, { useMemo, useState } from 'react';
import {
  Calculator,
  ExternalLink,
  IndianRupee,
  Plus,
  Scale,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  calculateFarmEconomics,
  calculateMandiComparison,
  MANDI_REFERENCE_QUOTES,
} from '../data/knowledgeBase';
import { CropCycle, FarmerProfile, FarmTransaction } from '../types/amaura';

interface Props {
  profile: FarmerProfile;
  cropCycles: CropCycle[];
  transactions: FarmTransaction[];
  onAddTransaction: (tx: FarmTransaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const EXPENSE_CATEGORIES = [
  'बीज एवं उपचार (Seeds)',
  'खाद एवं उर्वरक (Fertilizer)',
  'सिंचाई एवं बिजली/डीजल (Irrigation)',
  'निराई-गुड़ाई एवं मजदूरी (Labor)',
  'पौध संरक्षण (Plant Protection)',
  'जुताई, कटाई व मशीनरी (Machinery)',
  'मंडी भाड़ा व पैकिंग (Transport)',
];

export const AccountsAndMandiView: React.FC<Props> = ({
  profile,
  cropCycles,
  transactions,
  onAddTransaction,
  onDeleteTransaction,
}) => {
  const [subTab, setSubTab] = useState<'accounts' | 'mandi'>('accounts');

  // Farm Accounts State
  const [txType, setTxType] = useState<'EXPENSE' | 'SALE'>('EXPENSE');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[1]);
  const [fieldName, setFieldName] = useState(
    cropCycles[0]?.fieldName || 'पूर्वी खेत (Plot-1)'
  );
  const [cropName, setCropName] = useState(cropCycles[0]?.cropName || 'गेहूँ (Wheat)');
  const [title, setTitle] = useState('');
  const [amountInr, setAmountInr] = useState('');
  const [quantityQuintal, setQuantityQuintal] = useState('');
  const [expectedYieldQuintals, setExpectedYieldQuintals] = useState('35');

  // Mandi Calculator State
  const [selectedQuoteId, setSelectedQuoteId] = useState(MANDI_REFERENCE_QUOTES[0].id);
  const [customRateInr, setCustomRateInr] = useState<string>('');
  const [sellQtyQuintals, setSellQtyQuintals] = useState<string>('25');
  const [transportInr, setTransportInr] = useState<string>('650');
  const [handlingInr, setHandlingInr] = useState<string>('250');

  const totalAcres = useMemo(() => {
    const cycleSum = cropCycles.reduce((acc, c) => acc + (Number(c.areaAcres) || 0), 0);
    return cycleSum > 0 ? cycleSum : profile.landSizeAcres > 0 ? profile.landSizeAcres : 2.5;
  }, [cropCycles, profile.landSizeAcres]);

  const economics = useMemo(
    () =>
      calculateFarmEconomics(
        transactions,
        totalAcres,
        parseFloat(expectedYieldQuintals) || 0
      ),
    [transactions, totalAcres, expectedYieldQuintals]
  );

  const selectedQuote = useMemo(
    () =>
      MANDI_REFERENCE_QUOTES.find((q) => q.id === selectedQuoteId) ||
      MANDI_REFERENCE_QUOTES[0],
    [selectedQuoteId]
  );

  const mandiComparison = useMemo(
    () =>
      calculateMandiComparison(
        selectedQuote,
        parseFloat(sellQtyQuintals) || 0,
        parseFloat(transportInr) || 0,
        parseFloat(handlingInr) || 0,
        customRateInr ? parseFloat(customRateInr) : null
      ),
    [selectedQuote, sellQtyQuintals, transportInr, handlingInr, customRateInr]
  );

  const handleCreateTx = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountInr);
    if (!amt || amt <= 0) return;

    onAddTransaction({
      id: `tx_${Date.now()}`,
      txType,
      category: txType === 'SALE' ? 'उपज बिक्री (Crop Sale)' : category,
      cropName: cropName.trim() || 'गेहूँ (Wheat)',
      fieldName: fieldName.trim() || 'सामान्य खेत',
      title:
        title.trim() ||
        (txType === 'SALE'
          ? `${cropName} उपज बिक्री`
          : `${category.split(' ')[0]} खर्च`),
      amountInr: amt,
      quantityQuintal: txType === 'SALE' ? Math.max(0, parseFloat(quantityQuintal) || 0) : 0,
      txDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    });

    setTitle('');
    setAmountInr('');
    setQuantityQuintal('');
  };

  const availableFields = useMemo(() => {
    const set = new Set<string>(['पूर्वी खेत (Plot-1)', 'पश्चिमी खेत (Plot-2)', 'नहर वाला खेत']);
    cropCycles.forEach((c) => {
      if (c.fieldName) set.add(c.fieldName);
    });
    transactions.forEach((t) => {
      if (t.fieldName) set.add(t.fieldName);
    });
    return Array.from(set);
  }, [cropCycles, transactions]);

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        <button
          type="button"
          onClick={() => setSubTab('accounts')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
            subTab === 'accounts'
              ? 'bg-[#1B5E20] text-white shadow-sm'
              : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
          }`}
        >
          <Calculator className="h-4 w-4" />
          खेत-वार खर्च एवं लागत बहीखाता (Per-Field Farm Accounts)
        </button>
        <button
          type="button"
          onClick={() => setSubTab('mandi')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
            subTab === 'mandi'
              ? 'bg-[#1B5E20] text-white shadow-sm'
              : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
          }`}
        >
          <Scale className="h-4 w-4" />
          मंडी शुद्ध आय एवं MSP कैलकुलेटर (Mandi & MSP)
        </button>
      </div>

      {subTab === 'accounts' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Summary Metrics & Per-Field Breakdown */}
          <div className="lg:col-span-7 space-y-5">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-white p-4 border border-stone-200 shadow-xs">
                <p className="text-[11px] font-semibold text-stone-500">कुल लागत (Expenses)</p>
                <p className="text-lg font-extrabold text-red-700 mt-1">
                  ₹{economics.totalExpensesInr.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 border border-stone-200 shadow-xs">
                <p className="text-[11px] font-semibold text-stone-500">कुल बिक्री (Sales)</p>
                <p className="text-lg font-extrabold text-emerald-700 mt-1">
                  ₹{economics.totalSalesInr.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 border border-stone-200 shadow-xs">
                <p className="text-[11px] font-semibold text-stone-500">शुद्ध लाभ / बचत</p>
                <p
                  className={`text-lg font-extrabold mt-1 ${
                    economics.netIncomeInr >= 0 ? 'text-emerald-800' : 'text-amber-800'
                  }`}
                >
                  {economics.netIncomeInr >= 0 ? '+' : ''}₹
                  {economics.netIncomeInr.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="rounded-xl bg-[#FFF8E7] p-4 border border-amber-300 shadow-xs">
                <p className="text-[11px] font-bold text-amber-950">
                  लागत-बराबर भाव (Break-Even)
                </p>
                <p className="text-lg font-extrabold text-amber-950 mt-1">
                  {economics.breakEvenPricePerQuintalInr !== null
                    ? `₹${Math.round(economics.breakEvenPricePerQuintalInr)}/क्विंटल`
                    : '—'}
                </p>
              </div>
            </div>

            {/* Break-even Yield Estimator Input */}
            <div className="rounded-xl bg-white p-4 border border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-stone-800">
                  प्रति एकड़ औसत लागत: ₹{Math.round(economics.costPerAcreInr).toLocaleString('en-IN')}/एकड़ (कुल {economics.totalAcres} एकड़)
                </p>
                <p className="text-stone-600 mt-0.5">
                  यदि अभी बिक्री नहीं हुई है, तो अनुमानित कुल पैदावार (क्विंटल) दर्ज करके जानें कि किस भाव से नीचे बेचने पर घाटा होगा:
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="font-semibold text-stone-700">अनुमानित पैदावार (क्विंटल):</label>
                <input
                  type="number"
                  min="1"
                  value={expectedYieldQuintals}
                  onChange={(e) => setExpectedYieldQuintals(e.target.value)}
                  className="w-20 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-bold"
                />
              </div>
            </div>

            {/* Per-Field Breakdown Table (Audit Point #2 Fix) */}
            <div className="rounded-xl bg-white p-5 border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-stone-900">
                  खेत-वार खर्च एवं आय विश्लेषण (Per-Field Cost Attribution)
                </h3>
                <span className="text-[11px] bg-emerald-50 text-emerald-900 px-2.5 py-0.5 rounded border border-emerald-200 font-semibold">
                  हर खेत का अलग हिसाब
                </span>
              </div>

              {Object.keys(economics.expenseByField).length === 0 ? (
                <p className="text-xs text-stone-500 py-3">
                  अभी कोई लेन-देन दर्ज नहीं है। दाईं ओर से खर्च या बिक्री जोड़ें।
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-600 bg-stone-50">
                        <th className="py-2 px-3 font-bold">खेत का नाम (Field Plot)</th>
                        <th className="py-2 px-3 font-bold">कुल खर्च (₹)</th>
                        <th className="py-2 px-3 font-bold">कुल बिक्री (₹)</th>
                        <th className="py-2 px-3 font-bold">शुद्ध अंतर (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {Object.entries(economics.expenseByField).map(([field, expAmt]) => {
                        const fieldSales = transactions
                          .filter(
                            (t) =>
                              t.txType === 'SALE' &&
                              (t.fieldName?.trim() || t.cropName?.trim() || 'सामान्य खेत') === field
                          )
                          .reduce((s, t) => s + (Number(t.amountInr) || 0), 0);
                        const net = fieldSales - expAmt;
                        return (
                          <tr key={field} className="hover:bg-stone-50/80">
                            <td className="py-2.5 px-3 font-bold text-stone-900">{field}</td>
                            <td className="py-2.5 px-3 text-red-700 font-semibold">
                              ₹{expAmt.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-emerald-700 font-semibold">
                              ₹{fieldSales.toLocaleString('en-IN')}
                            </td>
                            <td
                              className={`py-2.5 px-3 font-bold ${
                                net >= 0 ? 'text-emerald-800' : 'text-amber-900'
                              }`}
                            >
                              {net >= 0 ? '+' : ''}₹{net.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Category Breakdown */}
            <div className="rounded-xl bg-white p-5 border border-stone-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-stone-900">
                मद-वार खर्च विवरण (Expenses by Category)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {Object.entries(economics.expenseByCategory).map(([cat, amt]) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 border border-stone-200"
                  >
                    <span className="font-medium text-stone-700">{cat}</span>
                    <span className="font-bold text-stone-900">
                      ₹{amt.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Add Transaction Form & Transaction Ledger */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-xl bg-white p-5 border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-[#1B5E20]" />
                नया खर्च या उपज बिक्री दर्ज करें
              </h3>

              <form onSubmit={handleCreateTx} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxType('EXPENSE')}
                    className={`py-2 rounded-lg font-bold border cursor-pointer ${
                      txType === 'EXPENSE'
                        ? 'bg-red-700 text-white border-red-700'
                        : 'bg-stone-50 text-stone-700 border-stone-300'
                    }`}
                  >
                    खर्च (Expense)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('SALE')}
                    className={`py-2 rounded-lg font-bold border cursor-pointer ${
                      txType === 'SALE'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-stone-50 text-stone-700 border-stone-300'
                    }`}
                  >
                    उपज बिक्री (Sale)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      खेत का नाम (Field Plot)
                    </label>
                    <input
                      list="field-options"
                      value={fieldName}
                      onChange={(e) => setFieldName(e.target.value)}
                      placeholder="जैसे: पूर्वी खेत (Plot-1)"
                      className="w-full rounded-lg border border-stone-300 px-2.5 py-2"
                    />
                    <datalist id="field-options">
                      {availableFields.map((f) => (
                        <option key={f} value={f} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      फसल (Crop)
                    </label>
                    <input
                      type="text"
                      value={cropName}
                      onChange={(e) => setCropName(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-2.5 py-2"
                    />
                  </div>
                </div>

                {txType === 'EXPENSE' && (
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      खर्च की मद (Category)
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2"
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      राशि (₹ INR)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={amountInr}
                      onChange={(e) => setAmountInr(e.target.value)}
                      placeholder="जैसे: 1850"
                      className="w-full rounded-lg border border-stone-300 px-2.5 py-2 font-bold"
                    />
                  </div>

                  {txType === 'SALE' ? (
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        बेची गई मात्रा (क्विंटल)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={quantityQuintal}
                        onChange={(e) => setQuantityQuintal(e.target.value)}
                        placeholder="जैसे: 20"
                        className="w-full rounded-lg border border-stone-300 px-2.5 py-2"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        विवरण / नोट
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="जैसे: 2 बोरी डीएपी खाद"
                        className="w-full rounded-lg border border-stone-300 px-2.5 py-2"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#1B5E20] hover:bg-[#144718] py-2.5 font-bold text-white cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  बहीखाते में जोड़ें
                </button>
              </form>
            </div>

            {/* Transaction Ledger List */}
            <div className="rounded-xl bg-white p-5 border border-stone-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-stone-900">
                हाल के लेन-देन ({transactions.length})
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50/70 p-2.5 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            tx.txType === 'SALE'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-red-100 text-red-900'
                          }`}
                        >
                          {tx.txType === 'SALE' ? 'बिक्री' : 'खर्च'}
                        </span>
                        <span className="font-bold text-stone-900">{tx.title}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        खेत: <strong>{tx.fieldName || 'सामान्य'}</strong> • {tx.cropName} •{' '}
                        {tx.txDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold ${
                          tx.txType === 'SALE' ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {tx.txType === 'SALE' ? '+' : '-'}₹
                        {tx.amountInr.toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="text-stone-400 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Mandi Proceeds & MSP Calculator */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl bg-white p-5 border border-stone-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-[#1B5E20]">
                    मंडी भाड़ा एवं शुद्ध प्राप्ति कैलकुलेटर (Net Proceeds Calculator)
                  </h2>
                  <p className="text-xs text-stone-600 mt-0.5">
                    संदर्भ MSP/बेंचमार्क चुनें या <strong>अपना स्थानीय आज का मंडी भाव</strong> दर्ज करके भाड़ा घटाने के बाद की वास्तविक शुद्ध आय जानें।
                  </p>
                </div>
                <a
                  href="https://agmarknet.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
                >
                  AgmarkNet लाइव पोर्टल <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Honest Attribution Notice (Fixes Audit Point #2) */}
              <div className="rounded-lg bg-[#FFF8E7] border border-amber-300 p-3 text-xs text-amber-950">
                <strong>ईमानदार डेटा पारदर्शिता:</strong> नीचे दिए गए डिफ़ॉल्ट भाव{' '}
                <strong>2025-26 के आधिकारिक न्यूनतम समर्थन मूल्य (MSP) एवं ऑफ़लाइन मंडी बेंचमार्क</strong> हैं (लाइव टिकर नहीं)। अपनी नजदीकी मंडी या व्यापारी द्वारा आज बताए गए वास्तविक भाव की गणना करने के लिए{' '}
                <strong>"आपका स्थानीय भाव (₹/क्विंटल)"</strong> बॉक्स में संख्या लिखें।
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">
                    1. फसल एवं संदर्भ बेंचमार्क चुनें
                  </label>
                  <select
                    value={selectedQuoteId}
                    onChange={(e) => {
                      setSelectedQuoteId(e.target.value);
                      setCustomRateInr('');
                    }}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-medium"
                  >
                    {MANDI_REFERENCE_QUOTES.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.cropNameHi} — {q.mandiNameHi} (बेंचमार्क: ₹{q.modalPricePerQuintalInr}/क्विंटल)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    2. आपका स्थानीय आज का भाव (₹/क्विंटल — वैकल्पिक)
                  </label>
                  <input
                    type="number"
                    min="100"
                    value={customRateInr}
                    onChange={(e) => setCustomRateInr(e.target.value)}
                    placeholder={`बेंचमार्क: ₹${selectedQuote.modalPricePerQuintalInr}`}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 font-bold text-[#1B5E20]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    3. बेचने के लिए कुल मात्रा (क्विंटल में)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={sellQtyQuintals}
                    onChange={(e) => setSellQtyQuintals(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    4. कुल ट्रॉली/परिवहन भाड़ा (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={transportInr}
                    onChange={(e) => setTransportInr(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    5. पल्लेदारी / तुलाई / मंडी खर्च (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={handlingInr}
                    onChange={(e) => setHandlingInr(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Calculated Net Proceeds Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl bg-white p-5 border-2 border-[#2E7D32] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#1B5E20]">
                    शुद्ध मंडी प्राप्ति गणना
                  </span>
                  <h3 className="text-base font-bold text-stone-900">
                    {selectedQuote.cropNameHi} ({mandiComparison.quantityQuintals} क्विंटल)
                  </h3>
                </div>
                <TrendingUp className="h-6 w-6 text-[#1B5E20]" />
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-600">गणना में प्रयुक्त भाव:</span>
                  <span className="font-bold text-stone-900">
                    ₹{mandiComparison.customPricePerQuintalInr.toLocaleString('en-IN')}/क्विंटल{' '}
                    {customRateInr ? '(आपका स्थानीय भाव)' : '(संदर्भ बेंचमार्क)'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-600">कुल सकल मूल्य (Gross Value):</span>
                  <span className="font-bold text-stone-900">
                    ₹{Math.round(mandiComparison.grossProceedsInr).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100 text-red-700">
                  <span>(-) परिवहन एवं मंडी पल्लेदारी खर्च:</span>
                  <span className="font-bold">
                    -₹
                    {Math.round(
                      mandiComparison.transportCostInr + mandiComparison.mandiHandlingCostInr
                    ).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="rounded-lg bg-emerald-50 p-3.5 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-emerald-950">
                      हाथ में आने वाली शुद्ध राशि (Net Proceeds)
                    </p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      प्रभावी शुद्ध दर: ₹{Math.round(mandiComparison.netPerQuintalInr)}/क्विंटल
                    </p>
                  </div>
                  <p className="text-xl font-extrabold text-[#1B5E20]">
                    ₹{Math.round(mandiComparison.estimatedNetProceedsInr).toLocaleString('en-IN')}
                  </p>
                </div>

                {mandiComparison.vsMspDiffPerQuintalInr !== null && (
                  <div
                    className={`rounded-lg p-3 border text-xs ${
                      mandiComparison.vsMspDiffPerQuintalInr >= 0
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-amber-50 border-amber-300 text-amber-950'
                    }`}
                  >
                    <p className="font-bold">{selectedQuote.mspSeasonLabelHi}</p>
                    <p className="mt-0.5">
                      भाड़ा घटाने के बाद आपकी शुद्ध दर सरकारी MSP से{' '}
                      <strong>
                        ₹{Math.abs(Math.round(mandiComparison.vsMspDiffPerQuintalInr))}/क्विंटल{' '}
                        {mandiComparison.vsMspDiffPerQuintalInr >= 0 ? 'अधिक है' : 'कम पड़ रही है'}
                      </strong>
                      ।
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-stone-500 pt-1">{selectedQuote.sourceLabel}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
