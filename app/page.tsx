'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { unlock, siren, beep } from '@/lib/sound'
import { enablePush, isNative } from '@/lib/subscribe'

type Emp = { id: string; full_name: string; role: string; joined_at: string; status: 'work' | 'vacation'; work_start: string; vacation_start: string | null; vacation_end: string | null; next_vacation_date: string | null; decision_pending: boolean; password?: string; work_location: string | null; serial: number | null }
const add = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) }
const nextDate = (e: Emp) => e.next_vacation_date || add(e.work_start, 40)
const fmt = (d?: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
const days = (a: string, b: string) => Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 864e5))
async function api(path: string, body?: any) {
  const r = await fetch(path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' })
  return r.json()
}

export default function Home() {
  const [st, setSt] = useState<any>(null), [ready, setReady] = useState(false)
  const [theme, setTheme] = useState('night'), [tab, setTab] = useState('list')
  const [perm, setPerm] = useState('granted')
  const [sheet, setSheet] = useState<string | null>(null), [toast, setToast] = useState(''), [online, setOnline] = useState<string[]>([])
  const refresh = useCallback(async () => { const d = await api('/api/state'); setSt(d.me ? d : null); setReady(true); return d }, [])

  useEffect(() => { const t = localStorage.getItem('rp_theme') || 'night'; setTheme(t); document.documentElement.dataset.theme = t }, [])
  useEffect(() => { refresh(); const i = setInterval(refresh, 8000); return () => clearInterval(i) }, [refresh])

  const me: Emp | null = st?.me || null, today: string = st?.today || ''
  const emps: Emp[] = st?.employees || [], isAdmin = me?.role === 'admin'
  useEffect(() => { if (!me) return; if (isNative()) { enablePush(); return } if ('Notification' in window) { setPerm(Notification.permission); if (Notification.permission === 'granted') enablePush() } }, [me?.id])

  // أحداث عامة: فلان عاد / فلان نزل
  useEffect(() => {
    if (!st) return
    const ev = st.events as any[], last = Number(localStorage.getItem('rp_last') ?? -1)
    const max = ev.reduce((m, e) => Math.max(m, e.id), 0)
    if (last >= 0) {
      const fresh = ev.filter(e => e.id > last && e.kind !== 'over').reverse()
      if (fresh.length) {
        const m = fresh[fresh.length - 1].message
        setToast(m); beep(); setTimeout(() => setToast(''), 7000)
        if ('Notification' in window && Notification.permission === 'granted') new Notification('Rental Power', { body: m, icon: '/icon-192.png' })
      }
    }
    localStorage.setItem('rp_last', String(max))
  }, [st])

  // المتصلين الآن
  useEffect(() => {
    if (!me) return
    const sb = createClient(), ch = sb.channel('online', { config: { presence: { key: me.id } } })
    ch.on('presence', { event: 'sync' }, () => setOnline(Object.values(ch.presenceState()).map((a: any) => a[0].name)))
      .subscribe(async s => { if (s === 'SUBSCRIBED') await ch.track({ name: me.full_name }) })
    return () => { sb.removeChannel(ch) }
  }, [me?.id])

  // الإنذار الصوتي المزعج (يتكرر لحد ما الموظف يتصرف)
  const alarm = me && !isAdmin ? (me.status === 'vacation' && me.vacation_end! <= today ? 'over' : me.decision_pending ? 'decision' : null) : null
  useEffect(() => { siren(!!alarm); return () => siren(false) }, [alarm])

  const toggleTheme = () => { const t = theme === 'night' ? 'day' : 'night'; setTheme(t); localStorage.setItem('rp_theme', t); document.documentElement.dataset.theme = t }
  const act = async (b: any) => { const r = await api('/api/action', b); if (!r.ok) alert(r.error); await refresh(); return r.ok }
  const logout = async () => { await api('/api/logout', {}); setSt(null) }

  if (!ready) return <div className="wrap login mut">...</div>
  if (!me) return <Login onDone={refresh} />

  const sel = emps.find(e => e.id === sheet)
  return <div className="wrap">
    <div className="top"><img src="/logo.png" alt="" /><h1>أهلاً، {me.full_name}</h1>
      <button className={'ib lamp ' + (theme === 'day' ? 'on' : '')} onClick={toggleTheme} title="ليلي / نهاري">💡</button>
      <button className="ib" onClick={logout} title="خروج">⎋</button></div>
    {toast && <div className="toast">🔔 {toast}</div>}
    {perm !== 'granted' && <button className="btn red" onClick={async () => { unlock(); setPerm((await enablePush()) ? 'granted' : 'denied') }}>🔔 فعّل التنبيهات حتى لو التطبيق مقفول</button>}

    {!isAdmin && <MyCard me={me} today={today} act={act} />}

    {isAdmin && <div className="tabs">{[['list', 'الموظفين'], ['on', `المتصلين (${online.length})`], ['log', 'السجل'], ['new', '+ موظف']].map(([k, l]) => <button key={k} className={tab === k ? 'a' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>}

    {(!isAdmin || tab === 'list') && <>
      <h3 style={{ margin: '6px 4px' }}>قائمة الموظفين</h3>
      {emps.map(e => <div key={e.id} className="row" onClick={() => setSheet(e.id)}>
        <span className="sn">{e.serial}</span>
        <div className="n"><b className={e.status === 'work' ? 'work' : 'vac'}>{e.full_name}{e.status === 'work' && e.work_location && <i className="loc">📍 {e.work_location}</i>}</b>
          <span>{e.status === 'work' ? `موعد نزوله: ${fmt(nextDate(e))}` : `سيعود يوم: ${fmt(e.vacation_end)}`}</span></div>
        <span className={'badge ' + (e.status === 'work' ? 'work' : 'vac')}>{e.status === 'work' ? 'في العمل' : 'إجازة'}</span>
      </div>)}
      {!emps.length && <p className="mut">لا يوجد موظفين بعد</p>}
    </>}

    {isAdmin && tab === 'on' && <div className="card"><b>🟢 المتصلين الآن</b>{online.map((n, i) => <p key={i}>{n}</p>)}{!online.length && <p className="mut">لا أحد</p>}</div>}
    {isAdmin && tab === 'log' && st.events.map((e: any, i: number) => <div key={e.id} className="card"><span className="sn">{st.total - i}</span> {e.message}<br />
      <small className="mut">{new Date(e.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' })}</small>
      <div className="mini"><button className="btn gray" onClick={() => { const m = prompt('تعديل النص', e.message); if (m) act({ type: 'event_edit', id: e.id, message: m }) }}>✏️ تعديل</button>
        <button className="btn red" onClick={() => confirm('حذف هذا السجل؟') && act({ type: 'event_delete', id: e.id })}>🗑 حذف</button></div></div>)}
    {isAdmin && tab === 'new' && <NewEmp today={today} act={async (b: any) => { if (await act({ type: 'add', ...b })) setTab('list') }} />}

    {sel && <div className="sheet" onClick={() => setSheet(null)}><div onClick={e => e.stopPropagation()}>
      <Profile e={sel} isAdmin={isAdmin} today={today} act={act} close={() => setSheet(null)} /></div></div>}

    {alarm && <div className="modal alarm"><div>
      <div style={{ fontSize: 60 }}>🚨</div>
      {alarm === 'over' ? <>
        <h2>انتهت الإجازة!</h2><p>برجاء العودة إلى العمل، ثم سجّل تاريخ العودة</p>
        <DateBtn label="تسجيل العودة" def={today} onOk={d => act({ type: 'return', date: d })} /></> : <>
        <h2>حان موعد إجازتك 🎉</h2><p>هل تقبل النزول في الإجازة؟</p>
        <DateBtn label="قبول - تحديد تاريخ النزول" def={today} onOk={d => act({ type: 'decision', accept: true, date: d })} />
        <button className="btn red" onClick={() => act({ type: 'decision', accept: false })}>رفض (٤٠ يوم من جديد)</button></>}
    </div></div>}
  </div>
}

function DateBtn({ label, def, onOk, red }: { label: string; def: string; onOk: (d: string) => void; red?: boolean }) {
  const [d, setD] = useState(def)
  return <div><input type="date" value={d} onChange={e => setD(e.target.value)} /><button className={'btn ' + (red ? 'red' : '')} onClick={() => onOk(d)}>{label}</button></div>
}

function MyCard({ me, today, act }: { me: Emp; today: string; act: (b: any) => Promise<boolean> }) {
  const work = me.status === 'work', left = days(today, nextDate(me))
  return <div className="card hero">
    <small>{work ? 'متبقي على إجازتك' : 'أنت الآن في إجازة'}</small>
    <div className="big">{work ? `${left} يوم` : `تعود ${fmt(me.vacation_end)}`}</div>
    <small>{work ? `موعد النزول: ${fmt(nextDate(me))}` : `نزلت يوم ${fmt(me.vacation_start)}`}</small>
    {work ? <DateBtn label="تسجيل تاريخ نزول الإجازة" def={today} onOk={d => act({ type: 'depart', date: d })} />
      : <DateBtn label="تسجيل تاريخ العودة للعمل" def={today} onOk={d => act({ type: 'return', date: d })} />}
  </div>
}

function Profile({ e, isAdmin, today, act, close }: { e: Emp; isAdmin: boolean; today: string; act: (b: any) => Promise<boolean>; close: () => void }) {
  const work = e.status === 'work', [edit, setEdit] = useState(false)
  const [f, setF] = useState<any>({ name: e.full_name, password: e.password || '', joined_at: e.joined_at || '', work_location: e.work_location || '', work_start: e.work_start || '', status: e.status, vacation_start: e.vacation_start || '', vacation_end: e.vacation_end || '', next_vacation_date: e.next_vacation_date || '' })
  const set = (k: string) => (ev: any) => setF({ ...f, [k]: ev.target.value })
  const L = (t: string, k: string, type = 'text') => <label><small className="mut">{t}</small><input type={type} value={f[k]} onChange={set(k)} /></label>
  return <>
    <h2 style={{ margin: 0 }}><span className="sn">{e.serial}</span> {e.full_name} <span className={'badge ' + (work ? 'work' : 'vac')}>{work ? 'في العمل' : 'إجازة'}</span></h2>
    <p className="mut">تاريخ الانضمام للشركة: {fmt(e.joined_at)}</p>
    {isAdmin && <p>🔑 كلمة السر: <b>{e.password}</b></p>}
    {work && <div className="locbox">📍 موقع العمل: {e.work_location || 'لم يُحدد بعد'}</div>}
    <div className="card">{work ? `موعد إجازة هذا الموظف: ${fmt(nextDate(e))}` : `هذا الموظف في إجازة حالياً — تاريخ العودة: ${fmt(e.vacation_end)}`}</div>
    {isAdmin && <>
      {work && <div><input placeholder="موقع العمل" value={f.work_location} onChange={set('work_location')} />
        <button className="btn" onClick={() => act({ type: 'update', id: e.id, fields: { work_location: f.work_location } })}>حفظ موقع العمل</button></div>}
      {work ? <DateBtn label="تسجيل نزول إجازة" def={today} onOk={d => act({ type: 'depart', id: e.id, date: d })} />
        : <DateBtn label="تسجيل عودة للعمل" def={today} onOk={d => act({ type: 'return', id: e.id, date: d })} />}
      {work && e.next_vacation_date && <button className="btn gray" onClick={() => act({ type: 'update', id: e.id, fields: { next_vacation_date: '' } })}>إلغاء الإجازة المجدولة</button>}
      <button className="btn gray" onClick={() => setEdit(!edit)}>✏️ تعديل كل البيانات</button>
      {edit && <div className="card">
        {L('الاسم', 'name')}{L('كلمة السر', 'password')}{L('تاريخ الانضمام', 'joined_at', 'date')}{L('بداية عد الـ40 يوم (آخر عودة)', 'work_start', 'date')}
        <label><small className="mut">الحالة</small><select value={f.status} onChange={set('status')}><option value="work">في العمل</option><option value="vacation">إجازة</option></select></label>
        {L('تاريخ نزول الإجازة', 'vacation_start', 'date')}{L('تاريخ العودة من الإجازة', 'vacation_end', 'date')}{L('موعد الإجازة القادمة', 'next_vacation_date', 'date')}
        <button className="btn" onClick={async () => { if (await act({ type: 'update', id: e.id, fields: f })) setEdit(false) }}>حفظ التعديلات</button></div>}
      <button className="btn red" onClick={async () => { if (confirm('حذف ' + e.full_name + '؟') && await act({ type: 'delete', id: e.id })) close() }}>🗑 حذف الموظف</button></>}
    <button className="btn gray" onClick={close}>إغلاق</button>
  </>
}

function NewEmp({ today, act }: { today: string; act: (b: any) => void }) {
  const [name, setName] = useState(''), [password, setPw] = useState(''), [joined_at, setJ] = useState(today), [work_location, setLoc] = useState('')
  return <div className="card"><b>إضافة موظف جديد</b>
    <input placeholder="الاسم ثلاثي" value={name} onChange={e => setName(e.target.value)} />
    <input placeholder="كلمة السر" value={password} onChange={e => setPw(e.target.value)} />
    <input placeholder="موقع العمل (اختياري)" value={work_location} onChange={e => setLoc(e.target.value)} />
    <small className="mut">تاريخ الانضمام</small><input type="date" value={joined_at} onChange={e => setJ(e.target.value)} />
    <button className="btn" onClick={() => act({ name, password, joined_at, work_location })}>حفظ الموظف</button></div>
}

function Login({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState(''), [password, setPw] = useState(''), [err, setErr] = useState('')
  const go = async () => {
    unlock()
    const r = await api('/api/login', { name, password })
    if (!r.ok) return setErr(r.error)
    await enablePush(); onDone()
  }
  return <div className="wrap login"><img src="/logo.png" alt="Rental Power" /><h2>إجازات الموظفين</h2>
    <input placeholder="الاسم ثلاثي" value={name} onChange={e => setName(e.target.value)} />
    <input type="password" placeholder="كلمة السر" value={password} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
    {err && <p className="err">{err}</p>}<button className="btn" onClick={go}>دخول</button></div>
}
