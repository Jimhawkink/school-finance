'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '../../layout';
import toast from 'react-hot-toast';

// Note 17 – Other Disclosures
const NOTE_DEFS = [
  {
    num: 17, title: 'Note 17 – Other Disclosures & Related Party Transactions',
    sections: [
      {
        heading: 'A. Commitments',
        rows: ['Capital commitments – contracted but not yet incurred', 'Operating lease commitments – within 1 year', 'Operating lease commitments – 1 to 5 years', 'Other commitments (specify)'],
      },
      {
        heading: 'B. Contingent Liabilities',
        rows: ['Pending court cases and litigation', 'Guarantees given', 'Other contingent liabilities'],
      },
      {
        heading: 'C. Related Party Transactions',
        rows: ['Transactions with BOM members', 'Transactions with school staff', 'Other related party transactions'],
      },
      {
        heading: 'D. Events After Reporting Date',
        rows: ['Adjusting events after balance sheet date', 'Non-adjusting events after balance sheet date'],
      },
      {
        heading: 'E. Comparative Figures',
        rows: ['Prior year adjustments / restatements', 'Change in accounting policy effects'],
      },
    ],
  },
];

type NoteRow = { id?:string; note_number:number; row_label:string; current_amount:number; previous_amount:number; extra_col?:string; sort_order:number; };

