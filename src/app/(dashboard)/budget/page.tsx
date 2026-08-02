'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '../layout';
import toast from 'react-hot-toast';

type BRow = {
  id?: string;
  section: string;
  vote_head: string;
  description: string;
  original_budget: number;
  adjustments: number;
  actual: number;
  sort_order: number;
};

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

export default function BudgetPage() {
  const { schoolId, yearId, yearLabel } = useApp();
  const [rows, setRows]   = useState<BRow[]>([...INCOME_ROWS, ...EXPENSE_ROWS]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (yearId) load(); }, [yearId]);

  async function load() {
    const { data } = await supabase.from('finance_budget').select('*').eq('year_id', yearId).order('sort_order');
    if (data && data.length > 0) {
      const all = [...INCOME_ROWS, ...EXPENSE_ROWS];
      const merged = all.map(t => {
        const found = data.find((d: any) => d.vote_head === t.vote_head && d.section === t.section);
        return found ? { ...t, id: found.id, original_budget: found.original_budget||0, adjustments: found.adjustments||0, actual: found.actual||0 } : t;
      });
      setRows(merged);
    }
  }

  const upd = (idx: number, f: 'original_budget'|'adjustments'|'actual', v: string) => {
    const n = parseFloat(v.replace(/,/g,'')) || 0;
    setRows(p => p.map((r,i) => i===idx ? {...r,[f]:n} : r));
  };

  async function save() {
    if (!schoolId || !yearId) { toast.error('Setup school first'); return; }
    setSaving(true);
    const t = toast.loading('Saving budget…');
    try {
      for (const row of rows) {
        const payload = { school_id:schoolId, year_id:yearId, section:row.section, vote_head:row.vote_head, description:row.description, original_budget:row.original_budget, adjustments:row.adjustments, actual:row.actual, sort_order:row.sort_order, updated_at:new Date().toISOString() };
        if (row.id) await supabase.from('finance_budget').update(payload).eq('id', row.id);
        else {
          const { data } = await supabase.from('finance_budget').insert(payload).select().single();
          if (data) setRows(p => p.map(r => r.vote_head===row.vote_head && r.section===row.section ? {...r, id:data.id} : r));
        }
      }
      toast.success('Budget saved!', { id: t });
    } catch (e: any) { toast.error(e.message, { id: t }); }
    setSaving(false);
  }

  const income  = rows.filter(r => r.section === 'income');
  const expense = rows.filter(r => r.section === 'expense');
  const fmt = (n: number) => n === 0 ? '-' : n < 0 ? `(${Math.abs(n).toLocaleString('en-KE',{minimumFractionDigits:2})})` : n.toLocaleString('en-KE',{minimumFractionDigits:2});
  const varColor = (orig: number, adj: number, actual: number) => {
    const revised = orig + adj;
    const diff = actual - revised;
    return diff >= 0 ? '#10b981' : '#ef4444';
  };

  const totIncOrig   = income.reduce((s,r)=>s+r.original_budget,0);
  const totIncAdj    = income.reduce((s,r)=>s+r.adjustments,0);
  const totIncAct    = income.reduce((s,r)=>s+r.actual,0);
  const totExpOrig   = expense.reduce((s,r)=>s+r.original_budget,0);
  const totExpAdj    = expense.reduce((s,r)=>s+r.adjustments,0);
  const totExpAct    = expense.reduce((s,r)=>s+r.actual,0);
  const netOriginal  = (totIncOrig+totIncAdj) - (totExpOrig+totExpAdj);
  const netActual    = totIncAct - totExpAct;

  const utilPct = (actual:number, budget:number) => budget === 0 ? 0 : Math.min(100, Math.round((actual/budget)*100));

  const SectionRows = ({ items, label, color }: { items: BRow[], label: string, color: string }) => (
    <>
      <tr className="row-section"><td colSpan={7} style={{ color, fontWeight:700 }}>{label}</td></tr>
      {items.map((row) => {
        const idx = rows.indexOf(row);
        const revised = row.original_budget + row.adjustments;
        const variance = row.actual - revised;
        const pct = utilPct(row.actual, revised);
        return (
          <tr key={row.vote_head}>
            <td style={{ paddingLeft:20, color:'#e8edf8' }}>{row.description}</td>
            <td style={{ textAlign:'right' }}>
              <input className="cell-input" type="number" step="0.01" value={row.original_budget||''} placeholder="0.00"
                onChange={e => upd(idx,'original_budget',e.target.value)} />
            </td>
            <td style={{ textAlign:'right' }}>
              <input className="cell-input" type="number" step="0.01" value={row.adjustments||''} placeholder="0.00"
                onChange={e => upd(idx,'adjustments',e.target.value)} />
            </td>
            <td style={{ textAlign:'right', color:'#4f7ef8', fontWeight:600 }}>{fmt(revised)}</td>
            <td style={{ textAlign:'right' }}>
              <input className="cell-input" type="number" step="0.01" value={row.actual||''} placeholder="0.00"
                onChange={e => upd(idx,'actual',e.target.value)} />
            </td>
            <td style={{ textAlign:'right', color:variance>=0?'#10b981':'#ef4444', fontWeight:600 }}>{fmt(variance)}</td>
            <td style={{ width:120 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div className="progress-bar" style={{ flex:1 }}>
                  <div className="progress-fill" style={{ width:`${pct}%`, background: pct>100?'#ef4444':pct>80?'#f59e0b':'#10b981' }} />
                </div>
                <span style={{ fontSize:11, color:'#7a90b8', minWidth:32 }}>{pct}%</span>
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );

  return (
    <div className="page-body">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#e8edf8' }}>🎯 Budget Analysis</h1>
          <p style={{ color:'#7a90b8', fontSize:13, marginTop:4 }}>Budget vs Actual Performance — FY {yearLabel}</p>
        </div>
        <button className="btn-success" onClick={save} disabled={saving}>{saving?'Saving…':'💾 Save All'}</button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Revised Budget</div>
          <div className="kpi-value" style={{ fontSize:17 }}>KES {fmt(netOriginal)}</div>
          <div className="kpi-sub">Original + Adjustments</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Actual Surplus</div>
          <div className="kpi-value" style={{ fontSize:17, color:netActual>=0?'#10b981':'#ef4444' }}>KES {fmt(netActual)}</div>
          <div className="kpi-sub">Income - Expenditure</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Income Utilisation</div>
          <div className="kpi-value" style={{ fontSize:17 }}>{utilPct(totIncAct, totIncOrig+totIncAdj)}%</div>
          <div className="kpi-sub">of revised income budget</div>
        </div>
        <div className="kpi-card gold">
          <div className="kpi-label">Expense Utilisation</div>
          <div className="kpi-value" style={{ fontSize:17 }}>{utilPct(totExpAct, totExpOrig+totExpAdj)}%</div>
          <div className="kpi-sub">of revised expense budget</div>
        </div>
      </div>

      <div style={{ background:'#0d1526', border:'1px solid #1e2d4a', borderRadius:16, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table className="data-grid">
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ width:160, textAlign:'right' }}>Original Budget</th>
                <th style={{ width:160, textAlign:'right' }}>Adjustments</th>
                <th style={{ width:160, textAlign:'right' }}>Revised Budget</th>
                <th style={{ width:160, textAlign:'right' }}>Actual</th>
                <th style={{ width:140, textAlign:'right' }}>Variance</th>
                <th style={{ width:140 }}>Utilisation</th>
              </tr>
            </thead>
            <tbody>
              <SectionRows items={income}  label="📥 INCOME"      color="#10b981" />
              <tr className="row-total">
                <td style={{ fontWeight:800 }}>Total Income</td>
                <td style={{ textAlign:'right', color:'#7a90b8' }}>{fmt(totIncOrig)}</td>
                <td style={{ textAlign:'right', color:'#7a90b8' }}>{fmt(totIncAdj)}</td>
                <td style={{ textAlign:'right', color:'#4f7ef8', fontWeight:800 }}>{fmt(totIncOrig+totIncAdj)}</td>
                <td style={{ textAlign:'right', color:'#10b981', fontWeight:800 }}>{fmt(totIncAct)}</td>
                <td style={{ textAlign:'right', color:totIncAct-(totIncOrig+totIncAdj)>=0?'#10b981':'#ef4444', fontWeight:800 }}>{fmt(totIncAct-(totIncOrig+totIncAdj))}</td>
                <td></td>
              </tr>

              <tr style={{ height:12 }}><td colSpan={7}></td></tr>

              <SectionRows items={expense} label="📤 EXPENDITURE" color="#ef4444" />
              <tr className="row-total">
                <td style={{ fontWeight:800 }}>Total Expenditure</td>
                <td style={{ textAlign:'right', color:'#7a90b8' }}>{fmt(totExpOrig)}</td>
                <td style={{ textAlign:'right', color:'#7a90b8' }}>{fmt(totExpAdj)}</td>
                <td style={{ textAlign:'right', color:'#4f7ef8', fontWeight:800 }}>{fmt(totExpOrig+totExpAdj)}</td>
                <td style={{ textAlign:'right', color:'#ef4444', fontWeight:800 }}>{fmt(totExpAct)}</td>
                <td style={{ textAlign:'right', color:totExpAct-(totExpOrig+totExpAdj)<=0?'#10b981':'#ef4444', fontWeight:800 }}>{fmt(totExpAct-(totExpOrig+totExpAdj))}</td>
                <td></td>
              </tr>

              <tr style={{ height:12 }}><td colSpan={7}></td></tr>
              <tr style={{ background:'linear-gradient(135deg,rgba(79,126,248,0.12),rgba(139,92,246,0.08))' }}>
                <td style={{ fontWeight:800, fontSize:14 }}>NET SURPLUS / (DEFICIT)</td>
                <td></td><td></td>
                <td style={{ textAlign:'right', color:'#4f7ef8', fontWeight:800, fontSize:15 }}>{fmt(netOriginal)}</td>
                <td style={{ textAlign:'right', color:netActual>=0?'#10b981':'#ef4444', fontWeight:800, fontSize:15 }}>{fmt(netActual)}</td>
                <td style={{ textAlign:'right', color:netActual-netOriginal>=0?'#10b981':'#ef4444', fontWeight:800 }}>{fmt(netActual-netOriginal)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
