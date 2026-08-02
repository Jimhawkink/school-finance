'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type AppCtx = { schoolId: string; yearId: string; yearLabel: string; schoolName: string; setYear: (id:string,label:string)=>void; };
export const AppContext = createContext<AppCtx>({ schoolId:'', yearId:'', yearLabel:'', schoolName:'', setYear:()=>{} });
export const useApp = () => useContext(AppContext);

const NAV = [
  { section:'OVERVIEW',   items:[
    { href:'/dashboard',         icon:'home',    label:'Dashboard' },
    { href:'/setup',             icon:'settings',label:'School Setup' },
  ]},
  { section:'DATA ENTRY', items:[
    { href:'/income-statement',  icon:'bar2',    label:'Income Statement' },
    { href:'/balance-sheet',     icon:'layers',  label:'Balance Sheet' },
    { href:'/cash-flow',         icon:'trending',label:'Cash Flow' },
    { href:'/budget',            icon:'target',  label:'Budget Analysis' },
  ]},
  { section:'NOTES',      items:[
    { href:'/notes/grants',      icon:'file',    label:'Grants' },
    { href:'/notes/expenditure', icon:'file',    label:'Expenditure' },
    { href:'/notes/accounts',    icon:'file',    label:'Accounts' },
    { href:'/notes/other',       icon:'file',    label:'Other' },
  ]},
  { section:'REPORTS',    items:[
    { href:'/reports',           icon:'printer', label:'Generate Reports' },
  ]},
];

const Icon = ({ name }:{name:string}) => {
  const icons:Record<string,React.ReactNode> = {
    home:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    bar2:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    layers:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    trending: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    target:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    file:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    printer:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
    logout:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  };
  return <span style={{width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{icons[name]||null}</span>;
};

export default function DashboardLayout({ children }:{children:React.ReactNode}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [schoolId, setSchoolId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [yearId, setYearId] = useState('');
  const [yearLabel, setYearLabel] = useState('');
  const [years, setYears] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return; }
      setUser(data.session.user);
      loadSchool();
    });
  }, []);

  async function loadSchool() {
    const { data: school } = await supabase.from('finance_schools').select('*').limit(1).single();
    if (school) {
      setSchoolId(school.id); setSchoolName(school.name);
      const { data: yrs } = await supabase.from('finance_financial_years').select('*').eq('school_id', school.id).order('year_label', { ascending: false });
      setYears(yrs || []);
      const cur = yrs?.find((y:any) => y.is_current) || yrs?.[0];
      if (cur) { setYearId(cur.id); setYearLabel(cur.year_label); }
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success('Logged out');
    router.push('/login');
  }

  return (
    <AppContext.Provider value={{ schoolId, yearId, yearLabel, schoolName, setYear:(id,lbl)=>{setYearId(id);setYearLabel(lbl);} }}>
      <style>{`
        .sidebar { background: #ffffff !important; border-right: 1px solid #dde6f5 !important; }
        .sidebar-logo { background: #ffffff !important; }
        .nav-item { color: #475569 !important; }
        .nav-item:hover { background: #f0f5ff !important; }
        .nav-item.active { color: #2563eb !important; background: #dbeafe !important; }
        .nav-section-label { color: #94a3b8 !important; }
        .page-header { background: #ffffff !important; border-bottom: 1px solid #dde6f5 !important; }
        .main-content { background: #f0f5ff !important; }
      `}</style>
      <div style={{ display:'flex', minHeight: '100vh', background: '#f0f5ff' }}>
        {/* Sidebar */}
        <div className="sidebar" style={{ background: '#ffffff', borderRight: '1px solid #dde6f5' }}>
          <div className="sidebar-logo" style={{ background: '#ffffff' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:38, height:38, background:'linear-gradient(135deg,#2563eb,#7c3aed)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:14, color:'#0f172a', lineHeight:1.2 }}>SchoolFinance</div>
                <div style={{ fontSize:10, color:'#475569', fontWeight:500 }}>Pro System</div>
              </div>
            </div>
          </div>

          {/* Year selector */}
          {years.length > 0 && (
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #dde6f5', background: '#ffffff' }}>
              <div style={{ fontSize:10, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Financial Year</div>
              <select className="form-select" style={{ padding:'7px 12px', fontSize:13, background: '#ffffff', color: '#0f172a', border: '1px solid #dde6f5' }} value={yearId} onChange={e=>{
                const y=years.find((x:any)=>x.id===e.target.value);
                if(y){setYearId(y.id);setYearLabel(y.year_label);}
              }}>
                {years.map((y:any)=><option key={y.id} value={y.id}>{y.year_label}</option>)}
              </select>
            </div>
          )}

          <nav className="sidebar-nav">
            {NAV.map(group => (
              <div key={group.section}>
                <div className="nav-section-label" style={{ color: '#94a3b8' }}>{group.section}</div>
                {group.items.map(item => (
                  <Link key={item.href} href={item.href} className={`nav-item ${pathname?.startsWith(item.href) ? 'active' : ''}`}>
                    <Icon name={item.icon} />
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          <div style={{ padding:'12px 16px', borderTop:'1px solid #dde6f5', background: '#ffffff' }}>
            <div style={{ fontSize:12, color:'#475569', marginBottom:10, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
            <button onClick={handleLogout} className="nav-item" style={{ color:'#dc2626', width:'100%' }}>
              <Icon name="logout" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="main-content" style={{ flex:1, background: '#f0f5ff' }}>
          {/* Top bar */}
          <div className="page-header no-print" style={{ background: '#ffffff', borderBottom: '1px solid #dde6f5' }}>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:'#0f172a' }}>{schoolName || 'Set up your school →'}</div>
              <div style={{ fontSize:12, color:'#475569' }}>Financial Year: {yearLabel || 'None selected'}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <Link href="/reports" className="btn-primary" style={{ padding:'8px 16px', fontSize:13 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Generate Report
              </Link>
            </div>
          </div>
          {children}
        </div>
      </div>
    </AppContext.Provider>
  );
}
