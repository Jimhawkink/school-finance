'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '../../layout';
import toast from 'react-hot-toast';

// Notes 10-15: Balance Sheet account details
const NOTE_DEFS = [
  {
    num: 10, title: 'Note 10 – Bank Balances',
    rows: ['Kenya Commercial Bank – TSC A/C', 'Kenya Commercial Bank – School Fund A/C', 'Equity Bank – Operations A/C', 'Co-operative Bank – Infrastructure A/C', 'Other bank accounts'],
  },
  {
    num: 11, title: 'Note 11 – Cash Balances',
    rows: ['Petty cash – Administration', 'Petty cash – Bursar', 'Other cash on hand'],
  },
  {
    num: 12, title: 'Note 12 – Short-Term Investments',
    rows: ['Fixed deposit – KCB', 'Fixed deposit – Equity', 'Treasury bills', 'Other short-term investments'],
  },
  {
    num: 13, title: "Note 13 – Accounts Receivable",
    rows: ['Government grants receivable', 'Student fees receivable', 'Other receivables', 'Less: Provision for bad debts'],
  },
  {
    num: 14, title: 'Note 14 – Accounts Payable',
    rows: ['Creditors – Suppliers', 'Creditors – Service providers', 'Accrued salaries and wages', 'Loan instalments due', 'Other payables'],
  },
  {
    num: 15, title: 'Note 15 – Accumulated Fund',
    rows: ['Accumulated fund brought forward', 'Add: Surplus for current year', 'Less: Deficit for current year', 'Less: Transfers to reserves'],
  },
];

type NoteRow = { id?:string; note_number:number; row_label:string; current_amount:number; previous_amount:number; sort_order:number; };

export default function NotesAccountsPage() {
  const { schoolId, yearId, yearLabel } = useApp();
  const [data, setData]   = useState<Record<number, NoteRow[]>>({});
  const [saving, setSaving] = useState<number|null>(null);

  useEffect(() => { if (yearId) load(); }, [yearId]);

  async function load() {
    const nums = NOTE_DEFS.map(n => n.num);
    const { data: dbRows } = await supabase.from('finance_notes').select('*').eq('year_id', yearId).in('note_number', nums).order('sort_order');
    const grouped: Record<number, NoteRow[]> = {};
    for (const def of NOTE_DEFS) {
      const dbNote = dbRows?.filter((r:any) => r.note_number === def.num) || [];
      grouped[def.num] = def.rows.map((label, i) => {
        const found = dbNote.find((r:any) => r.row_label === label);
        return found
          ? { id:found.id, note_number:def.num, row_label:label, current_amount:found.current_amount||0, previous_amount:found.previous_amount||0, sort_order:i }
          : { note_number:def.num, row_label:label, current_amount:0, previous_amount:0, sort_order:i };
      });
    }
    setData(grouped);
  }

  const upd = (num:number, i:number, f:'current_amount'|'previous_amount', v:string) => {
    const n = parseFloat(v.replace(/,/g,''))||0;
    setData(p => ({ ...p, [num]: p[num].map((r,idx) => idx===i?{...r,[f]:n}:r) }));
  };

  async function saveNote(noteNum:number) {
    if (!schoolId||!yearId){toast.error('Setup school first');return;}
    setSaving(noteNum);
    const t = toast.loading(`Saving Note ${noteNum}…`);
    try {
      for (const row of data[noteNum]||[]) {
        const payload={school_id:schoolId,year_id:yearId,note_number:row.note_number,row_label:row.row_label,current_amount:row.current_amount,previous_amount:row.previous_amount,sort_order:row.sort_order,updated_at:new Date().toISOString()};
        if(row.id) await supabase.from('finance_notes').update(payload).eq('id',row.id);
        else { const{data:ins}=await supabase.from('finance_notes').insert(payload).select().single(); if(ins) setData(p=>({...p,[noteNum]:p[noteNum].map(r=>r.row_label===row.row_label&&r.note_number===noteNum?{...r,id:ins.id}:r)})); }
      }
      toast.success(`Note ${noteNum} saved!`,{id:t});
    } catch(e:any){toast.error(e.message,{id:t});}
    setSaving(null);
  }

  const fmt=(n:number)=>n===0?'-':n<0?`(${Math.abs(n).toLocaleString('en-KE',{minimumFractionDigits:2})})`:n.toLocaleString('en-KE',{minimumFractionDigits:2});
  const badgeClass=(num:number)=>num<=12?'badge-blue':num===13?'badge-green':num===14?'badge-red':'badge-purple';

  return (
    <div className="page-body">
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:800,color:'#e8edf8'}}>📋 Notes 10–15: Account Details</h1>
        <p style={{color:'#7a90b8',fontSize:13,marginTop:4}}>Detailed schedules of balance sheet accounts — FY {yearLabel}</p>
      </div>

      {NOTE_DEFS.map(def => {
        const rows = data[def.num] || [];
        const totalCur  = rows.reduce((s,r)=>s+r.current_amount,0);
        const totalPrev = rows.reduce((s,r)=>s+r.previous_amount,0);
        return (
          <div key={def.num} style={{marginBottom:24,background:'#0d1526',border:'1px solid #1e2d4a',borderRadius:16,overflow:'hidden'}}>
            <div style={{padding:'14px 20px',background:'linear-gradient(135deg,#111d35,#0d1526)',borderBottom:'1px solid #1e2d4a',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <span style={{fontSize:13,fontWeight:700,color:'#e8edf8'}}>{def.title}</span>
                <span className={`badge ${badgeClass(def.num)}`} style={{marginLeft:10}}>Note {def.num}</span>
              </div>
              <button className="btn-success" style={{padding:'6px 16px',fontSize:12}} onClick={()=>saveNote(def.num)} disabled={saving===def.num}>
                {saving===def.num?'Saving…':'💾 Save'}
              </button>
            </div>
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{width:180,textAlign:'right'}}>Current Year (KES)</th>
                  <th style={{width:180,textAlign:'right'}}>Previous Year (KES)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row,i)=>(
                  <tr key={row.row_label}>
                    <td style={{paddingLeft:20}}>{row.row_label}</td>
                    <td style={{textAlign:'right'}}>
                      <input className="cell-input" type="number" step="0.01" value={row.current_amount||''} placeholder="0.00"
                        onChange={e=>upd(def.num,i,'current_amount',e.target.value)} />
                    </td>
                    <td style={{textAlign:'right'}}>
                      <input className="cell-input" type="number" step="0.01" value={row.previous_amount||''} placeholder="0.00"
                        onChange={e=>upd(def.num,i,'previous_amount',e.target.value)} />
                    </td>
                  </tr>
                ))}
                <tr className="row-total">
                  <td style={{fontWeight:800}}>Total – Note {def.num}</td>
                  <td style={{textAlign:'right',color:'#4f7ef8',fontWeight:800}}>{fmt(totalCur)}</td>
                  <td style={{textAlign:'right',color:'#7a90b8',fontWeight:700}}>{fmt(totalPrev)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
