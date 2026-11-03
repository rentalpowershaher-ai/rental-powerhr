'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { playAlertSound } from '@/utils/sound';

export default function EmployeeDashboard() {
  const [user, setUser] = useState<any>(null);
  const [vacation, setVacation] = useState<any>(null);
  const [leaveDateInput, setLeaveDateInput] = useState('');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const saved = localStorage.getItem('rental_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      setUser(parsed);
      loadVacationData(parsed.id);
      updatePresence(parsed.id);
    }
  }, []);

  const updatePresence = async (userId: string) => {
    await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', userId);
  };

  const loadVacationData = async (userId: string) => {
    const { data } = await supabase.from('vacations').select('*').eq('user_id', userId).single();
    if (data) {
      setVacation(data);
      checkVacationCalculations(data);
    }
  };

  const checkVacationCalculations = (vac: any) => {
    const now = new Date();
    
    // 1. حساب مرور 40 يوم عمل
    if (vac.status === 'WORKING' && vac.work_start_date) {
      const start = new Date(vac.work_start_date);
      const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 3600 * 24));

      if (diffDays >= 40) {
        playAlertSound('SCHEDULE_VACATION');
        setAlertMessage('حين موعد إجازتك (تم اكتمال 40 يوم عمل)! هل ترغب في تسجيل تاريخ النزول الآن؟');
      }
    }

    // 2. حساب انتهاء الـ 10 أيام إجازة
    if (vac.status === 'ON_LEAVE' && vac.leave_end_date) {
      const endDate = new Date(vac.leave_end_date);
      if (now >= endDate) {
        playAlertSound('RETURN_TO_WORK');
        setAlertMessage('انتهت الإجازة! برجاء العودة إلى العمل فوراً.');
      }
    }
  };

  const handleAcceptVacation = async () => {
    if (!leaveDateInput) return;
    const startDate = new Date(leaveDateInput);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 10); // إضافة 10 أيام تلقائياً

    await supabase.from('vacations').update({
      status: 'ON_LEAVE',
      leave_start_date: startDate.toISOString().split('T')[0],
      leave_end_date: endDate.toISOString().split('T')[0]
    }).eq('id', vacation.id);

    setAlertMessage(null);
    loadVacationData(user.id);
  };

  const handleRejectVacation = async () => {
    // إعادة احتساب 40 يوم عمل من جديد عند الرفض
    await supabase.from('vacations').update({
      status: 'WORKING',
      work_start_date: new Date().toISOString().split('T')[0],
      leave_start_date: null,
      leave_end_date: null
    }).eq('id', vacation.id);

    setAlertMessage(null);
    loadVacationData(user.id);
  };

  const handleReturnToWork = async () => {
    // عند العودة للعمل يتكتب تاريخ العودة ويتحسب 40 يوم عمل تلقائياً
    await supabase.from('vacations').update({
      status: 'WORKING',
      work_start_date: new Date().toISOString().split('T')[0],
      leave_start_date: null,
      leave_end_date: null
    }).eq('id', vacation.id);

    setAlertMessage(null);
    loadVacationData(user.id);
  };

  if (!user || !vacation) return <div className="p-8 text-white text-center">جاري التحميل...</div>;

  const isOnLeave = vacation.status === 'ON_LEAVE';

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 dir-rtl">
      {/* التنبيهات الصوتية الحادة */}
      {alertMessage && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500 text-red-200 rounded-xl animate-bounce flex flex-col gap-3">
          <p className="font-bold text-center text-lg">{alertMessage}</p>

          {vacation.status === 'WORKING' && (
            <div className="flex flex-col gap-2">
              <input
                type="date"
                className="bg-slate-900 border border-slate-700 p-2 rounded text-white"
                value={leaveDateInput}
                onChange={(e) => setLeaveDateInput(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={handleAcceptVacation} className="flex-1 bg-emerald-500 text-slate-950 font-bold py-2 rounded">
                  قبول وتحديد تاريخ النزول (10 أيام)
                </button>
                <button onClick={handleRejectVacation} className="flex-1 bg-slate-700 text-white py-2 rounded">
                  رفض (إعادة 40 يوم عمل)
                </button>
              </div>
            </div>
          )}

          {isOnLeave && (
            <button onClick={handleReturnToWork} className="w-full bg-emerald-500 text-slate-950 font-bold py-2 rounded">
              تأكيد العودة إلى العمل وتصفير العداد
            </button>
          )}
        </div>
      )}

      {/* الملف التعريفي للموظف */}
      <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-amber-500">{user.full_name}</h1>
            <p className="text-slate-400 text-sm mt-1">تاريخ الانضمام: {user.joined_at}</p>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${isOnLeave ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
            {isOnLeave ? 'إجازة' : 'في العمل'}
          </span>
        </div>

        <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/60">
          <p className="text-sm text-slate-400">كلمة السر الخاصة بك: <span className="text-amber-400 font-mono">{user.password}</span></p>
          
          {isOnLeave ? (
            <div className="text-red-400 font-medium">
              هذا الموظف إجازة حالياً — تاريخ العودة: <span className="font-bold underline">{vacation.leave_end_date}</span>
            </div>
          ) : (
            <div className="text-emerald-400 font-medium">
              موعد إجازة هذا الموظف المتوقع: <span className="font-bold underline">{vacation.leave_start_date || 'بعد اكتمال الـ 40 يوم'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}