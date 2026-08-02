'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '../layout';
import toast from 'react-hot-toast';

type BRow = { id?:string; section:string; vote_head:string; description:string; original_budget:number; adjustments:number; actual:number; sort_order:number; };

const INCOME_ROWS: Omit<BRow,'id'>[] = [
  { section:'income', vote_head:'tuition',        description:'Government grants – Tuition',         original_budget:0, adjustments:0, actual:0, sort_order:1 },
  { section:'income', vote_head:'operations',     description:'Government grants – Operations',      original_budget:0, adjustments:0, actual:0, sort_order:2 },
  { section:'income', vote_head:'infrastructure', description:'Government grants – Infrastructure',  original_budget:0, adjustments:0, actual:0, sort_order:3 },
  { section:'income', vote_head:'school_fund',    description:'School fund – Parents contributions', original_budget:0, adjustments:0, actual:0, sort_order:4 },
  { section:'income', vote_head:'misc',           description:'Miscellaneous incomes',               original_budget:0, adjustments:0, actual:0, sort_order:5 },
];
const EXPENSE_ROWS: Omit<BRow,'id'>[] = [
  { section:'expense', vote_head:'tuition',        description:'Tuition expenditure',        original_budget:0, adjustments:0, actual:0, sort_order:1 },
  { section:'expense', vote_head:'operations',     description:'Operations expenditure',     original_budget:0, adjustments:0, actual:0, sort_order:2 },
  { section:'expense', vote_head:'infrastructure', description:'Infrastructure expenditure', original_budget:0, adjustments:0, actual:0, sort_order:3 },
  { section:'expense', vote_head:'boarding',       description:'Boarding / school fund',     original_budget:0, adjustments:0, actual:0, sort_order:4 },
];

const inputStyle = {background:'#eff6ff',border:'2px solid #93c5fd',borderRadius:8,color:'#0f172a',padding:'6px 10px',width:'100%',fontFamily:'inherit',fontSize:13};
const tdBox = {padding:'6px',border:'2px dotted #93c5fd',borderRadius:8};
const fmt=(n:number)=>n===0?'-':n<0?`(${Math.abs(n).toLocaleString('en-KE',{minimumFractionDigits:2})})`:n.toLocaleString('en-KE',{minimumFractionDigits:2});
const utilPct=(actual:number,budget:number)=>budget===0?0:Math.min(100,Math.round((actual/budget)*100));

