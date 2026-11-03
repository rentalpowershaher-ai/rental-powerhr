'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function AdminDashboard() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [joinedAt, setJoinedAt] = useState('');
  const supabase = createClient();

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('users')
      .select(`*, vacations(*)`)
      .eq('role', 'EMPLOYEE');
    if (data) setEmployees(data);
  };

  useEffect(() => {
    fetchEmployees();
    // تحديث حالة الاتصال كل 30 ثانية
    const interval = setInterval(fetchEmployees, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ full_name: fullName, password, joined_at: joinedAt, role: 'EMPLOYEE' }])
      .select()
      .single();

    if (!error && newUser) {
      await supabase.from('vacations').insert([
        { user_id: newUser.id, status: 'WORKING', work_start_date: new Date().toISOString().split('T')[0] }
      ]);
      setFullName('');
      setPassword('');
      setJoinedAt('');
      fetchEmployees();
    }
  };

  const isOnline = (lastSeen: string) => {
    if (!lastSeen) return false;
    const diff = (new Date().getTime() - new Date(lastSeen).getTime()) / 1000 / 60;
    return diff < 3; // يعتبر متصل إذا تفاعل خلال آخر 3 دقائق
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 dir-rtl">
      <header className="mb-8 flex justify-between items-center border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-amber-500">لوحة تحكم الأدمن - رينتال باور</h1>
        <button
          onClick={() => { localStorage.clear(); window.location.href = '/'; }}
          className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm"
        >
          تسجيل الخروج
        </button>
      </header>

      {/* قسم إضافة موظف جديد */}
      <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-8">
        <h2 className="text-lg font-bold mb-4 text-slate-200">إضافة موظف جديد</h2>
        <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="الاسم الثلاثي"
            required
            className="bg-slate-950 border border-slate-800 p-3 rounded-lg outline-none"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            type="text"
            placeholder="كلمة السر"
            required
            className="bg-slate-950 border border-slate-800 p-3 rounded-lg outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="date"
            required
            className="bg-slate-950 border border-slate-800 p-3 rounded-lg outline-none text-slate-300"
            value={joinedAt}
            onChange={(e) => setJoinedAt(e.target.value)}
          />
          <button type="submit" className="bg-amber-500 text-slate-950 font-bold rounded-lg p-3">
            إضافة الموظف
          </button>
        </form>
      </section>

      {/* القائمة المجمعة وحالات الموظفين والمصاعد الحالية */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-200">قائمة الموظفين المتصلين وحالة الإجازات</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {employees.map((emp) => {
            const vac = emp.vacations?.[0];
            const online = isOnline(emp.last_seen);
            const isOnLeave = vac?.status === 'ON_LEAVE';

            return (
              <div key={emp.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                    <h3 className="font-bold text-lg">{emp.full_name}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${isOnLeave ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                    {isOnLeave ? 'إجازة' : 'في العمل'}
                  </span>
                </div>

                <div className="text-sm text-slate-400 space-y-1">
                  <p>تاريخ الانضمام: {emp.joined_at}</p>
                  <p>كلمة السر: <span className="text-amber-400">{emp.password}</span></p>
                  {isOnLeave ? (
                    <p className="text-red-400 font-semibold">سيعود يوم: {vac?.leave_end_date || 'غير محدد'}</p>
                  ) : (
                    <p className="text-emerald-400 font-semibold">موعد نزوله المتوقع: {vac?.leave_start_date || 'جاري حساب الـ 40 يوم'}</p>
                  )}
                  <p className="text-xs text-slate-500">حالة التواجد: {online ? 'متصل الآن' : 'غير متصل'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}