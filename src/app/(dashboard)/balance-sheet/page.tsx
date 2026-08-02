'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '../layout';
import toast from 'react-hot-toast';

type BSRow = { id?:string; section:string; sub_section:string; description:string; amount:number; prev_amount:number; note_ref?:number; sort_order:number; };

const TEMPLATE: BSRow[] = [
  // Financial Assets
  { section:'asset', sub_section:'cash', description:'Bank balances',               amount:0, prev_amount:0, note_ref:10, sort_order:1 },
  { section:'asset', sub_section:'cash', description:'Cash balances',               amount:0, prev_amount:0, note_ref:11, sort_order:2 },
  { section:'asset', sub_section:'cash', description:'Short term investments',      amount:0, prev_amount:0, note_ref:12, sort_order:3 },
  { section:'asset', sub_section:'receivable', description:'Account\'s receivables',amount:0, prev_amount:0, note_ref:13, sort_order:5 },
  // Liabilities
  { section:'liability', sub_section:'payable', description:'Accounts payables',    amount:0, prev_amount:0, note_ref:14, sort_order:1 },
  // Equity
  { section:'equity', sub_section:'fund', description:'Accumulated fund b/fwd',     amount:0, prev_amount:0, note_ref:15, sort_order:1 },
  { section:'equity', sub_section:'fund', description:'Surplus/(deficit) for the year', amount:0, prev_amount:0, sort_order:2 },
];

