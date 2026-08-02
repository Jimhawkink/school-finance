'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '../layout';
import toast from 'react-hot-toast';

type Row = { id?:string; category:'receipt'|'payment'; vote_head:string; description:string; amount:number; prev_amount:number; note_ref?:number; sort_order:number; };

const RECEIPT_ROWS: Omit<Row,'id'>[] = [
  { category:'receipt', vote_head:'tuition',        description:'Government grants for tuition',                    amount:0, prev_amount:0, note_ref:1, sort_order:1 },
  { category:'receipt', vote_head:'operations',     description:'Government grants for operations',                 amount:0, prev_amount:0, note_ref:2, sort_order:2 },
  { category:'receipt', vote_head:'infrastructure', description:'Government grants for infrastructure',             amount:0, prev_amount:0, note_ref:3, sort_order:3 },
  { category:'receipt', vote_head:'school_fund',    description:'School fund income – parents contributions/ fees', amount:0, prev_amount:0, note_ref:4, sort_order:4 },
  { category:'receipt', vote_head:'misc',           description:'Miscellaneous incomes',                            amount:0, prev_amount:0, note_ref:5, sort_order:5 },
];
const PAYMENT_ROWS: Omit<Row,'id'>[] = [
  { category:'payment', vote_head:'tuition',        description:'Tuition',                  amount:0, prev_amount:0, note_ref:6, sort_order:1 },
  { category:'payment', vote_head:'operations',     description:'Operations',               amount:0, prev_amount:0, note_ref:7, sort_order:2 },
  { category:'payment', vote_head:'infrastructure', description:'Infrastructure',           amount:0, prev_amount:0, note_ref:8, sort_order:3 },
  { category:'payment', vote_head:'boarding',       description:'Boarding and school fund', amount:0, prev_amount:0, note_ref:9, sort_order:4 },
];

const inputStyle = {background:'#eff6ff',border:'2px solid #93c5fd',borderRadius:8,color:'#0f172a',padding:'6px 10px',width:'100%',fontFamily:'inherit',fontSize:14};
const tdBox = {padding:'8px',border:'2px dotted #93c5fd',borderRadius:8};
const fmt=(n:number)=>n===0?'-':n<0?`(${Math.abs(n).toLocaleString('en-KE',{minimumFractionDigits:2})})`:n.toLocaleString('en-KE',{minimumFractionDigits:2});

