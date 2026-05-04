import { useEffect, useState, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { Plus, Users, Calculator, ReceiptText, RotateCcw } from 'lucide-react';

interface Expense {
  id: string;
  created_at: string;
  payer_name: string;
  amount: number;
  note: string;
  tab_name?: string;
}

const tabs = [
  { id: 'all', label: 'Cả nhóm', people: ['Lâm', 'Đích', 'Quang Anh'] },
  { id: 'lam-dich', label: 'Lâm - Đích', people: ['Lâm', 'Đích'] },
  { id: 'lam-qa', label: 'Lâm - Quang Anh', people: ['Lâm', 'Quang Anh'] },
  { id: 'dich-qa', label: 'Đích - Quang Anh', people: ['Đích', 'Quang Anh'] }
];

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payerName, setPayerName] = useState('Lâm');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentTabId, setCurrentTabId] = useState('all');
  const [showPairTabs, setShowPairTabs] = useState(false);

  const activeTab = tabs.find(t => t.id === currentTabId) || tabs[0];
  const peopleNames = activeTab.people;

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    setPayerName(peopleNames[0]);
  }, [currentTabId]);

  async function fetchExpenses() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('group_expenses')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      const processed = (data || []).map(e => ({
        ...e,
        tab_name: e.tab_name || 'all'
      }));
      setExpenses(processed);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!payerName || !amount) return;

    try {
      setSubmitting(true);
      const newExp = {
        payer_name: payerName.trim(),
        amount: parseFloat(amount),
        note: note.trim(),
        tab_name: currentTabId
      };

      const { data, error } = await supabase
        .from('group_expenses')
        .insert([newExp])
        .select();

      if (error) throw error;

      if (data) {
        setExpenses([...expenses, { ...data[0], tab_name: currentTabId }]);
      }
      setAmount('');
      setNote('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteExpense(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa khoản này?')) return;
    try {
      const { error } = await supabase.from('group_expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses(expenses.filter(e => e.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function resetAll() {
    if (!confirm(`Bạn có chắc muốn xóa tất cả các khoản chi của "${activeTab.label}" không?`)) return;
    try {
      const { error } = await supabase
        .from('group_expenses')
        .delete()
        .eq('tab_name', currentTabId);
      if (error) throw error;
      setExpenses(expenses.filter(e => (e.tab_name || 'all') !== currentTabId));
    } catch (err: any) {
      alert(err.message);
    }
  }

  // Tính toán giống như trong Note của Apple
  const summary = useMemo(() => {
    const map = new Map<string, Expense[]>();
    // Khởi tạo trước cho những người thuộc tab hiện tại
    peopleNames.forEach(name => map.set(name, []));

    // Lọc theo tab hiện tại
    const currentTabExpenses = expenses.filter(e => (e.tab_name || 'all') === currentTabId);

    currentTabExpenses.forEach(e => {
      const name = e.payer_name;
      if (map.has(name)) {
        map.get(name)!.push(e);
      }
    });

    const result: Array<{
      name: string;
      items: Expense[];
      total: number;
    }> = [];

    let grandTotal = 0;

    map.forEach((items, name) => {
      const total = items.reduce((acc, curr) => acc + curr.amount, 0);
      grandTotal += total;
      result.push({ name, items, total });
    });

    return {
      people: result,
      grandTotal,
      numPeople: result.length || 1,
    };
  }, [expenses, currentTabId]);

  const averagePerPerson = summary.grandTotal / summary.numPeople;

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val));
  };

  return (
    <div className="min-h-screen bg-[#f2f2f7] pb-24 font-sans">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-black mb-1 flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-500" />
          Chia Tiền Nhóm
        </h1>
        <button 
          onClick={resetAll}
          className="text-xs text-red-500 hover:text-red-600 font-semibold bg-red-50 hover:bg-red-100 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Xóa hết
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="px-4 max-w-lg mx-auto mt-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-500 font-medium">Bản ghi</span>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={showPairTabs} 
              onChange={(e) => {
                setShowPairTabs(e.target.checked);
                if (!e.target.checked) setCurrentTabId('all');
              }}
              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
            />
            <span className="text-xs text-gray-500 font-medium">Hiện theo cặp (tùy chọn)</span>
          </label>
        </div>

        {showPairTabs ? (
          <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl border border-gray-200">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setCurrentTabId(t.id)}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl text-center transition-all ${
                  currentTabId === t.id 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-sm font-bold text-black">Chế độ cả nhóm</p>
              <p className="text-xs text-gray-400">Ghi nhận chi tiêu chung cho cả 3 người</p>
            </div>
            <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2.5 py-1 rounded-lg">Đang bật</span>
          </div>
        )}
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-6">
        
        {/* Form nhập liệu */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-[17px] font-semibold text-black mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-500" />
            Thêm khoản chi
          </h2>
          <form onSubmit={addExpense} className="space-y-4">
            <div>
              <div className="flex gap-2 flex-wrap mb-2">
                {peopleNames.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setPayerName(name)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      payerName === name 
                        ? 'bg-blue-500 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Số tiền (vd: 50)"
                className="w-1/2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-[17px]"
                required
              />
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú (vd: xôi)"
                className="w-1/2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-[17px]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-blue-500 active:bg-blue-600 text-white font-semibold text-[17px] rounded-xl transition-colors"
            >
              {submitting ? 'Đang lưu...' : 'Thêm vào danh sách'}
            </button>
          </form>
        </div>

        {/* View dạng Apple Notes */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-[17px] font-semibold text-black mb-4 flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-orange-500" />
            Chi tiết như trong Note
          </h2>
          
          {loading ? (
            <p className="text-gray-400 text-center py-4">Đang tải...</p>
          ) : summary.people.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Chưa có khoản chi nào.</p>
          ) : (
            <div className="space-y-5 text-[17px]">
              {summary.people.map(person => (
                <div key={person.name} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                  <div className="flex flex-wrap items-baseline gap-1">
                    <span className="font-bold text-black">{person.name}:</span>
                    {person.items.map((item, idx) => (
                      <span key={item.id} className="inline-flex items-center text-gray-700">
                        {idx > 0 && <span className="mx-1">+</span>}
                        <span 
                          onClick={() => deleteExpense(item.id)}
                          className="cursor-pointer inline-flex items-center bg-gray-50 hover:bg-red-50 hover:text-red-500 active:bg-red-100 rounded-lg px-2 py-0.5 border border-gray-100 transition-colors text-[16px] gap-1 select-none"
                          title="Nhấn để xóa"
                        >
                          <span>{item.amount}</span>
                          {item.note && <span className="text-gray-400 text-sm">({item.note})</span>}
                          <span className="text-gray-300 hover:text-red-400 text-xs font-semibold ml-0.5">×</span>
                        </span>
                      </span>
                    ))}
                    <span className="font-bold text-black ml-1">= {formatMoney(person.total)}</span>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-500 flex items-center gap-1 bg-gray-50 p-2 rounded-lg inline-block">
                    <span>Tổng / {summary.numPeople} =</span>
                    <span className="font-semibold text-orange-500">
                      {formatMoney(person.total / summary.numPeople)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tổng kết thông minh (Ai nợ ai) */}
        {summary.people.length > 0 && (
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-5 shadow-sm text-white">
            <h2 className="text-[17px] font-semibold mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Chốt Sổ Cuối Cùng
            </h2>
            
            <div className="flex justify-between items-center bg-white/20 rounded-xl p-4 mb-4">
              <div>
                <p className="text-indigo-100 text-sm">Tổng cộng</p>
                <p className="text-2xl font-bold">{formatMoney(summary.grandTotal)}</p>
              </div>
              <div className="text-right">
                <p className="text-indigo-100 text-sm">Trung bình mỗi người</p>
                <p className="text-xl font-bold">{formatMoney(averagePerPerson)}</p>
              </div>
            </div>

            <div className="space-y-3">
              {summary.people.map(person => {
                const balance = person.total - averagePerPerson;
                const isOwed = balance > 0;
                
                return (
                  <div key={person.name} className="flex items-center justify-between bg-white/10 rounded-xl p-3">
                    <span className="font-medium">{person.name}</span>
                    <div className="text-right">
                      {Math.abs(balance) < 1 ? (
                        <span className="text-gray-200 text-sm">Vừa đủ</span>
                      ) : (
                        <div>
                          <span className="text-xs text-indigo-100 mr-2">
                            {isOwed ? 'nhận về' : 'cần trả thêm'}
                          </span>
                          <span className={`font-bold ${isOwed ? 'text-green-300' : 'text-red-300'}`}>
                            {formatMoney(Math.abs(balance))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chi tiết giao dịch chuyển tiền */}
            {(() => {
              const people = summary.people.map(p => ({
                name: p.name,
                balance: p.total - averagePerPerson
              }));

              const creditors = people.filter(p => p.balance > 0.1).sort((a, b) => b.balance - a.balance);
              const debtors = people.filter(p => p.balance < -0.1).sort((a, b) => a.balance - b.balance);

              const txs: Array<{ from: string; to: string; amount: number }> = [];

              let cIdx = 0;
              let dIdx = 0;

              while (cIdx < creditors.length && dIdx < debtors.length) {
                const creditor = creditors[cIdx];
                const debtor = debtors[dIdx];

                const amountToPay = Math.min(creditor.balance, Math.abs(debtor.balance));

                txs.push({
                  from: debtor.name,
                  to: creditor.name,
                  amount: amountToPay
                });

                creditor.balance -= amountToPay;
                debtor.balance += amountToPay;

                if (creditor.balance < 0.1) cIdx++;
                if (debtor.balance > -0.1) dIdx++;
              }

              if (txs.length === 0) return null;

              return (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-xs text-indigo-100 font-semibold mb-2">Lịch sử trả tiền cụ thể:</p>
                  <div className="space-y-2">
                    {txs.map((tx, idx) => (
                      <div key={idx} className="bg-white/10 rounded-xl p-3 flex justify-between items-center">
                        <span className="text-sm">
                          <strong className="text-red-300">{tx.from}</strong> trả cho <strong className="text-green-300">{tx.to}</strong>
                        </span>
                        <span className="font-bold text-sm bg-white/20 px-2 py-0.5 rounded-lg">
                          {formatMoney(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
