'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type AppCtx = { schoolId:string; yearId:string; yearLabel:string; schoolName:string; setYear:(id:string,label:string)=>void; };
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
    home:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    settings:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    bar2:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    layers:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    trending:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    target:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    file:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    printer: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
    logout:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  };
  return <span style={{width:18,height:18,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{icons[name]||null}</span>;
};

export default function DashboardLayout({ children }:{children:React.ReactNode}) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]             = useState<any>(null);
  const [schoolId, setSchoolId]     = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [yearId, setYearId]         = useState('');
  const [yearLabel, setYearLabel]   = useState('');
  const [years, setYears]           = useState<any[]>([]);
  const [collapsed, setCollapsed]   = useState(false);

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{
      if(!data.session){router.replace('/login');return;}
      setUser(data.session.user);
      loadSchool();
    });
  },[]);

  async function loadSchool(){
    const {data:school}=await supabase.from('finance_schools').select('*').limit(1).single();
    if(school){
      setSchoolId(school.id);setSchoolName(school.name);
      const {data:yrs}=await supabase.from('finance_financial_years').select('*').eq('school_id',school.id).order('year_label',{ascending:false});
      setYears(yrs||[]);
      const cur=yrs?.find((y:any)=>y.is_current)||yrs?.[0];
      if(cur){setYearId(cur.id);setYearLabel(cur.year_label);}
    }
  }

  async function handleLogout(){
    await supabase.auth.signOut();
    toast.success('Logged out');
    router.push('/login');
  }

  // ── shared inline styles ──
  const W = collapsed ? 62 : 222;
  const sidebarStyle:React.CSSProperties = {
    width:W, minWidth:W, maxWidth:W,
    background:'#ffffff',
    borderRight:'1px solid #dde6f5',
    display:'flex', flexDirection:'column',
    height:'100vh', position:'sticky', top:0,
    transition:'width .2s ease, min-width .2s ease, max-width .2s ease',
    overflow:'hidden', flexShrink:0,
    zIndex:10,
  };
  const navItem = (active:boolean, extra?:React.CSSProperties):React.CSSProperties => ({
    display:'flex', alignItems:'center',
    gap: collapsed ? 0 : 10,
    padding: collapsed ? '9px 0' : '9px 12px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    borderRadius:8, margin:'1px 6px',
    fontSize:13, fontWeight:500,
    color: active ? '#2563eb' : '#475569',
    background: active ? '#dbeafe' : 'transparent',
    textDecoration:'none', whiteSpace:'nowrap',
    cursor:'pointer', border:'none', width:'calc(100% - 12px)',
    transition:'background .15s',
    ...extra,
  });

  return (
    <AppContext.Provider value={{schoolId,yearId,yearLabel,schoolName,setYear:(id,lbl)=>{setYearId(id);setYearLabel(lbl);}}}>
      <style>{`
        .nav-lnk:hover { background: #f0f5ff !important; }
        .page-header { background:#fff; border-bottom:1px solid #dde6f5; display:flex; align-items:center; justify-content:space-between; padding:12px 24px; }
      `}</style>

      <div style={{display:'flex', minHeight:'100vh', background:'#f0f5ff'}}>

        {/* ── SIDEBAR ── */}
        <div style={sidebarStyle}>

          {/* Header row: logo + toggle */}
          <div style={{display:'flex',alignItems:'center',justifyContent: collapsed ? 'center' : 'space-between',padding:'12px 10px',borderBottom:'1px solid #dde6f5',background:'#fff',flexShrink:0,gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:8,overflow:'hidden',minWidth:0}}>
              <div style={{width:34,height:34,background:'linear-gradient(135deg,#2563eb,#7c3aed)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              </div>
              {!collapsed&&<div style={{overflow:'hidden'}}>
                <div style={{fontWeight:800,fontSize:13,color:'#0f172a',whiteSpace:'nowrap'}}>SchoolFinance</div>
                <div style={{fontSize:10,color:'#475569'}}>Pro System</div>
              </div>}
            </div>
            <button onClick={()=>setCollapsed(c=>!c)} title={collapsed?'Expand':'Collapse'}
              style={{width:26,height:26,borderRadius:'50%',background:'#fff',border:'1px solid #dde6f5',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,padding:0,boxShadow:'0 1px 4px rgba(0,0,0,.1)'}}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round">
                {collapsed?<polyline points="9 18 15 12 9 6"/>:<polyline points="15 18 9 12 15 6"/>}
              </svg>
            </button>
          </div>

          {/* Year selector */}
          {!collapsed&&years.length>0&&(
            <div style={{padding:'8px 10px',borderBottom:'1px solid #dde6f5',background:'#fff',flexShrink:0}}>
              <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4}}>Financial Year</div>
              <select style={{padding:'5px 8px',fontSize:12,background:'#fff',color:'#0f172a',border:'1px solid #dde6f5',borderRadius:7,width:'100%'}}
                value={yearId} onChange={e=>{const y=years.find((x:any)=>x.id===e.target.value);if(y){setYearId(y.id);setYearLabel(y.year_label);}}}>
                {years.map((y:any)=><option key={y.id} value={y.id}>{y.year_label}</option>)}
              </select>
            </div>
          )}

          {/* Nav */}
          <nav style={{flex:1,overflowY:'auto',overflowX:'hidden',paddingTop:4}}>
            {NAV.map(group=>(
              <div key={group.section}>
                {!collapsed&&<div style={{fontSize:10,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'#94a3b8',padding:'10px 16px 2px'}}>{group.section}</div>}
                {collapsed&&<div style={{height:8}}/>}
                {group.items.map(item=>{
                  const active = !!pathname?.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href} className="nav-lnk" title={collapsed?item.label:''} style={navItem(active)}>
                      <Icon name={item.icon}/>
                      {!collapsed&&item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div style={{borderTop:'1px solid #dde6f5',background:'#fff',padding: collapsed ? '8px 0' : '10px',flexShrink:0}}>
            {!collapsed&&<div style={{fontSize:11,color:'#475569',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:6,paddingLeft:4}}>{user?.email}</div>}
            <button onClick={handleLogout} title={collapsed?'Sign Out':''} className="nav-lnk"
              style={navItem(false,{color:'#dc2626',width: collapsed ? '100%' : 'calc(100% - 12px)'})}>
              <Icon name="logout"/>
              {!collapsed&&'Sign Out'}
            </button>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div style={{flex:1, minWidth:0, display:'flex', flexDirection:'column', background:'#f0f5ff'}}>
          <div className="page-header no-print">
            <div>
              <div style={{fontWeight:700,fontSize:15,color:'#0f172a'}}>{schoolName||'Set up your school →'}</div>
              <div style={{fontSize:12,color:'#475569'}}>Financial Year: {yearLabel||'None selected'}</div>
            </div>
            <Link href="/reports" className="btn-primary" style={{padding:'8px 16px',fontSize:13,display:'flex',alignItems:'center',gap:6}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Generate Report
            </Link>
          </div>
          {children}
        </div>

      </div>
    </AppContext.Provider>
  );
}