// ✅ OUTSIDE parent component — prevents focus loss on each keystroke
function ISRow({ row, globalIdx, onUpdate }: { row:Row; globalIdx:number; onUpdate:(idx:number,f:'amount'|'prev_amount',v:string)=>void }) {
  return (
    <tr onMouseEnter={e=>(e.currentTarget.style.background='#f5f8ff')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
      <td style={{color:'#475569',fontSize:12,padding:'10px 16px'}}>{row.note_ref}</td>
      <td style={{color:'#0f172a',padding:'10px 16px'}}>{row.description}</td>
      <td style={tdBox}>
        <input style={inputStyle} type="number" step="0.01" value={row.amount||''} placeholder="0.00"
          onChange={e=>onUpdate(globalIdx,'amount',e.target.value)} />
      </td>
      <td style={{textAlign:'right',color:'#2563eb',fontWeight:600,padding:'10px 16px'}}>{fmt(row.amount)}</td>
      <td style={{textAlign:'right',color:'#475569',padding:'10px 16px'}}>{fmt(row.prev_amount)}</td>
    </tr>
  );
}

export default function IncomeStatementPage() {
  const { schoolId, yearId, yearLabel } = useApp();
  const [rows, setRows] = useState<Row[]>([...RECEIPT_ROWS,...PAYMENT_ROWS]);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ if(yearId) loadData(); },[yearId]);

  async function loadData(){
    const { data } = await supabase.from('finance_income_statement').select('*').eq('year_id',yearId).order('sort_order');
    if(data && data.length>0){
      const merged = [...RECEIPT_ROWS,...PAYMENT_ROWS].map(r=>{
        const found = data.find((d:any)=>d.vote_head===r.vote_head && d.category===r.category);
        return found ? { ...r, id:found.id, amount:found.amount||0, prev_amount:found.prev_amount||0 } : r;
      });
      setRows(merged);
    }
  }

  const update = (idx:number, field:'amount'|'prev_amount', val:string) => {
    const n = parseFloat(val.replace(/,/g,''))||0;
    setRows(prev=>prev.map((r,i)=>i===idx?{...r,[field]:n}:r));
  };

  async function save(){
    if(!schoolId||!yearId){ toast.error('Please setup school and financial year first'); return; }
    setSaving(true);
    const t = toast.loading('Saving income statement…');
    try {
      for(const row of rows){
        const payload = { school_id:schoolId, year_id:yearId, category:row.category, vote_head:row.vote_head, description:row.description, amount:row.amount, prev_amount:row.prev_amount, note_ref:row.note_ref||null, sort_order:row.sort_order, updated_at:new Date().toISOString() };
        if(row.id){ await supabase.from('finance_income_statement').update(payload).eq('id',row.id); }
        else { const {data} = await supabase.from('finance_income_statement').insert(payload).select().single(); if(data) setRows(p=>p.map(r=>r.vote_head===row.vote_head&&r.category===row.category?{...r,id:data.id}:r)); }
      }
      toast.success('Income statement saved!',{id:t});
    } catch(e:any){ toast.error(e.message,{id:t}); }
    setSaving(false);
  }

  const receipts = rows.filter(r=>r.category==='receipt');
  const payments = rows.filter(r=>r.category==='payment');
  const totRecCur  = receipts.reduce((s,r)=>s+r.amount,0);
  const totRecPrev = receipts.reduce((s,r)=>s+r.prev_amount,0);
  const totPayCur  = payments.reduce((s,r)=>s+r.amount,0);
  const totPayPrev = payments.reduce((s,r)=>s+r.prev_amount,0);
  const surplusCur = totRecCur-totPayCur;
  const surplusPrev= totRecPrev-totPayPrev;

  return (
    <div className="page-body" style={{background:'#f0f5ff',minHeight:'100vh',padding:24}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'#0f172a'}}>📝 Income Statement</h1>
          <p style={{color:'#475569',fontSize:13,marginTop:4}}>Receipts and Payments Account — FY {yearLabel}</p>
        </div>
        <button className="btn-success" onClick={save} disabled={saving}>{saving?'Saving…':'💾 Save All'}</button>
      </div>
      <div style={{background:'#eff6ff',border:'1px solid #93c5fd',borderRadius:8,padding:'12px 16px',marginBottom:24,color:'#0f172a',display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:20}}>💡</span>
        <span><strong>How to use:</strong> Click on any blue input cell to enter figures. Press Tab to move to next. Click Save when done.</span>
      </div>
      <div style={{background:'#fff',border:'1px solid #dde6f5',borderRadius:16,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table className="data-grid" style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#f1f5fd',color:'#475569',textAlign:'left'}}>
                <th style={{width:50,padding:'12px 16px'}}>Note</th>
                <th style={{padding:'12px 16px'}}>Description</th>
                <th style={{width:200,textAlign:'right',padding:'12px 16px',color:'#0f172a',fontWeight:700}}>✏️ Enter Amount (KES)</th>
                <th style={{width:170,textAlign:'right',padding:'12px 16px'}}>Current Year (KES)</th>
                <th style={{width:170,textAlign:'right',padding:'12px 16px'}}>Previous Year (KES)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{background:'#eef2ff'}}><td colSpan={5} style={{fontWeight:700,padding:'8px 16px',color:'#059669'}}>📥 RECEIPTS</td></tr>
              {receipts.map(row=>(
                <ISRow key={row.vote_head} row={row} globalIdx={rows.indexOf(row)} onUpdate={update} />
              ))}
              <tr style={{background:'#f0f5ff'}}>
                <td style={{padding:'12px 16px'}}></td>
                <td style={{fontWeight:800,color:'#0f172a',padding:'12px 16px'}}>Total Receipts</td>
                <td style={{padding:'12px 16px'}}></td>
                <td style={{textAlign:'right',color:'#059669',fontWeight:800,fontSize:14,padding:'12px 16px'}}>{fmt(totRecCur)}</td>
                <td style={{textAlign:'right',color:'#475569',fontWeight:700,padding:'12px 16px'}}>{fmt(totRecPrev)}</td>
              </tr>
              <tr style={{background:'#eef2ff'}}><td colSpan={5} style={{fontWeight:700,padding:'8px 16px',color:'#dc2626'}}>📤 PAYMENTS</td></tr>
              {payments.map(row=>(
                <ISRow key={row.vote_head} row={row} globalIdx={rows.indexOf(row)} onUpdate={update} />
              ))}
              <tr style={{background:'#f0f5ff'}}>
                <td style={{padding:'12px 16px'}}></td>
                <td style={{fontWeight:800,color:'#0f172a',padding:'12px 16px'}}>Total Payments</td>
                <td style={{padding:'12px 16px'}}></td>
                <td style={{textAlign:'right',color:'#dc2626',fontWeight:800,fontSize:14,padding:'12px 16px'}}>{fmt(totPayCur)}</td>
                <td style={{textAlign:'right',color:'#475569',fontWeight:700,padding:'12px 16px'}}>{fmt(totPayPrev)}</td>
              </tr>
              <tr style={{background:'linear-gradient(135deg,rgba(37,99,235,0.08),rgba(124,58,237,0.05))'}}>
                <td style={{padding:'16px'}}></td>
                <td style={{fontWeight:800,fontSize:14,color:'#0f172a',padding:'16px'}}>Surplus / (Deficit) for the Year</td>
                <td style={{padding:'16px'}}></td>
                <td style={{textAlign:'right',color:surplusCur>=0?'#059669':'#dc2626',fontWeight:800,fontSize:16,padding:'16px'}}>{fmt(surplusCur)}</td>
                <td style={{textAlign:'right',color:surplusPrev>=0?'#059669':'#dc2626',fontWeight:700,padding:'16px'}}>{fmt(surplusPrev)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