// ✅ OUTSIDE — fixes cursor jumping on every keystroke
function BudgetRow({row,idx,onUpdate}:{row:BRow;idx:number;onUpdate:(i:number,f:'original_budget'|'adjustments'|'actual',v:string)=>void}) {
  const revised = row.original_budget + row.adjustments;
  const variance = row.actual - revised;
  const pct = utilPct(row.actual, revised);
  return (
    <tr onMouseEnter={e=>(e.currentTarget.style.background='#f5f8ff')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
      <td style={{paddingLeft:20,color:'#0f172a',padding:'10px 16px'}}>{row.description}</td>
      <td style={{...tdBox,width:140}}>
        <input style={inputStyle} type="number" step="0.01" value={row.original_budget||''} placeholder="0.00" onChange={e=>onUpdate(idx,'original_budget',e.target.value)} />
      </td>
      <td style={{...tdBox,width:140}}>
        <input style={inputStyle} type="number" step="0.01" value={row.adjustments||''} placeholder="0.00" onChange={e=>onUpdate(idx,'adjustments',e.target.value)} />
      </td>
      <td style={{textAlign:'right',color:'#2563eb',fontWeight:600,padding:'10px 16px'}}>{fmt(revised)}</td>
      <td style={{...tdBox,width:140}}>
        <input style={inputStyle} type="number" step="0.01" value={row.actual||''} placeholder="0.00" onChange={e=>onUpdate(idx,'actual',e.target.value)} />
      </td>
      <td style={{textAlign:'right',color:variance>=0?'#059669':'#dc2626',fontWeight:600,padding:'10px 16px'}}>{fmt(variance)}</td>
      <td style={{width:120,padding:'10px 16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{flex:1,height:6,background:'#e2e8f0',borderRadius:3,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${pct}%`,background:pct>100?'#dc2626':pct>80?'#f59e0b':'#059669',borderRadius:3}} />
          </div>
          <span style={{fontSize:11,color:'#475569',minWidth:32}}>{pct}%</span>
        </div>
      </td>
    </tr>
  );
}

export default function BudgetPage() {
  const { schoolId, yearId, yearLabel } = useApp();
  const [rows, setRows]   = useState<BRow[]>([...INCOME_ROWS,...EXPENSE_ROWS]);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ if(yearId) load(); },[yearId]);

  async function load() {
    const { data } = await supabase.from('finance_budget').select('*').eq('year_id',yearId).order('sort_order');
    if(data && data.length>0) {
      const all = [...INCOME_ROWS,...EXPENSE_ROWS];
      const merged = all.map(t=>{
        const found = data.find((d:any)=>d.vote_head===t.vote_head && d.section===t.section);
        return found ? {...t,id:found.id,original_budget:found.original_budget||0,adjustments:found.adjustments||0,actual:found.actual||0} : t;
      });
      setRows(merged);
    }
  }

  const upd=(idx:number,f:'original_budget'|'adjustments'|'actual',v:string)=>{
    const n=parseFloat(v.replace(/,/g,''))||0;
    setRows(p=>p.map((r,i)=>i===idx?{...r,[f]:n}:r));
  };

  async function save() {
    if(!schoolId||!yearId){ toast.error('Setup school first'); return; }
    setSaving(true);
    const t=toast.loading('Saving budget…');
    try {
      for(const row of rows){
        const payload={school_id:schoolId,year_id:yearId,section:row.section,vote_head:row.vote_head,description:row.description,original_budget:row.original_budget,adjustments:row.adjustments,actual:row.actual,sort_order:row.sort_order,updated_at:new Date().toISOString()};
        if(row.id) await supabase.from('finance_budget').update(payload).eq('id',row.id);
        else { const{data}=await supabase.from('finance_budget').insert(payload).select().single(); if(data) setRows(p=>p.map(r=>r.vote_head===row.vote_head&&r.section===row.section?{...r,id:data.id}:r)); }
      }
      toast.success('Budget saved!',{id:t});
    } catch(e:any){toast.error(e.message,{id:t});}
    setSaving(false);
  }

  const income  = rows.filter(r=>r.section==='income');
  const expense = rows.filter(r=>r.section==='expense');
  const totIncOrig=income.reduce((s,r)=>s+r.original_budget,0);
  const totIncAdj =income.reduce((s,r)=>s+r.adjustments,0);
  const totIncAct =income.reduce((s,r)=>s+r.actual,0);
  const totExpOrig=expense.reduce((s,r)=>s+r.original_budget,0);
  const totExpAdj =expense.reduce((s,r)=>s+r.adjustments,0);
  const totExpAct =expense.reduce((s,r)=>s+r.actual,0);
  const netOriginal=(totIncOrig+totIncAdj)-(totExpOrig+totExpAdj);
  const netActual=totIncAct-totExpAct;

  return (
    <div className="page-body" style={{background:'#f0f5ff',minHeight:'100vh',padding:24}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a'}}>🎯 Budget Analysis</h1>
          <p style={{color:'#475569',fontSize:13,marginTop:4}}>Budget vs Actual Performance — FY {yearLabel}</p>
        </div>
        <button className="btn-success" onClick={save} disabled={saving}>{saving?'Saving…':'💾 Save All'}</button>
      </div>
      <div style={{background:'#eff6ff',border:'1px solid #93c5fd',borderRadius:8,padding:'12px 16px',marginBottom:24,color:'#0f172a',display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:20}}>💡</span>
        <span><strong>How to use:</strong> Click on any blue input cell to enter your figures. Press Tab to move to next. Click Save when done.</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
        <div className="kpi-card blue"><div className="kpi-label">Revised Budget</div><div className="kpi-value" style={{fontSize:17}}>KES {fmt(netOriginal)}</div></div>
        <div className="kpi-card green"><div className="kpi-label">Actual Surplus</div><div className="kpi-value" style={{fontSize:17,color:netActual>=0?'#059669':'#dc2626'}}>KES {fmt(netActual)}</div></div>
        <div className="kpi-card purple"><div className="kpi-label">Income Utilisation</div><div className="kpi-value" style={{fontSize:17}}>{utilPct(totIncAct,totIncOrig+totIncAdj)}%</div></div>
        <div className="kpi-card gold"><div className="kpi-label">Expense Utilisation</div><div className="kpi-value" style={{fontSize:17}}>{utilPct(totExpAct,totExpOrig+totExpAdj)}%</div></div>
      </div>
      <div style={{background:'#fff',border:'1px solid #dde6f5',borderRadius:16,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table className="data-grid" style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#f1f5fd',color:'#475569',textAlign:'left'}}>
                <th style={{padding:'12px 16px'}}>Description</th>
                <th style={{width:140,textAlign:'right',padding:'12px 16px',color:'#0f172a',fontWeight:700}}>Original Budget ✏️</th>
                <th style={{width:140,textAlign:'right',padding:'12px 16px',color:'#0f172a',fontWeight:700}}>Adjustments ✏️</th>
                <th style={{width:140,textAlign:'right',padding:'12px 16px'}}>Revised Budget</th>
                <th style={{width:140,textAlign:'right',padding:'12px 16px',color:'#0f172a',fontWeight:700}}>Actual ✏️</th>
                <th style={{width:120,textAlign:'right',padding:'12px 16px'}}>Variance</th>
                <th style={{width:120,padding:'12px 16px'}}>Utilisation</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{background:'#eef2ff'}}><td colSpan={7} style={{color:'#059669',fontWeight:700,padding:'8px 16px'}}>📥 INCOME</td></tr>
              {income.map(row=><BudgetRow key={row.vote_head} row={row} idx={rows.indexOf(row)} onUpdate={upd} />)}
              <tr style={{background:'#f0f5ff'}}>
                <td style={{fontWeight:800,color:'#0f172a',padding:'12px 16px'}}>Total Income</td>
                <td style={{textAlign:'right',color:'#475569',padding:'12px 16px'}}>{fmt(totIncOrig)}</td>
                <td style={{textAlign:'right',color:'#475569',padding:'12px 16px'}}>{fmt(totIncAdj)}</td>
                <td style={{textAlign:'right',color:'#2563eb',fontWeight:800,padding:'12px 16px'}}>{fmt(totIncOrig+totIncAdj)}</td>
                <td style={{textAlign:'right',color:'#059669',fontWeight:800,padding:'12px 16px'}}>{fmt(totIncAct)}</td>
                <td style={{textAlign:'right',color:totIncAct-(totIncOrig+totIncAdj)>=0?'#059669':'#dc2626',fontWeight:800,padding:'12px 16px'}}>{fmt(totIncAct-(totIncOrig+totIncAdj))}</td>
                <td style={{padding:'12px 16px'}}></td>
              </tr>
              <tr style={{background:'#eef2ff'}}><td colSpan={7} style={{color:'#dc2626',fontWeight:700,padding:'8px 16px'}}>📤 EXPENDITURE</td></tr>
              {expense.map(row=><BudgetRow key={row.vote_head} row={row} idx={rows.indexOf(row)} onUpdate={upd} />)}
              <tr style={{background:'#f0f5ff'}}>
                <td style={{fontWeight:800,color:'#0f172a',padding:'12px 16px'}}>Total Expenditure</td>
                <td style={{textAlign:'right',color:'#475569',padding:'12px 16px'}}>{fmt(totExpOrig)}</td>
                <td style={{textAlign:'right',color:'#475569',padding:'12px 16px'}}>{fmt(totExpAdj)}</td>
                <td style={{textAlign:'right',color:'#2563eb',fontWeight:800,padding:'12px 16px'}}>{fmt(totExpOrig+totExpAdj)}</td>
                <td style={{textAlign:'right',color:'#dc2626',fontWeight:800,padding:'12px 16px'}}>{fmt(totExpAct)}</td>
                <td style={{textAlign:'right',color:totExpAct-(totExpOrig+totExpAdj)<=0?'#059669':'#dc2626',fontWeight:800,padding:'12px 16px'}}>{fmt(totExpAct-(totExpOrig+totExpAdj))}</td>
                <td style={{padding:'12px 16px'}}></td>
              </tr>
              <tr style={{background:'linear-gradient(135deg,rgba(37,99,235,0.08),rgba(124,58,237,0.05))'}}>
                <td style={{fontWeight:800,fontSize:14,color:'#0f172a',padding:'16px'}}>NET SURPLUS / (DEFICIT)</td>
                <td style={{padding:'16px'}}></td><td style={{padding:'16px'}}></td>
                <td style={{textAlign:'right',color:'#2563eb',fontWeight:800,fontSize:15,padding:'16px'}}>{fmt(netOriginal)}</td>
                <td style={{textAlign:'right',color:netActual>=0?'#059669':'#dc2626',fontWeight:800,fontSize:15,padding:'16px'}}>{fmt(netActual)}</td>
                <td style={{textAlign:'right',color:netActual-netOriginal>=0?'#059669':'#dc2626',fontWeight:800,padding:'16px'}}>{fmt(netActual-netOriginal)}</td>
                <td style={{padding:'16px'}}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
