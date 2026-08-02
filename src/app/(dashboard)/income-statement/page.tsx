'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '../layout';
import toast from 'react-hot-toast';

type Row = { id?:string; category:'receipt'|'payment'; vote_head:string; description:string; amount:number; prev_amount:number; note_ref?:number; sort_order:number; };

const RECEIPT_ROWS: Omit<Row,'id'>[] = [
  { category:'receipt', vote_head:'tuition',         description:'Government grants for tuition',                    amount:0, prev_amount:0, note_ref:1, sort_order:1 },
  { category:'receipt', vote_head:'operations',      description:'Government grants for operations',                 amount:0, prev_amount:0, note_ref:2, sort_order:2 },
  { category:'receipt', vote_head:'infrastructure',  description:'Government grants for infrastructure',             amount:0, prev_amount:0, note_ref:3, sort_order:3 },
  { category:'receipt', vote_head:'school_fund',     description:'School fund income – parents contributions/ fees', amount:0, prev_amount:0, note_ref:4, sort_order:4 },
  { category:'receipt', vote_head:'misc',            description:'Miscellaneous incomes',                            amount:0, prev_amount:0, note_ref:5, sort_order:5 },
];
const PAYMENT_ROWS: Omit<Row,'id'>[] = [
  { category:'payment', vote_head:'tuition',         description:'Tuition',                  amount:0, prev_amount:0, note_ref:6, sort_order:1 },
  { category:'payment', vote_head:'operations',      description:'Operations',               amount:0, prev_amount:0, note_ref:7, sort_order:2 },
  { category:'payment', vote_head:'infrastructure',  description:'Infrastructure',           amount:0, prev_amount:0, note_ref:8, sort_order:3 },
  { category:'payment', vote_head:'boarding',        description:'Boarding and school fund', amount:0, prev_amount:0, note_ref:9, sort_order:4 },
];

