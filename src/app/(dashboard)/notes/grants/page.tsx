'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '../../layout';
import toast from 'react-hot-toast';

// Notes 1-5: Grants (income breakdown)
const NOTE_DEFS = [
  {
    num: 1, title: 'Note 1 – Government Grants: Tuition',
    rows: ['Tuition Grant allocation','Less: Returned to TSC','Add: Arrears from previous year','Any other adjustments'],
  },
  {
    num: 2, title: 'Note 2 – Government Grants: Operations',
    rows: ['Operations Grant allocation','Less: Returned to County','Add: Arrears from previous year','Any other adjustments'],
  },
  {
    num: 3, title: 'Note 3 – Government Grants: Infrastructure',
    rows: ['Infrastructure grant received','Add: Arrears from previous year','Less: Any refunds','Any other adjustments'],
  },
  {
    num: 4, title: 'Note 4 – School Fund: Parents / Fees Income',
    rows: ['Day scholars – Term 1','Day scholars – Term 2','Day scholars – Term 3','Boarders – Term 1','Boarders – Term 2','Boarders – Term 3','Less: Bursaries awarded','Less: Needy students waivers'],
  },
  {
    num: 5, title: 'Note 5 – Miscellaneous Incomes',
    rows: ['Hire of school facilities','Proceeds from sale of farm produce','Insurance proceeds','Other income (specify)','Any other miscellaneous receipts'],
  },
];

type NoteRow = { id?:string; note_number:number; row_label:string; current_amount:number; previous_amount:number; sort_order:number; };

export default function NotesGrantsPage() {
  const { schoolId, yearId, yearLabel } = useApp();
  const [data, setData] = useState<Record<number, NoteRow[]>>({});
  const [saving, setSaving] = useState<number|null>(null);

  useEffect(() => { if (yearId) load(); }, [yearId]);

  async function load() {
    const noteNums = NOTE_DEFS.map(n => n.num);
    const { data: dbRows } = await supabase.from('finance_notes').select('*').eq('year_id', yearId).in('note_number', noteNums).order('sort_order');
    const grouped: Record<number, NoteRow[]> = {};
    for (const def of NOTE_DEFS) {
      const dbNote = dbRows?.filter((r: any) => r.note_number === def.num) || [];
      grouped[def.num] = def.rows.map((label, i) => {
        const found = dbNote.find((r: any) => r.row_label === label);
        return found ? { id:found.id, note_number:def.num, row_label:label, current_amount:found.current_amount||0, previous_amount:found.previous_amount||0, sort_order:i } : { note_number:def.num, row_label:label, current_amount:0, previous_amount:0, sort_order:i };
      });
    }
    setData(grouped);
  }

  const upd = (noteNum: number, rowIdx: number, field: 'current_amount'|'previous_amount', val: string) => {
    const n = parseFloat(val.replace(/,/g,'')) || 0;
    setData(p => ({ ...p, [noteNum]: p[noteNum].map((r,i) => i===rowIdx ? {...r,[field]:n} : r) }));
  };

  async function saveNote(noteNum: number) {
    if (!schoolId || !yearId) { toast.error('Setup school first'); return; }
    setSaving(noteNum);
    const t = toast.loading(`Saving Note ${noteNum}…`);
    try {
      for (const row of data[noteNum] || []) {
        const payload = { school_id:schoolId, year_id:yearId, note_number:row.note_number, row_label:row.row_label, current_amount:row.current_amount, previous_amount:row.previous_amount, sort_order:row.sort_order, updated_at:new Date().toISOString() };
        if (row.id) await supabase.from('finance_notes').update(payload).eq('id', row.id);
        else {
          const { data: ins } = await supabase.from('finance_notes').insert(payload).select().single();
          if (ins) setData(p => ({ ...p, [noteNum]: p[noteNum].map(r => r.row_label===row.row_label && r.note_number===noteNum ? {...r,id:ins.id} : r) }));
        }
      }
      toast.success(`Note ${noteNum} saved!`, { id:t });
    } catch(e:any) { toast.error(e.message, { id:t }); }
    setSaving(null);
  }

  const fmt = (n:number) => n===0?'-': n<0?`(${Math.abs(n).toLocaleString('en-KE',{minimumFractionDigits:2})})`:n.toLocaleString('en-KE',{minimumFractionDigits:2});

  return (
    <div className="page-body">
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#e8edf8' }}>📋 Notes 1–5: Grants & Income</h1>
        <p style={{ color:'#7a90b8', fontSize:13, marginTop:4 }}>Detailed breakdown of grants and income sources — FY {yearLabel}</p>
      </div>

      {NOTE_DEFS.map(def => {
        const rows = data[def.num] || [];
        const totalCur  = rows.reduce((s,r) => s+r.current_amount, 0);
        const totalPrev = rows.reduce((s,r) => s+r.previous_amount, 0);
        return (
          <div key={def.num} style={{ marginBottom:24, background:'#0d1526', border:'1px solid #1e2d4a', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', background:'linear-gradient(135deg,#111d35,#0d1526)', borderBottom:'1px solid #1e2d4a', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <span style={{ fontSize:13, fontWeight:700, color:'#e8edf8' }}>{def.title}</span>
                <span className="badge badge-blue" style={{ marginLeft:10 }}>Note {def.num}</span>
              </div>
              <button className="btn-success" style={{ padding:'6px 16px', fontSize:12 }} onClick={() => saveNote(def.num)} disabled={saving===def.num}>
                {saving===def.num ? 'Saving…' : '💾 Save'}
              </button>
            </div>
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ width:180, textAlign:'right' }}>Current Year (KES)</th>
                  <th style={{ width:180, textAlign:'right' }}>Previous Year (KES)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.row_label}>
                    <td style={{ paddingLeft:20, color:'#e8edf8' }}>{row.row_label}</td>
                    <td style={{ textAlign:'right' }}>
                      <input className="cell-input" type="number" step="0.01" value={row.current_amount||''} placeholder="0.00"
                        onChange={e => upd(def.num, i, 'current_amount', e.target.value)} />
                    </td>
                    <td style={{ textAlign:'right' }}>
                      <input className="cell-input" type="number" step="0.01" value={row.previous_amount||''} placeholder="0.00"
                        onChange={e => upd(def.num, i, 'previous_amount', e.target.value)} />
                    </td>
                  </tr>
                ))}
                <tr className="row-total">
                  <td style={{ fontWeight:800 }}>Total – Note {def.num}</td>
                  <td style={{ textAlign:'right', color:'#10b981', fontWeight:800 }}>{fmt(totalCur)}</td>
                  <td style={{ textAlign:'right', color:'#7a90b8', fontWeight:700 }}>{fmt(totalPrev)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
