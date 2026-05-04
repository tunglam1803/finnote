import { useEffect, useState, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { Plus, Trash2, Users, Calculator, ReceiptText, ArrowRightLeft } from 'lucide-react';

interface Expense {
  id: string;
  created_at: string;
  payer_name: string;
  amount: number;
  note: string;
}

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payerName, setPayerName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Lấy danh sách tên những người đã từng trả tiền để làm gợi ý
  const uniqueNames = useMemo(() => {
    return Array.from(new Set(expenses.map(e => e.payer_name)));
  }, [expenses]);

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function fetchExpenses() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('group_expenses')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setExpenses(data || []);
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
        note: note.trim()
      };

      const { data, error } = await supabase
        .from('group_expenses')
        .insert([newExp])
        .select();

      if (error) throw error;

      if (data) {
        setExpenses([...expenses, data[0]]);
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

  // Tính toán giống như trong Note của Apple
  const summary = useMemo(() => {
    const map = new Map<string, Expense[]>();
    expenses.forEach(e => {
      const name = e.payer_name;
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(e);
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
  }, [expenses]);

  const averagePerPerson = summary.grandTotal / summary.numPeople;

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val));
  };

  return (
    <div className="min-h-screen bg-[#f2f2f7] pb-24 font-sans">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm mb-6 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-black mb-1 flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-500" />
          Chia Tiền Nhóm
        </h1>
        <p className="text-sm text-gray-500">Thay thế hoàn hảo cho Apple Notes</p>
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
                {uniqueNames.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setPayerName(name)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      payerName === name 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="Ai là người trả? (vd: Lâm)"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-[17px]"
                required
              />
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
                      <span key={item.id} className="text-gray-700 group relative flex items-center">
                        {idx > 0 && <span className="mx-1">+</span>}
                        <span className="cursor-pointer hover:bg-red-50 hover:text-red-500 rounded px-1 transition-colors" onClick={() => deleteExpense(item.id)} title="Nhấn để xóa">
                          {item.amount}{item.note && <span className="text-gray-400 text-sm">({item.note})</span>}
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
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