export default function IncomeStatementPage() {
  const { schoolId, yearId, yearLabel } = useApp();
  const [rows, setRows] = useState<Row[]>([...RECEIPT_ROWS,...PAYMENT_ROWS]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(()=>{ if(yearId) loadData(); },[yearId]);

  async function loadData(){
    const { data } = await supabase.from('finance_income_statement').select('*').eq('year_id',yearId).order('sort_order');
    if(data && data.length>0){
      // merge DB values into template rows
      const merged = [...RECEIPT_ROWS,...PAYMENT_ROWS].map(r=>{
        const found = data.find((d:any)=>d.vote_head===r.vote_head && d.category===r.category);
        return found ? { ...r, id:found.id, amount:found.amount||0, prev_amount:found.prev_amount||0 } : r;
      });
      setRows(merged);
    }
    setLoaded(true);
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

  const fmt=(n:number)=>n===0?'-':n<0?`(${Math.abs(n).toLocaleString('en-KE',{minimumFractionDigits:2})})`:n.toLocaleString('en-KE',{minimumFractionDigits:2});

  const SectionRows = ({items, label}:{items:Row[], label:string}) => (
    <>
      <tr className="row-section"><td colSpan={5}>{label}</td></tr>
      {items.map((row,i)=>{
        const globalIdx = rows.indexOf(row);
        return (
          <tr key={row.vote_head}>
            <td style={{color:'#7a90b8',fontSize:12,paddingLeft:20}}>{row.note_ref}</td>
            <td>{row.description}</td>
            <td style={{textAlign:'right'}}>
              <input className="cell-input" type="number" step="0.01" value={row.amount||''} placeholder="0.00"
                onChange={e=>update(globalIdx,'amount',e.target.value)} />
            </td>
            <td style={{textAlign:'right', color:'#4f7ef8', fontWeight:600}}>{fmt(row.amount)}</td>
            <td style={{textAlign:'right', color:'#7a90b8'}}>{fmt(row.prev_amount)}</td>
          </tr>
        );
      })}
    </>
  );

  return (
    <div className="page-body">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'#e8edf8'}}>📝 Income Statement</h1>
          <p style={{color:'#7a90b8',fontSize:13,marginTop:4}}>Receipts and Payments Account — FY {yearLabel}</p>
        </div>
        <button className="btn-success" onClick={save} disabled={saving}>
          {saving?'Saving…':'💾 Save All'}
        </button>
      </div>

      <div style={{background:'#0d1526',border:'1px solid #1e2d4a',borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'14px 20px',background:'linear-gradient(135deg,#111d35,#0d1526)',borderBottom:'1px solid #1e2d4a',display:'flex',gap:12,alignItems:'center'}}>
          <span style={{fontSize:11,fontWeight:700,color:'#7a90b8',textTransform:'uppercase',letterSpacing:'0.08em'}}>Description Of Vote Head</span>
          <span className="badge badge-blue">{yearLabel}</span>
        </div>

        <div style={{overflowX:'auto'}}>
          <table className="data-grid">
            <thead>
              <tr>
                <th style={{width:50}}>Note</th>
                <th>Description</th>
                <th style={{width:180,textAlign:'right'}}>Enter Amount (KES)</th>
                <th style={{width:160,textAlign:'right'}}>Current Year</th>
                <th style={{width:160,textAlign:'right'}}>Previous Year</th>
              </tr>
            </thead>
            <tbody>
              {/* Receipts */}
              <tr className="row-section"><td colSpan={5} style={{fontSize:13,fontWeight:700,color:'#10b981'}}>📥 RECEIPTS</td></tr>
              <SectionRows items={receipts} label="" />
              <tr className="row-total">
                <td></td>
                <td style={{fontWeight:800}}>Total Receipts</td>
                <td></td>
                <td style={{textAlign:'right', color:'#10b981', fontSize:14}}>{fmt(totRecCur)}</td>
                <td style={{textAlign:'right', color:'#7a90b8'}}>{fmt(totRecPrev)}</td>
              </tr>

              <tr style={{height:12}}><td colSpan={5}></td></tr>

              {/* Payments */}
              <tr className="row-section"><td colSpan={5} style={{fontSize:13,fontWeight:700,color:'#ef4444'}}>📤 PAYMENTS</td></tr>
              <SectionRows items={payments} label="" />
              <tr className="row-total">
                <td></td>
                <td style={{fontWeight:800}}>Total Payments</td>
                <td></td>
                <td style={{textAlign:'right', color:'#ef4444', fontSize:14}}>{fmt(totPayCur)}</td>
                <td style={{textAlign:'right', color:'#7a90b8'}}>{fmt(totPayPrev)}</td>
              </tr>

              <tr style={{height:12}}><td colSpan={5}></td></tr>

              {/* Surplus */}
              <tr style={{background:'linear-gradient(135deg,rgba(79,126,248,0.12),rgba(139,92,246,0.08))'}}>
                <td></td>
                <td style={{fontWeight:800, fontSize:14}}>Surplus / (Deficit) for the Year</td>
                <td></td>
                <td style={{textAlign:'right', color: surplusCur>=0?'#10b981':'#ef4444', fontWeight:800, fontSize:16}}>{fmt(surplusCur)}</td>
                <td style={{textAlign:'right', color: surplusPrev>=0?'#10b981':'#ef4444', fontWeight:700}}>{fmt(surplusPrev)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{marginTop:16,padding:'12px 16px',background:'rgba(79,126,248,0.06)',border:'1px solid rgba(79,126,248,0.15)',borderRadius:10,fontSize:12,color:'#7a90b8'}}>
        💡 <strong style={{color:'#4f7ef8'}}>Tip:</strong> Enter amounts in the "Enter Amount" column. Previous year figures are auto-loaded from the comparative year. Click <strong>Save All</strong> when done.
      </div>
    </div>
  );
}