export default function NotesOtherPage() {
  const { schoolId, yearId, yearLabel } = useApp();
  const [rows, setRows]     = useState<NoteRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [narrative, setNarrative] = useState('');

  useEffect(() => { if (yearId) load(); }, [yearId]);

  function buildTemplate(): NoteRow[] {
    const out: NoteRow[] = [];
    let sort = 0;
    for (const def of NOTE_DEFS) {
      for (const sec of def.sections) {
        for (const label of sec.rows) {
          out.push({ note_number:17, row_label:label, current_amount:0, previous_amount:0, extra_col:sec.heading, sort_order:sort++ });
        }
      }
    }
    return out;
  }

  async function load() {
    const { data } = await supabase.from('finance_notes').select('*').eq('year_id', yearId).eq('note_number', 17).order('sort_order');
    const template = buildTemplate();
    if (data && data.length > 0) {
      const merged = template.map(t => {
        const found = data.find((d:any) => d.row_label === t.row_label);
        return found ? { ...t, id:found.id, current_amount:found.current_amount||0, previous_amount:found.previous_amount||0, extra_col:t.extra_col } : t;
      });
      setRows(merged);
      // load narrative
      const narr = data.find((d:any) => d.row_label === '__narrative__');
      if (narr) setNarrative(narr.extra_col || '');
    } else {
      setRows(template);
    }
  }

  const upd = (idx:number, f:'current_amount'|'previous_amount', v:string) => {
    const n = parseFloat(v.replace(/,/g,''))||0;
    setRows(p => p.map((r,i) => i===idx?{...r,[f]:n}:r));
  };

  async function save() {
    if (!schoolId||!yearId){toast.error('Setup school first');return;}
    setSaving(true);
    const t = toast.loading('Saving Note 17…');
    try {
      for (const row of rows) {
        const payload = { school_id:schoolId, year_id:yearId, note_number:17, row_label:row.row_label, current_amount:row.current_amount, previous_amount:row.previous_amount, extra_col:row.extra_col||null, sort_order:row.sort_order, updated_at:new Date().toISOString() };
        if (row.id) await supabase.from('finance_notes').update(payload).eq('id',row.id);
        else { const{data:ins}=await supabase.from('finance_notes').insert(payload).select().single(); if(ins) setRows(p=>p.map(r=>r.row_label===row.row_label&&r.sort_order===row.sort_order?{...r,id:ins.id}:r)); }
      }
      // save narrative
      const{data:nRow}=await supabase.from('finance_notes').select('id').eq('year_id',yearId).eq('note_number',17).eq('row_label','__narrative__').single();
      const nPayload={school_id:schoolId,year_id:yearId,note_number:17,row_label:'__narrative__',current_amount:0,previous_amount:0,extra_col:narrative,sort_order:999,updated_at:new Date().toISOString()};
      if(nRow) await supabase.from('finance_notes').update(nPayload).eq('id',nRow.id);
      else await supabase.from('finance_notes').insert(nPayload);
      toast.success('Note 17 saved!',{id:t});
    } catch(e:any){toast.error(e.message,{id:t});}
    setSaving(false);
  }

  const fmt=(n:number)=>n===0?'-':n<0?`(${Math.abs(n).toLocaleString('en-KE',{minimumFractionDigits:2})})`:n.toLocaleString('en-KE',{minimumFractionDigits:2});
  const totalCur = rows.reduce((s,r)=>s+r.current_amount,0);
  const totalPrev= rows.reduce((s,r)=>s+r.previous_amount,0);

  // Group rows by section heading
  const sections = NOTE_DEFS[0].sections.map(sec => ({
    heading: sec.heading,
    rows: rows.filter(r => r.extra_col === sec.heading),
  }));

  const sectionColors: Record<string,string> = {
    'A. Commitments':                 '#4f7ef8',
    'B. Contingent Liabilities':      '#ef4444',
    'C. Related Party Transactions':  '#f59e0b',
    'D. Events After Reporting Date': '#8b5cf6',
    'E. Comparative Figures':         '#10b981',
  };

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:900, color:'#e8edf8', letterSpacing:'-0.3px' }}>📋 Note 17 – Other Disclosures</h1>
          <p style={{ color:'#7a90b8', fontSize:13, marginTop:4 }}>Commitments, contingencies, related parties & events after reporting date — FY {yearLabel}</p>
        </div>
        <button className="btn-success" onClick={save} disabled={saving} style={{ padding:'11px 28px', fontSize:14 }}>
          {saving ? (
            <><span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.8s linear infinite',display:'inline-block' }} /> Saving…</>
          ) : '💾 Save Note 17'}
        </button>
      </div>

      {/* Info Banner */}
      <div style={{ background:'linear-gradient(135deg,rgba(79,126,248,0.08),rgba(139,92,246,0.05))', border:'1px solid rgba(79,126,248,0.2)', borderRadius:12, padding:'16px 20px', marginBottom:24, display:'flex', gap:12, alignItems:'flex-start' }}>
        <span style={{ fontSize:22 }}>ℹ️</span>
        <div>
          <div style={{ fontWeight:700, fontSize:13, color:'#4f7ef8', marginBottom:4 }}>About Note 17</div>
          <div style={{ fontSize:12, color:'#7a90b8', lineHeight:1.6 }}>
            Note 17 covers all other disclosures required by the Public Finance Management Act and relevant accounting standards. Enter monetary values where applicable; for qualitative disclosures, use the narrative section at the bottom.
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:24 }}>
        {sections.map(sec => {
          const tot = sec.rows.reduce((s,r)=>s+r.current_amount,0);
          const col = sectionColors[sec.heading]||'#7a90b8';
          return (
            <div key={sec.heading} style={{ background:'#0d1526', border:`1px solid ${col}30`, borderRadius:14, padding:'16px 16px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${col},${col}88)` }} />
              <div style={{ fontSize:10, fontWeight:700, color:col, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{sec.heading.split('.')[1]?.trim().split(' ').slice(0,2).join(' ')}</div>
              <div style={{ fontSize:17, fontWeight:800, color:tot>0?col:'#4a5f82' }}>{tot>0?`KES ${(tot/1000).toFixed(0)}K`:'None'}</div>
            </div>
          );
        })}
      </div>

      {/* Sections */}
      {sections.map(sec => {
        const col = sectionColors[sec.heading] || '#7a90b8';
        const secTotal = sec.rows.reduce((s,r)=>s+r.current_amount,0);
        const secPrev  = sec.rows.reduce((s,r)=>s+r.previous_amount,0);
        return (
          <div key={sec.heading} style={{ marginBottom:20, background:'#0d1526', border:'1px solid #1e2d4a', borderRadius:16, overflow:'hidden' }}>
            {/* Section header */}
            <div style={{ padding:'14px 22px', background:`linear-gradient(135deg,rgba(${col==='#4f7ef8'?'79,126,248':col==='#ef4444'?'239,68,68':col==='#f59e0b'?'245,158,11':col==='#8b5cf6'?'139,92,246':'16,185,129'},0.12),rgba(255,255,255,0.02))`, borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:32, height:32, background:`${col}25`, border:`1px solid ${col}40`, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:col }}>
                  {sec.heading.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#e8edf8' }}>{sec.heading}</div>
                </div>
              </div>
              {secTotal > 0 && (
                <div style={{ fontSize:13, fontWeight:700, color:col }}>KES {secTotal.toLocaleString('en-KE')}</div>
              )}
            </div>

            <div style={{ overflowX:'auto' }}>
              <table className="data-grid">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ width:200, textAlign:'right' }}>Current Year (KES)</th>
                    <th style={{ width:200, textAlign:'right' }}>Previous Year (KES)</th>
                    <th style={{ width:180, textAlign:'right' }}>Formatted Current</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.rows.map((row, i) => {
                    const globalIdx = rows.indexOf(row);
                    return (
                      <tr key={row.row_label}>
                        <td style={{ paddingLeft:22, color:'#e8edf8' }}>{row.row_label}</td>
                        <td style={{ textAlign:'right' }}>
                          <input className="cell-input" type="number" step="0.01" value={row.current_amount||''} placeholder="0.00"
                            onChange={e => upd(globalIdx,'current_amount',e.target.value)} />
                        </td>
                        <td style={{ textAlign:'right' }}>
                          <input className="cell-input" type="number" step="0.01" value={row.previous_amount||''} placeholder="0.00"
                            onChange={e => upd(globalIdx,'previous_amount',e.target.value)} />
                        </td>
                        <td style={{ textAlign:'right', color:row.current_amount>0?col:'#4a5f82', fontWeight:row.current_amount>0?700:400 }}>
                          {fmt(row.current_amount)}
                        </td>
                      </tr>
                    );
                  })}
                  {secTotal > 0 && (
                    <tr className="row-total">
                      <td style={{ fontWeight:800 }}>Sub-Total — {sec.heading}</td>
                      <td></td>
                      <td></td>
                      <td style={{ textAlign:'right', color:col, fontWeight:800 }}>{fmt(secTotal)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Grand Total */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
        <div style={{ padding:'20px 24px', background:'linear-gradient(135deg,rgba(79,126,248,0.1),rgba(139,92,246,0.06))', border:'1px solid rgba(79,126,248,0.25)', borderRadius:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#7a90b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Total Disclosures — Current Year</div>
          <div style={{ fontSize:24, fontWeight:900, color:totalCur>0?'#4f7ef8':'#4a5f82' }}>{totalCur>0?`KES ${totalCur.toLocaleString('en-KE')}`:'No amounts'}</div>
        </div>
        <div style={{ padding:'20px 24px', background:'rgba(255,255,255,0.03)', border:'1px solid #1e2d4a', borderRadius:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#7a90b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Total Disclosures — Previous Year</div>
          <div style={{ fontSize:24, fontWeight:900, color:totalPrev>0?'#7a90b8':'#4a5f82' }}>{totalPrev>0?`KES ${totalPrev.toLocaleString('en-KE')}`:'No amounts'}</div>
        </div>
      </div>

      {/* Narrative / Qualitative Disclosures */}
      <div style={{ background:'#0d1526', border:'1px solid #1e2d4a', borderRadius:16, padding:24, marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <div style={{ width:32, height:32, background:'linear-gradient(135deg,#a855f7,#7c3aed)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>✍️</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'#e8edf8' }}>Narrative Disclosures</div>
            <div style={{ fontSize:12, color:'#7a90b8', marginTop:2 }}>Qualitative notes, explanations, and additional information for the auditor</div>
          </div>
        </div>
        <textarea
          value={narrative}
          onChange={e => setNarrative(e.target.value)}
          placeholder="Enter any qualitative disclosures, accounting policies, explanations of significant changes, details of pending litigation, descriptions of related party transactions, events after the reporting date, etc…"
          style={{ width:'100%', minHeight:180, background:'rgba(255,255,255,0.03)', border:'1px solid #1e2d4a', borderRadius:10, padding:'14px 16px', color:'#e8edf8', fontSize:13, fontFamily:"'Inter',sans-serif", lineHeight:1.7, resize:'vertical', outline:'none', transition:'border-color 0.2s' }}
          onFocus={e=>{(e.target as HTMLTextAreaElement).style.borderColor='#4f7ef8';(e.target as HTMLTextAreaElement).style.boxShadow='0 0 0 3px rgba(79,126,248,0.12)';}}
          onBlur={e=>{(e.target as HTMLTextAreaElement).style.borderColor='#1e2d4a';(e.target as HTMLTextAreaElement).style.boxShadow='none';}}
        />
        <div style={{ fontSize:11, color:'#4a5f82', marginTop:8 }}>{narrative.length} characters · This narrative will appear in the printed report</div>
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button className="btn-success" onClick={save} disabled={saving} style={{ padding:'12px 32px', fontSize:14 }}>
          {saving ? 'Saving…' : '💾 Save All of Note 17'}
        </button>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
