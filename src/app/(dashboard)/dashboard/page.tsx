'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '../layout';
import Link from 'next/link';

type Summary = {
  totalReceipts: number; totalPayments: number; surplus: number;
  cashBalance: number; totalAssets: number; totalLiabilities: number;
  budgetIncome: number; budgetExpense: number; actualIncome: number; actualExpense: number;
};

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const duration = 1200;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * ease));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  const abs = Math.abs(display);
  const formatted = abs >= 1_000_000 ? `${(abs/1_000_000).toFixed(2)}M` : abs >= 1_000 ? `${(abs/1_000).toFixed(1)}K` : abs.toLocaleString('en-KE');
  return <span>{display < 0 ? `(KES ${formatted})` : `KES ${formatted}`}</span>;
}

export default function DashboardPage() {
  const { schoolId, yearId, yearLabel, schoolName } = useApp();
  const [summary, setSummary] = useState<Summary>({ totalReceipts:0, totalPayments:0, surplus:0, cashBalance:0, totalAssets:0, totalLiabilities:0, budgetIncome:0, budgetExpense:0, actualIncome:0, actualExpense:0 });
  const [loading, setLoading] = useState(true);
  const [incomeRows, setIncomeRows] = useState<{label:string; amount:number; color:string}[]>([]);
  const [expenseRows, setExpenseRows] = useState<{label:string; amount:number; color:string}[]>([]);

  useEffect(() => { if (yearId) loadAll(); }, [yearId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [is, bs, bud] = await Promise.all([
        supabase.from('finance_income_statement').select('*').eq('year_id', yearId),
        supabase.from('finance_balance_sheet').select('*').eq('year_id', yearId),
        supabase.from('finance_budget').select('*').eq('year_id', yearId),
      ]);
      const receipts = (is.data||[]).filter((r:any)=>r.category==='receipt').reduce((s:number,r:any)=>s+(r.amount||0),0);
      const payments = (is.data||[]).filter((r:any)=>r.category==='payment').reduce((s:number,r:any)=>s+(r.amount||0),0);
      const assets   = (bs.data||[]).filter((r:any)=>r.section==='asset').reduce((s:number,r:any)=>s+(r.amount||0),0);
      const liabs    = (bs.data||[]).filter((r:any)=>r.section==='liability').reduce((s:number,r:any)=>s+(r.amount||0),0);
      const budInc   = (bud.data||[]).filter((r:any)=>r.section==='income').reduce((s:number,r:any)=>s+((r.original_budget||0)+(r.adjustments||0)),0);
      const budExp   = (bud.data||[]).filter((r:any)=>r.section==='expense').reduce((s:number,r:any)=>s+((r.original_budget||0)+(r.adjustments||0)),0);
      const actInc   = (bud.data||[]).filter((r:any)=>r.section==='income').reduce((s:number,r:any)=>s+(r.actual||0),0);
      const actExp   = (bud.data||[]).filter((r:any)=>r.section==='expense').reduce((s:number,r:any)=>s+(r.actual||0),0);
      setSummary({ totalReceipts:receipts, totalPayments:payments, surplus:receipts-payments, cashBalance:assets-liabs, totalAssets:assets, totalLiabilities:liabs, budgetIncome:budInc, budgetExpense:budExp, actualIncome:actInc, actualExpense:actExp });
      const incColors = ['#2563eb','#7c3aed','#059669','#fbbf24','#f87171'];
      setIncomeRows((is.data||[]).filter((r:any)=>r.category==='receipt'&&r.amount>0).map((r:any,i:number)=>({ label:r.description.split('–').pop()?.trim()||r.vote_head, amount:r.amount, color:incColors[i%incColors.length] })));
      const expColors = ['#dc2626','#f59e0b','#7c3aed','#06b6d4'];
      setExpenseRows((is.data||[]).filter((r:any)=>r.category==='payment'&&r.amount>0).map((r:any,i:number)=>({ label:r.description, amount:r.amount, color:expColors[i%expColors.length] })));
    } finally { setLoading(false); }
  }

  const utilPct = (actual:number, budget:number) => budget===0?0:Math.min(100,Math.round((actual/budget)*100));
  const maxInc = Math.max(...incomeRows.map(r=>r.amount), 1);
  const maxExp = Math.max(...expenseRows.map(r=>r.amount), 1);

  const quickLinks = [
    { href:'/income-statement',  label:'Income Statement',  icon:'📝', color:'#2563eb',  desc:'Receipts & Payments' },
    { href:'/balance-sheet',     label:'Balance Sheet',     icon:'⚖️', color:'#7c3aed',  desc:'Assets & Liabilities' },
    { href:'/cash-flow',         label:'Cash Flow',         icon:'💧', color:'#059669',  desc:'Cash Movements' },
    { href:'/budget',            label:'Budget Analysis',   icon:'🎯', color:'#f59e0b',  desc:'Budget vs Actual' },
    { href:'/notes/grants',      label:'Notes 1–5',         icon:'📋', color:'#06b6d4',  desc:'Grants & Income' },
    { href:'/notes/expenditure', label:'Notes 6–9',         icon:'📋', color:'#ec4899',  desc:'Expenditure Detail' },
    { href:'/notes/accounts',    label:'Notes 10–15',       icon:'📋', color:'#14b8a6',  desc:'Account Schedules' },
    { href:'/notes/other',       label:'Note 17',           icon:'📋', color:'#a855f7',  desc:'Other Disclosures' },
    { href:'/reports',           label:'Generate Reports',  icon:'🖨️', color:'#f43f5e',  desc:'Print / Export' },
    { href:'/setup',             label:'School Setup',      icon:'⚙️', color:'#64748b',  desc:'Configure System' },
  ];

  return (
    <div className="page-body" style={{ maxWidth:'100%', padding: '24px' }}>
      <style>{`
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 20px rgba(37,99,235,0.15)} 50%{box-shadow:0 0 40px rgba(37,99,235,0.3)} }
        .ql-hover:hover { background: #f0f5ff !important; border-color: rgba(37,99,235,0.2) !important; transform: translateY(-3px) !important; }
      `}</style>

      {/* Hero Banner */}
      <div style={{ background:'#ffffff', border:'1px solid #dde6f5', borderRadius:20, padding:'28px 32px', marginBottom:28, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-100, right:-100, width:400, height:400, background:'radial-gradient(circle,rgba(37,99,235,0.05) 0%,transparent 65%)', borderRadius:'50%', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-80, left:150, width:250, height:250, background:'radial-gradient(circle,rgba(124,58,237,0.04) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />
        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:56, height:56, background:'linear-gradient(135deg,#2563eb,#7c3aed)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, boxShadow:'0 12px 32px rgba(37,99,235,0.2)', animation:'pulse-glow 3s ease-in-out infinite' }}>🏫</div>
            <div>
              <h1 style={{ fontSize:28, fontWeight:900, color:'#0f172a', letterSpacing:'-0.5px', marginBottom:6 }}>{schoolName || 'SchoolFinance Pro'}</h1>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:12, color:'#475569' }}>Financial Year</span>
                <span style={{ fontSize:13, fontWeight:700, color:'#2563eb', background:'rgba(37,99,235,0.08)', padding:'3px 12px', borderRadius:8, border:'1px solid rgba(37,99,235,0.15)' }}>{yearLabel||'Not configured'}</span>
                <span style={{ fontSize:12, color:'#475569' }}>|</span>
                <span style={{ fontSize:12, color:'#475569' }}>{new Date().toLocaleDateString('en-KE',{weekday:'short',year:'numeric',month:'short',day:'numeric'})}</span>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Link href="/reports" className="btn-primary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Generate Report
            </Link>
            <Link href="/setup" className="btn-ghost" style={{ color:'#475569' }}>⚙️ Setup</Link>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:18, marginBottom:24 }}>
        {[
          { label:'Total Receipts', value:summary.totalReceipts, colorClass:'green', icon:'📥', sub:'All income sources', note:'Income Statement' },
          { label:'Total Payments', value:summary.totalPayments, colorClass:'red',   icon:'📤', sub:'All expenditure',   note:'Income Statement' },
          { label:'Surplus / (Deficit)', value:summary.surplus, colorClass:summary.surplus>=0?'green':'red', icon:summary.surplus>=0?'🟢':'🔴', sub:'Net for the year', note:'Auto-calculated' },
          { label:'Net Financial Position', value:summary.cashBalance, colorClass:summary.cashBalance>=0?'blue':'red', icon:'🏦', sub:'Assets less Liabilities', note:'Balance Sheet' },
        ].map(k => (
          <div key={k.label} className={`kpi-card ${k.colorClass}`} style={{ background: '#ffffff', border: '1px solid #dde6f5', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div>
                <div className="kpi-label" style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>{k.label}</div>
                <div className="kpi-sub" style={{ marginTop:2, color: '#94a3b8', fontSize: 11 }}>{k.sub}</div>
              </div>
              <span style={{ fontSize:26, filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.1))' }}>{k.icon}</span>
            </div>
            <div style={{ fontSize:22, fontWeight:900, color:k.value<0?'#dc2626':k.value>0?'#059669':'#475569', lineHeight:1.1 }}>
              {loading ? <span style={{ color:'#94a3b8', fontSize:14 }}>Loading…</span> : <AnimatedNumber value={k.value} />}
            </div>
            <div style={{ marginTop:12, height:3, background:'rgba(0,0,0,0.06)', borderRadius:99 }}>
              <div style={{ height:'100%', borderRadius:99, width: k.value>0?'100%':'30%', background:k.value<0?'linear-gradient(90deg,#dc2626,#ef4444)':'linear-gradient(90deg,#2563eb,#7c3aed)', transition:'width 1.5s ease' }} />
            </div>
            <div style={{ fontSize:10, color:'#94a3b8', marginTop:6 }}>Source: {k.note}</div>
          </div>
        ))}
      </div>

      {/* Budget + Health */}
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:18, marginBottom:24 }}>
        {/* Budget Utilisation */}
        <div style={{ background:'#ffffff', border:'1px solid #dde6f5', borderRadius:18, padding:26 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
            <div style={{ width:40, height:40, background:'linear-gradient(135deg,#10b981,#059669)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🎯</div>
            <div>
              <div style={{ fontWeight:700, fontSize:16, color:'#0f172a' }}>Budget Utilisation</div>
              <div style={{ fontSize:12, color:'#475569', marginTop:2 }}>Revised budget vs actual performance</div>
            </div>
          </div>
          {[
            { label:'Income',        budget:summary.budgetIncome,  actual:summary.actualIncome,  col:'#059669' },
            { label:'Expenditure',   budget:summary.budgetExpense, actual:summary.actualExpense, col:'#dc2626' },
          ].map(item => {
            const pct = utilPct(item.actual, item.budget);
            const barColor = pct>100?'linear-gradient(90deg,#dc2626,#ef4444)':pct>80?'linear-gradient(90deg,#f59e0b,#d97706)':'linear-gradient(90deg,#10b981,#059669)';
            return (
              <div key={item.label} style={{ marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:14, fontWeight:600, color:'#0f172a' }}>{item.label}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:12, color:'#475569' }}>Budget: <span style={{ color:'#2563eb', fontWeight:700 }}>KES {(item.budget/1000).toFixed(0)}K</span></span>
                    <span style={{ fontSize:12, color:'#475569' }}>|</span>
                    <span style={{ fontSize:12, color:'#475569' }}>Actual: <span style={{ color:item.col, fontWeight:700 }}>KES {(item.actual/1000).toFixed(0)}K</span></span>
                    <span className={`badge ${pct>100?'badge-red':pct>80?'badge-gold':'badge-green'}`}>{pct}%</span>
                  </div>
                </div>
                <div style={{ background:'rgba(0,0,0,0.06)', borderRadius:99, height:12, overflow:'hidden', position:'relative' }}>
                  <div style={{ height:'100%', borderRadius:99, width:`${Math.min(pct,100)}%`, background:barColor, transition:'width 1.4s ease', position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)', animation:'shimmer 2.5s ease-in-out infinite' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Financial Health */}
        <div style={{ background:'#ffffff', border:'1px solid #dde6f5', borderRadius:18, padding:26 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
            <div style={{ width:40, height:40, background:'linear-gradient(135deg,#7c3aed,#6d28d9)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>💊</div>
            <div>
              <div style={{ fontWeight:700, fontSize:16, color:'#0f172a' }}>Financial Health</div>
              <div style={{ fontSize:12, color:'#475569', marginTop:2 }}>Key ratios & indicators</div>
            </div>
          </div>
          {[
            { label:'Surplus Ratio',           val: summary.totalReceipts>0?Math.round((summary.surplus/summary.totalReceipts)*100):0, unit:'%', good:(v:number)=>v>0 },
            { label:'Expenditure Rate',        val: summary.totalReceipts>0?Math.round((summary.totalPayments/summary.totalReceipts)*100):0, unit:'%', good:(v:number)=>v<100 },
            { label:'Income Budget Hit',       val: utilPct(summary.actualIncome,summary.budgetIncome), unit:'%', good:(v:number)=>v>=80 },
            { label:'Assets / Liabilities',    val: summary.totalLiabilities>0?+(summary.totalAssets/summary.totalLiabilities).toFixed(2):0, unit:'x', good:(v:number)=>v>1 },
          ].map(item => (
            <div key={item.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 14px', background:'rgba(37,99,235,0.03)', borderRadius:10, marginBottom:8, border:'1px solid rgba(0,0,0,0.04)' }}>
              <span style={{ fontSize:12, color:'#475569' }}>{item.label}</span>
              <span style={{ fontSize:16, fontWeight:800, color: item.good(item.val)?'#059669':'#dc2626' }}>{item.val}{item.unit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Income & Expense Bars */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:24 }}>
        {[
          { title:'Income Breakdown', subtitle:'By vote head', rows:incomeRows, max:maxInc, empty:'No income data yet — go to Income Statement' },
          { title:'Expenditure Breakdown', subtitle:'By category',  rows:expenseRows, max:maxExp, empty:'No expenditure data yet — go to Income Statement' },
        ].map(chart => (
          <div key={chart.title} style={{ background:'#ffffff', border:'1px solid #dde6f5', borderRadius:18, padding:26 }}>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontWeight:700, fontSize:16, color:'#0f172a' }}>{chart.title}</div>
              <div style={{ fontSize:12, color:'#475569', marginTop:2 }}>{chart.subtitle}</div>
            </div>
            {chart.rows.length===0 ? (
              <div style={{ padding:'36px 0', textAlign:'center' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>📊</div>
                <div style={{ fontSize:13, color:'#94a3b8' }}>{chart.empty}</div>
              </div>
            ) : chart.rows.map((row,i) => {
              const pct = Math.round((row.amount/chart.max)*100);
              return (
                <div key={i} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:12, color:'#0f172a', fontWeight:500 }}>{row.label}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:row.color }}>KES {row.amount.toLocaleString('en-KE')}</span>
                  </div>
                  <div style={{ background:'rgba(0,0,0,0.06)', borderRadius:99, height:9, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, borderRadius:99, background:`linear-gradient(90deg,${row.color},${row.color}99)`, transition:'width 1.2s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Quick Access */}
      <div style={{ background:'#ffffff', border:'1px solid #dde6f5', borderRadius:18, padding:26 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
          <div style={{ width:40, height:40, background:'linear-gradient(135deg,#2563eb,#7c3aed)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>⚡</div>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:'#0f172a' }}>Quick Data Entry</div>
            <div style={{ fontSize:12, color:'#475569', marginTop:2 }}>Jump directly to any section of the financial statements</div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12 }}>
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href} style={{ textDecoration:'none' }}>
              <div className="ql-hover" style={{ background:'#ffffff', border:'1px solid #dde6f5', borderRadius:14, padding:'18px 12px', textAlign:'center', transition:'all 0.2s ease', cursor:'pointer' }}>
                <div style={{ fontSize:28, marginBottom:8, filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>{link.icon}</div>
                <div style={{ fontSize:12, fontWeight:700, color:'#0f172a', marginBottom:4, lineHeight:1.3 }}>{link.label}</div>
                <div style={{ fontSize:10, color:'#475569', lineHeight:1.4 }}>{link.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
