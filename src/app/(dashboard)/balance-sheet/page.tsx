'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '../layout';
import toast from 'react-hot-toast';

type BSRow = { id?:string; section:string; sub_section:string; description:string; amount:number; prev_amount:number; note_ref?:number; sort_order:number; };

const TEMPLATE: BSRow[] = [
  { section:'asset', sub_section:'cash', description:'Bank balances',                    amount:0, prev_amount:0, note_ref:10, sort_order:1 },
  { section:'asset', sub_section:'cash', description:'Cash balances',                    amount:0, prev_amount:0, note_ref:11, sort_order:2 },
  { section:'asset', sub_section:'cash', description:'Short term investments',           amount:0, prev_amount:0, note_ref:12, sort_order:3 },
  { section:'asset', sub_section:'receivable', description:"Account's receivables",      amount:0, prev_amount:0, note_ref:13, sort_order:5 },
  { section:'liability', sub_section:'payable', description:'Accounts payables',         amount:0, prev_amount:0, note_ref:14, sort_order:1 },
  { section:'equity', sub_section:'fund', description:'Accumulated fund b/fwd',          amount:0, prev_amount:0, note_ref:15, sort_order:1 },
  { section:'equity', sub_section:'fund', description:'Surplus/(deficit) for the year',  amount:0, prev_amount:0, sort_order:2 },
];

const inputStyle = {background:'#eff6ff',border:'2px solid #93c5fd',borderRadius:8,color:'#0f172a',padding:'6px 10px',width:'100%',fontFamily:'inherit',fontSize:14};
const tdBox = {padding:'8px',border:'2px dotted #93c5fd',borderRadius:8};
const fmt=(n:number)=>{ if(n===0) return '-'; const abs=Math.abs(n).toLocaleString('en-KE',{minimumFractionDigits:2}); return n<0?`(${abs})`:abs; };
const col=(n:number)=>n<0?'#dc2626':n===0?'#475569':'#0f172a';