export default function BalanceSheetPage() {
  const { schoolId, yearId, yearLabel } = useApp();
  const [rows, setRows] = useState<BSRow[]>(TEMPLATE);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ if(yearId) load(); },[yearId]);

  async function load(){
    const { data } = await supabase.from('finance_balance_sheet').select('*').eq('year_id',yearId).order('sort_order');
    if(data && data.length>0){
      const merged = TEMPLATE.map(t=>{
        const found = data.find((d:any)=>d.description===t.description && d.section===t.section);
        return found ? {...t, id:found.id, amount:found.amount||0, prev_amount:found.prev_amount||0} : t;
      });
      setRows(merged);
    }
  }

  const upd=(idx:number,f:'amount'|'prev_amount',v:string)=>{
    const n=parseFloat(v.replace(/,/g,''))||0;
    setRows(p=>p.map((r,i)=>i===idx?{...r,[f]:n}:r));
  };

  async function save(){
    if(!schoolId||!yearId){ toast.error('Setup school first'); return; }
    setSaving(true);
    const t=toast.loading('Saving balance sheet…');
    try{
      for(const row of rows){
        const payload={school_id:schoolId,year_id:yearId,section:row.section,sub_section:row.sub_section,description:row.description,amount:row.amount,prev_amount:row.prev_amount,note_ref:row.note_ref||null,sort_order:row.sort_order,updated_at:new Date().toISOString()};
        if(row.id) await supabase.from('finance_balance_sheet').update(payload).eq('id',row.id);
        else { const {data} = await supabase.from('finance_balance_sheet').insert(payload).select().single(); if(data) setRows(p=>p.map(r=>r.description===row.description&&r.section===row.section?{...r,id:data.id}:r)); }
      }
      toast.success('Balance sheet saved!',{id:t});
    }catch(e:any){toast.error(e.message,{id:t});}
    setSaving(false);
  }

  const assets   = rows.filter(r=>r.section==='asset');
  const liabs    = rows.filter(r=>r.section==='liability');
  const equity   = rows.filter(r=>r.section==='equity');
  const cashRows = assets.filter(r=>r.sub_section==='cash');
  const recvRows = assets.filter(r=>r.sub_section==='receivable');
  const totalCash  = cashRows.reduce((s,r)=>s+r.amount,0);
  const totalRecv  = recvRows.reduce((s,r)=>s+r.amount,0);
  const totalAssets= totalCash+totalRecv;
  const totalLiab  = liabs.reduce((s,r)=>s+r.amount,0);
  const netFinancial = totalAssets - totalLiab;
  const totalEquity  = equity.reduce((s,r)=>s+r.amount,0);

  const prevCash  = cashRows.reduce((s,r)=>s+r.prev_amount,0);
  const prevRecv  = recvRows.reduce((s,r)=>s+r.prev_amount,0);
  const prevAssets= prevCash+prevRecv;
  const prevLiab  = liabs.reduce((s,r)=>s+r.prev_amount,0);
  const prevNet   = prevAssets-prevLiab;
  const prevEquity= equity.reduce((s,r)=>s+r.prev_amount,0);

  const fmt=(n:number,red=false)=>{
    if(n===0) return '-';
    const abs=Math.abs(n).toLocaleString('en-KE',{minimumFractionDigits:2});
    return n<0?`(${abs})`:abs;
  };
  const col=(n:number)=>n<0?'#ef4444':n===0?'#7a90b8':'#e8edf8';

  const EntryRow=({row,idx}:{row:BSRow,idx:number})=>(
    <tr key={row.description}>
      <td style={{color:'#7a90b8',fontSize:12}}>{row.note_ref}</td>
      <td style={{paddingLeft:24}}>{row.description}</td>
      <td style={{textAlign:'right'}}>
        <input className="cell-input" type="number" step="0.01" value={row.amount||''} placeholder="0.00" onChange={e=>upd(idx,'amount',e.target.value)} />
      </td>
      <td style={{textAlign:'right',color:col(row.amount),fontWeight:600}}>{fmt(row.amount)}</td>
      <td style={{textAlign:'right',color:'#7a90b8'}}>{fmt(row.prev_amount)}</td>
    </tr>
  );

  const TotalRow=({label,cur,prev,big=false}:{label:string,cur:number,prev:number,big?:boolean})=>(
    <tr className="row-total">
      <td></td>
      <td style={{fontWeight:big?800:700,fontSize:big?14:13}}>{label}</td>
      <td></td>
      <td style={{textAlign:'right',color:cur<0?'#ef4444':cur>0?'#10b981':'#7a90b8',fontWeight:800,fontSize:big?15:13}}>{fmt(cur)}</td>
      <td style={{textAlign:'right',color:'#7a90b8',fontWeight:700}}>{fmt(prev)}</td>
    </tr>
  );

  return (
    <div className="page-body">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'#e8edf8'}}>⚖️ Statement of Assets & Liabilities</h1>
          <p style={{color:'#7a90b8',fontSize:13,marginTop:4}}>Balance Sheet — As At 30th June — FY {yearLabel}</p>
        </div>
        <button className="btn-success" onClick={save} disabled={saving}>{saving?'Saving…':'💾 Save All'}</button>
      </div>

      <div style={{background:'#0d1526',border:'1px solid #1e2d4a',borderRadius:16,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table className="data-grid">
            <thead>
              <tr>
                <th style={{width:50}}>Note</th>
                <th>Description</th>
                <th style={{width:180,textAlign:'right'}}>Enter Amount</th>
                <th style={{width:160,textAlign:'right'}}>Current Year (KES)</th>
                <th style={{width:160,textAlign:'right'}}>Previous Year (KES)</th>
              </tr>
            </thead>
            <tbody>
              {/* Financial Assets */}
              <tr className="row-section"><td colSpan={5} style={{color:'#4f7ef8',fontWeight:700}}>🏦 FINANCIAL ASSETS</td></tr>
              <tr className="row-section"><td colSpan={5} style={{paddingLeft:20,fontSize:11}}>Cash and Cash Equivalents</td></tr>
              {cashRows.map((r,i)=><EntryRow key={r.description} row={r} idx={rows.indexOf(r)} />)}
              <TotalRow label="Total Cash and Cash Equivalent" cur={totalCash} prev={prevCash} />

              <tr style={{height:8}}><td colSpan={5}></td></tr>
              {recvRows.map((r,i)=><EntryRow key={r.description} row={r} idx={rows.indexOf(r)} />)}
              <TotalRow label="Total Financial Assets (a)" cur={totalAssets} prev={prevAssets} big />

              <tr style={{height:12}}><td colSpan={5}></td></tr>

              {/* Liabilities */}
              <tr className="row-section"><td colSpan={5} style={{color:'#ef4444',fontWeight:700}}>📉 FINANCIAL LIABILITIES</td></tr>
              {liabs.map((r,i)=><EntryRow key={r.description} row={r} idx={rows.indexOf(r)} />)}
              <TotalRow label="Total Financial Liabilities (b)" cur={totalLiab} prev={prevLiab} big />

              <tr style={{height:12}}><td colSpan={5}></td></tr>

              {/* Net */}
              <tr style={{background:'linear-gradient(135deg,rgba(79,126,248,0.12),rgba(139,92,246,0.08))'}}>
                <td></td>
                <td style={{fontWeight:800,fontSize:14}}>Net Financial Assets (a – b)</td>
                <td></td>
                <td style={{textAlign:'right',color:netFinancial>=0?'#10b981':'#ef4444',fontWeight:800,fontSize:16}}>{fmt(netFinancial)}</td>
                <td style={{textAlign:'right',color:prevNet>=0?'#10b981':'#ef4444',fontWeight:700}}>{fmt(prevNet)}</td>
              </tr>

              <tr style={{height:12}}><td colSpan={5}></td></tr>

              {/* Equity */}
              <tr className="row-section"><td colSpan={5} style={{color:'#8b5cf6',fontWeight:700}}>📊 NET ASSETS / EQUITY</td></tr>
              {equity.map(r=><EntryRow key={r.description} row={r} idx={rows.indexOf(r)} />)}
              <tr style={{background:'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(79,126,248,0.1))'}}>
                <td></td>
                <td style={{fontWeight:800,fontSize:14}}>Net Assets</td>
                <td></td>
                <td style={{textAlign:'right',color:'#8b5cf6',fontWeight:800,fontSize:16}}>{fmt(totalEquity)}</td>
                <td style={{textAlign:'right',color:'#7a90b8',fontWeight:700}}>{fmt(prevEquity)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation */}
      <div style={{marginTop:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{padding:'14px 18px',background:Math.abs(netFinancial-totalEquity)<1?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)',border:`1px solid ${Math.abs(netFinancial-totalEquity)<1?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`,borderRadius:10}}>
          <div style={{fontSize:11,color:'#7a90b8',fontWeight:600,textTransform:'uppercase',marginBottom:4}}>✔ Balance Check</div>
          <div style={{fontSize:13,color: Math.abs(netFinancial-totalEquity)<1?'#10b981':'#ef4444',fontWeight:700}}>
            {Math.abs(netFinancial-totalEquity)<1 ? '✅ Statement Balances!' : `⚠️ Difference: KES ${fmt(Math.abs(netFinancial-totalEquity))}`}
          </div>
        </div>
        <div style={{padding:'14px 18px',background:'rgba(79,126,248,0.06)',border:'1px solid rgba(79,126,248,0.15)',borderRadius:10}}>
          <div style={{fontSize:11,color:'#7a90b8',fontWeight:600,textTransform:'uppercase',marginBottom:4}}>Net Financial Position</div>
          <div style={{fontSize:16,color:netFinancial>=0?'#10b981':'#ef4444',fontWeight:800}}>KES {fmt(netFinancial)}</div>
        </div>
      </div>
    </div>
  );
}
