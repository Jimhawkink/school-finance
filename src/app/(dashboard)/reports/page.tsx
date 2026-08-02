'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '../layout';
import toast from 'react-hot-toast';

type ReportData = {
  school: any;
  year: any;
  incomeStatement: any[];
  balanceSheet: any[];
  cashFlow: any[];
  budget: any[];
  notes: any[];
};

const REPORTS = [
  { id:'income',   label:'Income Statement',           desc:'Receipts & Payments Account',     icon:'📝', color:'#4f7ef8' },
  { id:'balance',  label:'Balance Sheet',              desc:'Statement of Assets & Liabilities',icon:'⚖️', color:'#8b5cf6' },
  { id:'cashflow', label:'Cash Flow Statement',        desc:'Statement of Cash Flows',          icon:'💧', color:'#10b981' },
  { id:'budget',   label:'Budget Analysis Report',    desc:'Budget vs Actual Performance',    icon:'🎯', color:'#f59e0b' },
  { id:'notes',    label:'Notes to Accounts',         desc:'Notes 1–17 Full Disclosure',      icon:'📋', color:'#06b6d4' },
  { id:'full',     label:'Complete Financial Report', desc:'All statements in one document',  icon:'📑', color:'#f43f5e' },
];

export default function ReportsPage() {
  const { schoolId, yearId, yearLabel, schoolName } = useApp();
  const [selected, setSelected]   = useState<string[]>([]);
  const [data, setData]           = useState<ReportData|null>(null);
  const [loading, setLoading]     = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  async function loadData() {
    if (!yearId) { toast.error('Select a financial year first'); return; }
    setLoading(true);
    const t = toast.loading('Loading financial data…');
    try {
      const [sc, yr, is, bs, cf, bud, notes] = await Promise.all([
        supabase.from('finance_schools').select('*').eq('id', schoolId).single(),
        supabase.from('finance_financial_years').select('*').eq('id', yearId).single(),
        supabase.from('finance_income_statement').select('*').eq('year_id', yearId).order('sort_order'),
        supabase.from('finance_balance_sheet').select('*').eq('year_id', yearId).order('sort_order'),
        supabase.from('finance_cash_flow').select('*').eq('year_id', yearId).order('sort_order'),
        supabase.from('finance_budget').select('*').eq('year_id', yearId).order('sort_order'),
        supabase.from('finance_notes').select('*').eq('year_id', yearId).order('note_number,sort_order'),
      ]);
      setData({ school:sc.data, year:yr.data, incomeStatement:is.data||[], balanceSheet:bs.data||[], cashFlow:cf.data||[], budget:bud.data||[], notes:notes.data||[] });
      toast.success('Data loaded — ready to preview & print!', { id:t });
      setPreviewing(true);
    } catch(e:any) { toast.error(e.message, { id:t }); }
    setLoading(false);
  }

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('','_blank','width=900,height=700');
    if (!win) { toast.error('Pop-up blocked — please allow pop-ups'); return; }
    win.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Financial Report – ${schoolName} – ${yearLabel}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        body{font-family:'Inter',sans-serif;margin:0;padding:24px;color:#1a1a2e;background:#fff;}
        h1{font-size:20px;font-weight:900;color:#1a1a2e;margin:0 0 4px}
        h2{font-size:15px;font-weight:800;color:#2a2a4a;margin:20px 0 8px;padding-bottom:6px;border-bottom:2px solid #4f7ef8;}
        h3{font-size:13px;font-weight:700;color:#2a2a4a;margin:14px 0 6px;padding:4px 10px;background:#f0f4ff;border-radius:4px;}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;}
        thead th{background:#f0f4ff;color:#2a2a4a;font-weight:700;padding:9px 12px;text-align:left;border:1px solid #d4ddf7;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;}
        tbody td{padding:8px 12px;border-bottom:1px solid #e8ecf8;vertical-align:middle;}
        tbody tr:nth-child(even){background:#fafbff;}
        .total-row{background:#e8f0ff!important;font-weight:800;}
        .section-row{background:#f0f4ff!important;font-weight:700;font-size:11px;text-transform:uppercase;color:#4f7ef8;}
        .text-right{text-align:right;}
        .surplus-row{background:linear-gradient(135deg,#e8f0ff,#ede8ff)!important;font-weight:900;font-size:13px;}
        .school-header{text-align:center;padding:20px;border:2px solid #4f7ef8;border-radius:12px;margin-bottom:24px;background:linear-gradient(135deg,#f0f4ff,#ede8ff);}
        .school-header p{margin:2px 0;font-size:12px;color:#555;}
        .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;font-size:12px;}
        .meta-item{background:#f8f9ff;padding:10px;border-radius:8px;border:1px solid #e0e7ff;}
        .meta-label{font-weight:700;color:#4f7ef8;display:block;margin-bottom:2px;font-size:10px;text-transform:uppercase;}
        .page-break{page-break-before:always;}
        .amount-positive{color:#059669;font-weight:700;}
        .amount-negative{color:#dc2626;font-weight:700;}
        .footer{margin-top:40px;padding:20px;border-top:2px solid #e0e7ff;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;}
        .sig-line{border-top:1px solid #333;padding-top:8px;margin-top:40px;font-size:11px;color:#555;}
        @media print{body{padding:12px;}.no-print{display:none!important;}h2{page-break-before:auto;}}
      </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }

  const fmt = (n:number) => n===0?'-': n<0?`(${Math.abs(n).toLocaleString('en-KE',{minimumFractionDigits:2})})`:n.toLocaleString('en-KE',{minimumFractionDigits:2});
  const fmtColor = (n:number) => n<0?'amount-negative':n>0?'amount-positive':'';

  const showReport = (id:string) => selected.includes('full') || selected.includes(id);

  return (
    <div className="page-body">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:900, color:'#e8edf8', letterSpacing:'-0.5px' }}>🖨️ Report Generator</h1>
          <p style={{ color:'#7a90b8', fontSize:13, marginTop:4 }}>Generate, preview and print professional financial reports</p>
        </div>
        {previewing && data && (
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn-ghost" onClick={() => { setPreviewing(false); setData(null); }}>← Back</button>
            <button className="btn-primary" onClick={handlePrint}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print / Export PDF
            </button>
          </div>
        )}
      </div>

      {!previewing ? (
        <>
          {/* Report Selector */}
          <div style={{ background:'#0d1526', border:'1px solid #1e2d4a', borderRadius:18, padding:28, marginBottom:24 }}>
            <div style={{ fontWeight:700, fontSize:16, color:'#e8edf8', marginBottom:6 }}>Select Reports to Generate</div>
            <div style={{ fontSize:13, color:'#7a90b8', marginBottom:20 }}>Choose one or more reports, then click "Load & Preview"</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
              {REPORTS.map(r => {
                const active = selected.includes(r.id);
                return (
                  <div key={r.id} onClick={() => setSelected(p => active ? p.filter(x=>x!==r.id) : [...p.filter(x=>x!=='full'),r.id])}
                    style={{ border:`2px solid ${active?r.color:'#1e2d4a'}`, borderRadius:14, padding:'18px 20px', cursor:'pointer', background:active?`${r.color}12`:'rgba(255,255,255,0.02)', transition:'all 0.2s', position:'relative', overflow:'hidden' }}>
                    {active && <div style={{ position:'absolute', top:10, right:12, width:20, height:20, background:r.color, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>✓</div>}
                    <div style={{ fontSize:28, marginBottom:10 }}>{r.icon}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#e8edf8', marginBottom:4 }}>{r.label}</div>
                    <div style={{ fontSize:12, color:'#7a90b8' }}>{r.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div style={{ background:'#0d1526', border:'1px solid #1e2d4a', borderRadius:18, padding:24, marginBottom:24 }}>
            <div style={{ fontWeight:700, fontSize:15, color:'#e8edf8', marginBottom:16 }}>Report Options</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
              {[
                { label:'Include School Header', sub:'School name, district, year' },
                { label:'Include Signatures Block', sub:'Principal, Treasurer, BOM Chair' },
                { label:'Include Notes to Accounts', sub:'Detailed schedules 1–17' },
              ].map((opt,i) => (
                <label key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer', padding:'14px 16px', background:'rgba(255,255,255,0.03)', borderRadius:12, border:'1px solid #1e2d4a' }}>
                  <input type="checkbox" defaultChecked style={{ marginTop:2, accentColor:'#4f7ef8', width:16, height:16 }} />
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#e8edf8' }}>{opt.label}</div>
                    <div style={{ fontSize:11, color:'#7a90b8', marginTop:2 }}>{opt.sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'center' }}>
            <button className="btn-primary" onClick={loadData} disabled={loading||selected.length===0} style={{ padding:'14px 48px', fontSize:16, borderRadius:14 }}>
              {loading ? (
                <><span style={{ width:18, height:18, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }} /> Loading Data…</>
              ) : '🔍 Load & Preview Report'}
            </button>
          </div>
        </>
      ) : data && (
        /* Print Preview */
        <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
          {/* Preview toolbar */}
          <div style={{ background:'#1a1a2e', padding:'12px 24px', display:'flex', alignItems:'center', gap:16, borderBottom:'3px solid #4f7ef8' }}>
            <div style={{ display:'flex', gap:6 }}>
              {['#ef4444','#f59e0b','#10b981'].map(c=><div key={c} style={{width:12,height:12,borderRadius:'50%',background:c}} />)}
            </div>
            <span style={{ fontSize:13, color:'#7a90b8', flex:1, textAlign:'center' }}>📄 Print Preview — {schoolName} · {yearLabel}</span>
            <button className="btn-primary" onClick={handlePrint} style={{ padding:'6px 18px', fontSize:13 }}>🖨️ Print</button>
          </div>

          {/* Printable content */}
          <div ref={printRef} style={{ padding:'40px 48px', color:'#1a1a2e', fontFamily:"'Inter',sans-serif", fontSize:13 }}>
            {/* School Header */}
            <div style={{ textAlign:'center', padding:'24px 20px', border:'2px solid #4f7ef8', borderRadius:12, marginBottom:32, background:'linear-gradient(135deg,#f0f4ff,#ede8ff)' }}>
              <h1 style={{ fontSize:22, fontWeight:900, color:'#1a1a2e', margin:'0 0 6px' }}>{data.school?.name || schoolName}</h1>
              <p style={{ margin:'2px 0', fontSize:12, color:'#555' }}>{data.school?.district} District · {data.school?.county} County</p>
              <p style={{ margin:'2px 0', fontSize:12, color:'#555' }}>P.O. Box {data.school?.postal_address} | Tel: {data.school?.phone}</p>
              <div style={{ display:'inline-block', marginTop:10, padding:'4px 20px', background:'#4f7ef8', color:'#fff', borderRadius:99, fontSize:13, fontWeight:700 }}>
                FINANCIAL STATEMENTS — {yearLabel}
              </div>
            </div>

            {/* Meta Info */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:32, fontSize:12 }}>
              {[
                { l:'Principal', v:data.school?.principal_name },
                { l:'BOM Chairperson', v:data.school?.bom_chairperson },
                { l:'Financial Year', v:yearLabel },
              ].map(m => (
                <div key={m.l} style={{ background:'#f8f9ff', padding:'10px 14px', borderRadius:8, border:'1px solid #e0e7ff' }}>
                  <span style={{ display:'block', fontSize:10, fontWeight:700, color:'#4f7ef8', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>{m.l}</span>
                  <span style={{ fontWeight:600, color:'#1a1a2e' }}>{m.v || '—'}</span>
                </div>
              ))}
            </div>

            {/* ── INCOME STATEMENT ── */}
            {(showReport('income')||showReport('full')) && (() => {
              const receipts = data.incomeStatement.filter(r=>r.category==='receipt');
              const payments = data.incomeStatement.filter(r=>r.category==='payment');
              const totRecCur = receipts.reduce((s:number,r:any)=>s+(r.amount||0),0);
              const totRecPrev= receipts.reduce((s:number,r:any)=>s+(r.prev_amount||0),0);
              const totPayCur = payments.reduce((s:number,r:any)=>s+(r.amount||0),0);
              const totPayPrev= payments.reduce((s:number,r:any)=>s+(r.prev_amount||0),0);
              return (
                <>
                  <h2 style={{ fontSize:16, fontWeight:900, color:'#1a1a2e', marginBottom:8, paddingBottom:8, borderBottom:'2px solid #4f7ef8' }}>1. Receipts and Payments Account (Income Statement)</h2>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, marginBottom:24 }}>
                    <thead>
                      <tr>
                        {['Note','Description','Current Year (KES)','Previous Year (KES)'].map(h=>(
                          <th key={h} style={{ background:'#f0f4ff', color:'#2a2a4a', fontWeight:700, padding:'9px 12px', textAlign:h.includes('Year')?'right':'left', border:'1px solid #d4ddf7', fontSize:11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td colSpan={4} style={{ background:'#f0f8f4', fontWeight:700, padding:'8px 12px', color:'#059669', fontSize:11, textTransform:'uppercase' }}>RECEIPTS</td></tr>
                      {receipts.map((r:any,i:number)=>(
                        <tr key={i} style={{ background:i%2===0?'#fff':'#fafbff' }}>
                          <td style={{ padding:'8px 12px', color:'#4f7ef8', fontWeight:600 }}>{r.note_ref||''}</td>
                          <td style={{ padding:'8px 12px' }}>{r.description}</td>
                          <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:600 }}>{fmt(r.amount||0)}</td>
                          <td style={{ padding:'8px 12px', textAlign:'right', color:'#666' }}>{fmt(r.prev_amount||0)}</td>
                        </tr>
                      ))}
                      <tr style={{ background:'#e8f5ee', fontWeight:800 }}>
                        <td colSpan={2} style={{ padding:'9px 12px' }}>Total Receipts</td>
                        <td style={{ padding:'9px 12px', textAlign:'right', color:'#059669' }}>{fmt(totRecCur)}</td>
                        <td style={{ padding:'9px 12px', textAlign:'right', color:'#666' }}>{fmt(totRecPrev)}</td>
                      </tr>
                      <tr><td colSpan={4} style={{ height:8 }}></td></tr>
                      <tr><td colSpan={4} style={{ background:'#fef4f4', fontWeight:700, padding:'8px 12px', color:'#dc2626', fontSize:11, textTransform:'uppercase' }}>PAYMENTS</td></tr>
                      {payments.map((r:any,i:number)=>(
                        <tr key={i} style={{ background:i%2===0?'#fff':'#fafbff' }}>
                          <td style={{ padding:'8px 12px', color:'#4f7ef8', fontWeight:600 }}>{r.note_ref||''}</td>
                          <td style={{ padding:'8px 12px' }}>{r.description}</td>
                          <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:600 }}>{fmt(r.amount||0)}</td>
                          <td style={{ padding:'8px 12px', textAlign:'right', color:'#666' }}>{fmt(r.prev_amount||0)}</td>
                        </tr>
                      ))}
                      <tr style={{ background:'#fee8e8', fontWeight:800 }}>
                        <td colSpan={2} style={{ padding:'9px 12px' }}>Total Payments</td>
                        <td style={{ padding:'9px 12px', textAlign:'right', color:'#dc2626' }}>{fmt(totPayCur)}</td>
                        <td style={{ padding:'9px 12px', textAlign:'right', color:'#666' }}>{fmt(totPayPrev)}</td>
                      </tr>
                      <tr><td colSpan={4} style={{ height:8 }}></td></tr>
                      <tr style={{ background:'linear-gradient(135deg,#e8f0ff,#ede8ff)', fontWeight:900, fontSize:14 }}>
                        <td colSpan={2} style={{ padding:'12px 12px' }}>SURPLUS / (DEFICIT) FOR THE YEAR</td>
                        <td style={{ padding:'12px 12px', textAlign:'right', color:totRecCur-totPayCur>=0?'#059669':'#dc2626', fontSize:15 }}>{fmt(totRecCur-totPayCur)}</td>
                        <td style={{ padding:'12px 12px', textAlign:'right', color:totRecPrev-totPayPrev>=0?'#059669':'#dc2626' }}>{fmt(totRecPrev-totPayPrev)}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              );
            })()}

            {/* ── BALANCE SHEET ── */}
            {(showReport('balance')||showReport('full')) && (() => {
              const assets  = data.balanceSheet.filter(r=>r.section==='asset');
              const liabs   = data.balanceSheet.filter(r=>r.section==='liability');
              const equity  = data.balanceSheet.filter(r=>r.section==='equity');
              const totA    = assets.reduce((s:number,r:any)=>s+(r.amount||0),0);
              const totL    = liabs.reduce((s:number,r:any)=>s+(r.amount||0),0);
              const totE    = equity.reduce((s:number,r:any)=>s+(r.amount||0),0);
              return (
                <>
                  <h2 style={{ fontSize:16, fontWeight:900, color:'#1a1a2e', marginBottom:8, paddingBottom:8, borderBottom:'2px solid #4f7ef8' }}>2. Statement of Assets and Liabilities (Balance Sheet)</h2>
                  <p style={{ fontSize:11, color:'#666', marginBottom:12 }}>As at 30th June — {yearLabel}</p>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, marginBottom:24 }}>
                    <thead>
                      <tr>
                        {['Note','Description','Current Year (KES)','Previous Year (KES)'].map(h=>(
                          <th key={h} style={{ background:'#f0f4ff', color:'#2a2a4a', fontWeight:700, padding:'9px 12px', textAlign:h.includes('Year')?'right':'left', border:'1px solid #d4ddf7', fontSize:11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[{label:'FINANCIAL ASSETS', items:assets, col:'#4f7ef8', totLabel:'Total Assets'},{label:'FINANCIAL LIABILITIES', items:liabs, col:'#dc2626', totLabel:'Total Liabilities'},{label:'NET ASSETS / EQUITY', items:equity, col:'#8b5cf6', totLabel:'Net Assets'}].map(sec=>(
                        <>
                          <tr><td colSpan={4} style={{ background:'#f0f4ff', fontWeight:700, padding:'8px 12px', color:sec.col, fontSize:11, textTransform:'uppercase' }}>{sec.label}</td></tr>
                          {sec.items.map((r:any,i:number)=>(
                            <tr key={i} style={{ background:i%2===0?'#fff':'#fafbff' }}>
                              <td style={{ padding:'8px 12px', color:'#4f7ef8', fontWeight:600 }}>{r.note_ref||''}</td>
                              <td style={{ padding:'8px 12px', paddingLeft:24 }}>{r.description}</td>
                              <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:600 }}>{fmt(r.amount||0)}</td>
                              <td style={{ padding:'8px 12px', textAlign:'right', color:'#666' }}>{fmt(r.prev_amount||0)}</td>
                            </tr>
                          ))}
                          <tr style={{ background:'#e8f0ff', fontWeight:800 }}>
                            <td colSpan={2} style={{ padding:'9px 12px' }}>{sec.totLabel}</td>
                            <td style={{ padding:'9px 12px', textAlign:'right', color:sec.col }}>{fmt(sec.items.reduce((s:number,r:any)=>s+(r.amount||0),0))}</td>
                            <td style={{ padding:'9px 12px', textAlign:'right', color:'#666' }}>{fmt(sec.items.reduce((s:number,r:any)=>s+(r.prev_amount||0),0))}</td>
                          </tr>
                          <tr><td colSpan={4} style={{ height:8 }}></td></tr>
                        </>
                      ))}
                      <tr style={{ background:'linear-gradient(135deg,#e8f0ff,#ede8ff)', fontWeight:900, fontSize:14 }}>
                        <td colSpan={2} style={{ padding:'12px' }}>NET FINANCIAL ASSETS (Assets – Liabilities)</td>
                        <td style={{ padding:'12px', textAlign:'right', color:totA-totL>=0?'#059669':'#dc2626', fontSize:15 }}>{fmt(totA-totL)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </>
              );
            })()}

            {/* ── BUDGET ── */}
            {(showReport('budget')||showReport('full')) && (() => {
              const income = data.budget.filter(r=>r.section==='income');
              const expense= data.budget.filter(r=>r.section==='expense');
              return (
                <>
                  <h2 style={{ fontSize:16, fontWeight:900, color:'#1a1a2e', marginBottom:8, paddingBottom:8, borderBottom:'2px solid #4f7ef8' }}>3. Budget Analysis Report</h2>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, marginBottom:24 }}>
                    <thead>
                      <tr>
                        {['Description','Original Budget','Adjustments','Revised Budget','Actual','Variance'].map(h=>(
                          <th key={h} style={{ background:'#f0f4ff', color:'#2a2a4a', fontWeight:700, padding:'9px 12px', textAlign:h==='Description'?'left':'right', border:'1px solid #d4ddf7', fontSize:11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[{label:'INCOME', items:income, col:'#059669'},{label:'EXPENDITURE', items:expense, col:'#dc2626'}].map(sec=>(
                        <>
                          <tr><td colSpan={6} style={{ background:'#f0f4ff', fontWeight:700, padding:'8px 12px', color:sec.col, fontSize:11, textTransform:'uppercase' }}>{sec.label}</td></tr>
                          {sec.items.map((r:any,i:number)=>{
                            const rev = (r.original_budget||0)+(r.adjustments||0);
                            const var_ = (r.actual||0)-rev;
                            return (
                              <tr key={i} style={{ background:i%2===0?'#fff':'#fafbff' }}>
                                <td style={{ padding:'8px 12px' }}>{r.description}</td>
                                <td style={{ padding:'8px 12px', textAlign:'right' }}>{fmt(r.original_budget||0)}</td>
                                <td style={{ padding:'8px 12px', textAlign:'right' }}>{fmt(r.adjustments||0)}</td>
                                <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:600, color:'#4f7ef8' }}>{fmt(rev)}</td>
                                <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:600, color:sec.col }}>{fmt(r.actual||0)}</td>
                                <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, color:var_>=0?'#059669':'#dc2626' }}>{fmt(var_)}</td>
                              </tr>
                            );
                          })}
                        </>
                      ))}
                    </tbody>
                  </table>
                </>
              );
            })()}

            {/* ── NOTES ── */}
            {(showReport('notes')||showReport('full')) && data.notes.length > 0 && (() => {
              const grouped: Record<number,any[]> = {};
              for (const n of data.notes) {
                if (!grouped[n.note_number]) grouped[n.note_number] = [];
                grouped[n.note_number].push(n);
              }
              return (
                <>
                  <h2 style={{ fontSize:16, fontWeight:900, color:'#1a1a2e', marginBottom:8, paddingBottom:8, borderBottom:'2px solid #4f7ef8' }}>4. Notes to the Financial Statements</h2>
                  {Object.entries(grouped).map(([num, rows]) => (
                    <div key={num} style={{ marginBottom:18 }}>
                      <h3 style={{ fontSize:13, fontWeight:700, color:'#2a2a4a', padding:'5px 10px', background:'#f0f4ff', borderRadius:4, margin:'0 0 8px' }}>Note {num}</h3>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                        <thead>
                          <tr>
                            <th style={{ background:'#f8f9ff', padding:'7px 12px', textAlign:'left', border:'1px solid #e0e7ff', fontSize:11 }}>Description</th>
                            <th style={{ background:'#f8f9ff', padding:'7px 12px', textAlign:'right', border:'1px solid #e0e7ff', fontSize:11 }}>Current Year (KES)</th>
                            <th style={{ background:'#f8f9ff', padding:'7px 12px', textAlign:'right', border:'1px solid #e0e7ff', fontSize:11 }}>Previous Year (KES)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(rows as any[]).map((r:any,i:number)=>(
                            <tr key={i} style={{ background:i%2===0?'#fff':'#fafbff' }}>
                              <td style={{ padding:'7px 12px 7px 20px', borderBottom:'1px solid #e8ecf8' }}>{r.row_label}</td>
                              <td style={{ padding:'7px 12px', textAlign:'right', borderBottom:'1px solid #e8ecf8', fontWeight:600 }}>{fmt(r.current_amount||0)}</td>
                              <td style={{ padding:'7px 12px', textAlign:'right', borderBottom:'1px solid #e8ecf8', color:'#666' }}>{fmt(r.previous_amount||0)}</td>
                            </tr>
                          ))}
                          <tr style={{ background:'#e8f0ff', fontWeight:800 }}>
                            <td style={{ padding:'8px 12px' }}>Total – Note {num}</td>
                            <td style={{ padding:'8px 12px', textAlign:'right', color:'#4f7ef8' }}>{fmt((rows as any[]).reduce((s:number,r:any)=>s+(r.current_amount||0),0))}</td>
                            <td style={{ padding:'8px 12px', textAlign:'right', color:'#666' }}>{fmt((rows as any[]).reduce((s:number,r:any)=>s+(r.previous_amount||0),0))}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                </>
              );
            })()}

            {/* Signatures */}
            <div style={{ marginTop:48, borderTop:'2px solid #e0e7ff', paddingTop:24 }}>
              <div style={{ fontWeight:800, fontSize:13, color:'#1a1a2e', marginBottom:24 }}>Declaration and Signatures</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:32 }}>
                {[
                  { role:'Principal', name:data.school?.principal_name },
                  { role:'BOM Chairperson', name:data.school?.bom_chairperson },
                  { role:'Auditor/Treasurer', name:'_____________________' },
                ].map(s=>(
                  <div key={s.role}>
                    <div style={{ borderTop:'1px solid #333', paddingTop:8, marginTop:48 }}>
                      <div style={{ fontWeight:700, fontSize:12 }}>{s.name||'___________________'}</div>
                      <div style={{ fontSize:11, color:'#666', marginTop:2 }}>{s.role}</div>
                      <div style={{ fontSize:11, color:'#999', marginTop:2 }}>Date: _______________</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:24, padding:'12px 16px', background:'#f0f4ff', borderRadius:8, fontSize:11, color:'#666' }}>
                These financial statements were prepared in accordance with the Public Finance Management Act, 2012 and the Kenya Education Sector financial reporting standards.
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