// ✅ OUTSIDE — fixes cursor jumping on every keystroke
function EntryRow({row,idx,onUpdate}:{row:BSRow;idx:number;onUpdate:(i:number,f:'amount'|'prev_amount',v:string)=>void}) {
  return (
    <tr onMouseEnter={e=>(e.currentTarget.style.background='#f5f8ff')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
      <td style={{color:'#475569',fontSize:12,padding:'10px 16px'}}>{row.note_ref}</td>
      <td style={{paddingLeft:24,color:'#0f172a',padding:'10px 16px'}}>{row.description}</td>
      <td style={tdBox}>
        <input style={inputStyle} type="number" step="0.01" value={row.amount||''} placeholder="0.00" onChange={e=>onUpdate(idx,'amount',e.target.value)} />
      </td>
      <td style={{textAlign:'right',color:col(row.amount),fontWeight:600,padding:'10px 16px'}}>{fmt(row.amount)}</td>
      <td style={{textAlign:'right',color:'#475569',padding:'10px 16px'}}>{fmt(row.prev_amount)}</td>
    </tr>
  );
}

function TotalRow({label,cur,prev,big=false}:{label:string;cur:number;prev:number;big?:boolean}) {
  return (
    <tr style={{background:'#f0f5ff'}}>
      <td style={{padding:'12px 16px'}}></td>
      <td style={{fontWeight:big?800:700,fontSize:big?14:13,color:'#0f172a',padding:'12px 16px'}}>{label}</td>
      <td style={{padding:'12px 16px'}}></td>
      <td style={{textAlign:'right',color:cur<0?'#dc2626':cur>0?'#059669':'#475569',fontWeight:800,fontSize:big?15:13,padding:'12px 16px'}}>{fmt(cur)}</td>
      <td style={{textAlign:'right',color:'#475569',fontWeight:700,padding:'12px 16px'}}>{fmt(prev)}</td>
    </tr>
  );
}

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

  const assets    = rows.filter(r=>r.section==='asset');
  const liabs     = rows.filter(r=>r.section==='liability');
  const equity    = rows.filter(r=>r.section==='equity');
  const cashRows  = assets.filter(r=>r.sub_section==='cash');
  const recvRows  = assets.filter(r=>r.sub_section==='receivable');
  const totalCash   = cashRows.reduce((s,r)=>s+r.amount,0);
  const totalRecv   = recvRows.reduce((s,r)=>s+r.amount,0);
  const totalAssets = totalCash+totalRecv;
  const totalLiab   = liabs.reduce((s,r)=>s+r.amount,0);
  const netFinancial= totalAssets-totalLiab;
  const totalEquity = equity.reduce((s,r)=>s+r.amount,0);
  const prevCash    = cashRows.reduce((s,r)=>s+r.prev_amount,0);
  const prevRecv    = recvRows.reduce((s,r)=>s+r.prev_amount,0);
  const prevAssets  = prevCash+prevRecv;
  const prevLiab    = liabs.reduce((s,r)=>s+r.prev_amount,0);
  const prevNet     = prevAssets-prevLiab;
  const prevEquity  = equity.reduce((s,r)=>s+r.prev_amount,0);

  return (
    <div className="page-body" style={{background:'#f0f5ff',minHeight:'100vh',padding:24}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a'}}>⚖️ Statement of Assets & Liabilities</h1>
          <p style={{color:'#475569',fontSize:13,marginTop:4}}>Balance Sheet — As At 30th June — FY {yearLabel}</p>
        </div>
        <button className="btn-success" onClick={save} disabled={saving}>{saving?'Saving…':'💾 Save All'}</button>
      </div>
      <div style={{background:'#eff6ff',border:'1px solid #93c5fd',borderRadius:8,padding:'12px 16px',marginBottom:24,color:'#0f172a',display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:20}}>💡</span>
        <span><strong>How to use:</strong> Click any blue input cell to enter figures. Press Tab to move to next. Click Save when done.</span>
      </div>
      <div style={{background:'#fff',border:'1px solid #dde6f5',borderRadius:16,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table className="data-grid" style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#f1f5fd',color:'#475569',textAlign:'left'}}>
                <th style={{width:50,padding:'12px 16px'}}>Note</th>
                <th style={{padding:'12px 16px'}}>Description</th>
                <th style={{width:180,textAlign:'right',padding:'12px 16px',color:'#0f172a',fontWeight:700}}>✏️ Enter Amount</th>
                <th style={{width:160,textAlign:'right',padding:'12px 16px'}}>Current Year (KES)</th>
                <th style={{width:160,textAlign:'right',padding:'12px 16px'}}>Previous Year (KES)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{background:'#eef2ff'}}><td colSpan={5} style={{color:'#2563eb',fontWeight:700,padding:'8px 16px'}}>🏦 FINANCIAL ASSETS</td></tr>
              <tr style={{background:'#eef2ff'}}><td colSpan={5} style={{paddingLeft:20,fontSize:11,padding:'8px 16px',color:'#475569'}}>Cash and Cash Equivalents</td></tr>
              {cashRows.map(r=><EntryRow key={r.description} row={r} idx={rows.indexOf(r)} onUpdate={upd} />)}
              <TotalRow label="Total Cash and Cash Equivalent" cur={totalCash} prev={prevCash} />
              {recvRows.map(r=><EntryRow key={r.description} row={r} idx={rows.indexOf(r)} onUpdate={upd} />)}
              <TotalRow label="Total Financial Assets (a)" cur={totalAssets} prev={prevAssets} big />

              <tr style={{background:'#eef2ff'}}><td colSpan={5} style={{color:'#dc2626',fontWeight:700,padding:'8px 16px'}}>📉 FINANCIAL LIABILITIES</td></tr>
              {liabs.map(r=><EntryRow key={r.description} row={r} idx={rows.indexOf(r)} onUpdate={upd} />)}
              <TotalRow label="Total Financial Liabilities (b)" cur={totalLiab} prev={prevLiab} big />

              <tr style={{background:'linear-gradient(135deg,rgba(37,99,235,0.08),rgba(124,58,237,0.05))'}}>
                <td style={{padding:'16px'}}></td>
                <td style={{fontWeight:800,fontSize:14,color:'#0f172a',padding:'16px'}}>Net Financial Assets (a – b)</td>
                <td style={{padding:'16px'}}></td>
                <td style={{textAlign:'right',color:netFinancial>=0?'#059669':'#dc2626',fontWeight:800,fontSize:16,padding:'16px'}}>{fmt(netFinancial)}</td>
                <td style={{textAlign:'right',color:prevNet>=0?'#059669':'#dc2626',fontWeight:700,padding:'16px'}}>{fmt(prevNet)}</td>
              </tr>

              <tr style={{background:'#eef2ff'}}><td colSpan={5} style={{color:'#7c3aed',fontWeight:700,padding:'8px 16px'}}>📊 NET ASSETS / EQUITY</td></tr>
              {equity.map(r=><EntryRow key={r.description} row={r} idx={rows.indexOf(r)} onUpdate={upd} />)}
              <tr style={{background:'linear-gradient(135deg,rgba(124,58,237,0.06),rgba(37,99,235,0.04))'}}>
                <td style={{padding:'16px'}}></td>
                <td style={{fontWeight:800,fontSize:14,color:'#0f172a',padding:'16px'}}>Net Assets</td>
                <td style={{padding:'16px'}}></td>
                <td style={{textAlign:'right',color:'#7c3aed',fontWeight:800,fontSize:16,padding:'16px'}}>{fmt(totalEquity)}</td>
                <td style={{textAlign:'right',color:'#475569',fontWeight:700,padding:'16px'}}>{fmt(prevEquity)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div style={{marginTop:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{padding:'14px 18px',background:Math.abs(netFinancial-totalEquity)<1?'rgba(5,150,105,0.08)':'rgba(220,38,38,0.08)',border:`1px solid ${Math.abs(netFinancial-totalEquity)<1?'rgba(5,150,105,0.3)':'rgba(220,38,38,0.3)'}`,borderRadius:10}}>
          <div style={{fontSize:11,color:'#475569',fontWeight:600,textTransform:'uppercase',marginBottom:4}}>✔ Balance Check</div>
          <div style={{fontSize:13,color:Math.abs(netFinancial-totalEquity)<1?'#059669':'#dc2626',fontWeight:700}}>
            {Math.abs(netFinancial-totalEquity)<1?'✅ Statement Balances!':`⚠️ Difference: KES ${fmt(Math.abs(netFinancial-totalEquity))}`}
          </div>
        </div>
        <div style={{padding:'14px 18px',background:'rgba(37,99,235,0.06)',border:'1px solid rgba(37,99,235,0.15)',borderRadius:10}}>
          <div style={{fontSize:11,color:'#475569',fontWeight:600,textTransform:'uppercase',marginBottom:4}}>Net Financial Position</div>
          <div style={{fontSize:16,color:netFinancial>=0?'#059669':'#dc2626',fontWeight:800}}>KES {fmt(netFinancial)}</div>
        </div>
      </div>
    </div>
  );
}
