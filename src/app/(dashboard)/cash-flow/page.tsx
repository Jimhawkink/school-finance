'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '../layout';
import toast from 'react-hot-toast';

type CFRow = {
  id?: string;
  activity_type: 'operating_receipt' | 'operating_payment' | 'investing' | 'financing';
  description: string;
  amount: number;
  prev_amount: number;
  sort_order: number;
};

const TEMPLATE: CFRow[] = [
  // Operating Receipts
  { activity_type:'operating_receipt', description:'Government grants – Tuition',        amount:0, prev_amount:0, sort_order:1 },
  { activity_type:'operating_receipt', description:'Government grants – Operations',     amount:0, prev_amount:0, sort_order:2 },
  { activity_type:'operating_receipt', description:'Government grants – Infrastructure', amount:0, prev_amount:0, sort_order:3 },
  { activity_type:'operating_receipt', description:'School fund – Parents contributions',amount:0, prev_amount:0, sort_order:4 },
  { activity_type:'operating_receipt', description:'Miscellaneous receipts',             amount:0, prev_amount:0, sort_order:5 },
  // Operating Payments
  { activity_type:'operating_payment', description:'Tuition expenditure',               amount:0, prev_amount:0, sort_order:1 },
  { activity_type:'operating_payment', description:'Operations expenditure',             amount:0, prev_amount:0, sort_order:2 },
  { activity_type:'operating_payment', description:'Infrastructure expenditure',        amount:0, prev_amount:0, sort_order:3 },
  { activity_type:'operating_payment', description:'Boarding / school fund expenditure',amount:0, prev_amount:0, sort_order:4 },
  // Investing
  { activity_type:'investing', description:'Purchase of equipment / assets',            amount:0, prev_amount:0, sort_order:1 },
  { activity_type:'investing', description:'Proceeds from disposal of assets',          amount:0, prev_amount:0, sort_order:2 },
  // Financing
  { activity_type:'financing', description:'Loans received',                            amount:0, prev_amount:0, sort_order:1 },
  { activity_type:'financing', description:'Loan repayments',                           amount:0, prev_amount:0, sort_order:2 },
];

const LABELS: Record<string,{label:string,color:string,emoji:string}> = {
  operating_receipt: { label:'OPERATING RECEIPTS',  color:'#10b981', emoji:'📥' },
  operating_payment: { label:'OPERATING PAYMENTS',  color:'#ef4444', emoji:'📤' },
  investing:         { label:'INVESTING ACTIVITIES', color:'#4f7ef8', emoji:'📈' },
  financing:         { label:'FINANCING ACTIVITIES', color:'#8b5cf6', emoji:'🏦' },
};

export default function CashFlowPage() {
  const { schoolId, yearId, yearLabel } = useApp();
  const [rows, setRows] = useState<CFRow[]>(TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [openBalance, setOpenBalance] = useState(0);
  const [openBalancePrev, setOpenBalancePrev] = useState(0);

  useEffect(() => { if (yearId) load(); }, [yearId]);

  async function load() {
    const { data } = await supabase.from('finance_cash_flow').select('*').eq('year_id', yearId).order('sort_order');
    if (data && data.length > 0) {
      const merged = TEMPLATE.map(t => {
        const found = data.find((d: any) => d.description === t.description && d.activity_type === t.activity_type);
        return found ? { ...t, id: found.id, amount: found.amount || 0, prev_amount: found.prev_amount || 0 } : t;
      });
      setRows(merged);
      // opening balance stored as a special row
      const ob = data.find((d: any) => d.activity_type === 'opening_balance');
      if (ob) { setOpenBalance(ob.amount || 0); setOpenBalancePrev(ob.prev_amount || 0); }
    }
  }

  const upd = (idx: number, f: 'amount' | 'prev_amount', v: string) => {
    const n = parseFloat(v.replace(/,/g, '')) || 0;
    setRows(p => p.map((r, i) => i === idx ? { ...r, [f]: n } : r));
  };

  async function save() {
    if (!schoolId || !yearId) { toast.error('Setup school first'); return; }
    setSaving(true);
    const t = toast.loading('Saving cash flow…');
    try {
      // upsert opening balance
      const { data: ob } = await supabase.from('finance_cash_flow').select('id').eq('year_id', yearId).eq('activity_type', 'opening_balance').single();
      const obPayload = { school_id: schoolId, year_id: yearId, activity_type: 'opening_balance', description: 'Opening Cash Balance', amount: openBalance, prev_amount: openBalancePrev, sort_order: 0, updated_at: new Date().toISOString() };
      if (ob) await supabase.from('finance_cash_flow').update(obPayload).eq('id', ob.id);
      else await supabase.from('finance_cash_flow').insert(obPayload);

      for (const row of rows) {
        const payload = { school_id: schoolId, year_id: yearId, activity_type: row.activity_type, description: row.description, amount: row.amount, prev_amount: row.prev_amount, sort_order: row.sort_order, updated_at: new Date().toISOString() };
        if (row.id) await supabase.from('finance_cash_flow').update(payload).eq('id', row.id);
        else {
          const { data } = await supabase.from('finance_cash_flow').insert(payload).select().single();
          if (data) setRows(p => p.map(r => r.description === row.description && r.activity_type === row.activity_type ? { ...r, id: data.id } : r));
        }
      }
      toast.success('Cash flow saved!', { id: t });
    } catch (e: any) { toast.error(e.message, { id: t }); }
    setSaving(false);
  }

  const byType = (type: CFRow['activity_type']) => rows.filter(r => r.activity_type === type);
  const sum = (items: CFRow[], f: 'amount' | 'prev_amount') => items.reduce((s, r) => s + r[f], 0);

  const totRecCur  = sum(byType('operating_receipt'), 'amount');
  const totPayCur  = sum(byType('operating_payment'), 'amount');
  const netOpCur   = totRecCur - totPayCur;
  const netInvCur  = sum(byType('investing'), 'amount');
  const netFinCur  = sum(byType('financing'), 'amount');
  const netChangeCur = netOpCur + netInvCur + netFinCur;
  const closingCur = openBalance + netChangeCur;

  const totRecPrev  = sum(byType('operating_receipt'), 'prev_amount');
  const totPayPrev  = sum(byType('operating_payment'), 'prev_amount');
  const netOpPrev   = totRecPrev - totPayPrev;
  const netInvPrev  = sum(byType('investing'), 'prev_amount');
  const netFinPrev  = sum(byType('financing'), 'prev_amount');
  const netChangePrev = netOpPrev + netInvPrev + netFinPrev;
  const closingPrev = openBalancePrev + netChangePrev;

  const fmt = (n: number) => n === 0 ? '-' : n < 0 ? `(${Math.abs(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })})` : n.toLocaleString('en-KE', { minimumFractionDigits: 2 });
  const col = (n: number) => n < 0 ? '#ef4444' : n > 0 ? '#10b981' : '#7a90b8';

  const types: CFRow['activity_type'][] = ['operating_receipt', 'operating_payment', 'investing', 'financing'];

  return (
    <div className="page-body">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#e8edf8' }}>💧 Cash Flow Statement</h1>
          <p style={{ color:'#7a90b8', fontSize:13, marginTop:4 }}>Statement of Cash Flows — FY {yearLabel}</p>
        </div>
        <button className="btn-success" onClick={save} disabled={saving}>{saving ? 'Saving…' : '💾 Save All'}</button>
      </div>

      {/* KPI Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Net Operating', val:netOpCur, color:'blue' },
          { label:'Net Investing',  val:netInvCur, color:'purple' },
          { label:'Net Financing',  val:netFinCur, color:'gold' },
          { label:'Closing Balance',val:closingCur, color:closingCur>=0?'green':'red' },
        ].map(k => (
          <div key={k.label} className={`kpi-card ${k.color}`}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ fontSize:18, color:col(k.val) }}>KES {fmt(k.val)}</div>
          </div>
        ))}
      </div>

      <div style={{ background:'#0d1526', border:'1px solid #1e2d4a', borderRadius:16, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table className="data-grid">
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ width:180, textAlign:'right' }}>Enter Amount (KES)</th>
                <th style={{ width:160, textAlign:'right' }}>Current Year</th>
                <th style={{ width:160, textAlign:'right' }}>Previous Year</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening Balance */}
              <tr className="row-section"><td colSpan={4} style={{ color:'#fbbf24', fontWeight:700 }}>💰 OPENING BALANCE</td></tr>
              <tr>
                <td style={{ paddingLeft:20 }}>Cash and cash equivalents at 1st July</td>
                <td style={{ textAlign:'right' }}>
                  <input className="cell-input" type="number" step="0.01" value={openBalance || ''} placeholder="0.00"
                    onChange={e => setOpenBalance(parseFloat(e.target.value.replace(/,/g,'')) || 0)} />
                </td>
                <td style={{ textAlign:'right', color:'#fbbf24', fontWeight:600 }}>{fmt(openBalance)}</td>
                <td style={{ textAlign:'right', color:'#7a90b8' }}>
                  <input className="cell-input" type="number" step="0.01" value={openBalancePrev || ''} placeholder="0.00"
                    onChange={e => setOpenBalancePrev(parseFloat(e.target.value.replace(/,/g,'')) || 0)} />
                </td>
              </tr>

              {types.map(type => {
                const items = byType(type);
                const meta = LABELS[type];
                const isPayment = type === 'operating_payment';
                const netCur = isPayment ? -sum(items,'amount') : sum(items,'amount');
                const netPrev = isPayment ? -sum(items,'prev_amount') : sum(items,'prev_amount');
                return (
                  <>
                    <tr style={{ height:8 }}><td colSpan={4}></td></tr>
                    <tr className="row-section" key={type+'-hdr'}>
                      <td colSpan={4} style={{ color:meta.color, fontWeight:700 }}>{meta.emoji} {meta.label}</td>
                    </tr>
                    {items.map((row, i) => {
                      const globalIdx = rows.indexOf(row);
                      return (
                        <tr key={row.description+i}>
                          <td style={{ paddingLeft:20 }}>{row.description}</td>
                          <td style={{ textAlign:'right' }}>
                            <input className="cell-input" type="number" step="0.01" value={row.amount || ''} placeholder="0.00"
                              onChange={e => upd(globalIdx, 'amount', e.target.value)} />
                          </td>
                          <td style={{ textAlign:'right', color:meta.color, fontWeight:600 }}>{fmt(row.amount)}</td>
                          <td style={{ textAlign:'right', color:'#7a90b8' }}>{fmt(row.prev_amount)}</td>
                        </tr>
                      );
                    })}
                    <tr className="row-total">
                      <td style={{ fontWeight:700 }}>Net {meta.label.replace(' ACTIVITIES','').replace('OPERATING ','Operating ')}</td>
                      <td></td>
                      <td style={{ textAlign:'right', color:col(netCur), fontWeight:800 }}>{fmt(netCur)}</td>
                      <td style={{ textAlign:'right', color:'#7a90b8', fontWeight:700 }}>{fmt(netPrev)}</td>
                    </tr>
                  </>
                );
              })}

              {/* Net Change */}
              <tr style={{ height:12 }}><td colSpan={4}></td></tr>
              <tr style={{ background:'linear-gradient(135deg,rgba(79,126,248,0.12),rgba(139,92,246,0.08))' }}>
                <td style={{ fontWeight:800, fontSize:14 }}>Net Increase / (Decrease) in Cash</td>
                <td></td>
                <td style={{ textAlign:'right', color:col(netChangeCur), fontWeight:800, fontSize:16 }}>{fmt(netChangeCur)}</td>
                <td style={{ textAlign:'right', color:col(netChangePrev), fontWeight:700 }}>{fmt(netChangePrev)}</td>
              </tr>
              <tr style={{ background:'linear-gradient(135deg,rgba(251,191,36,0.12),rgba(245,158,11,0.08))' }}>
                <td style={{ fontWeight:800, fontSize:14 }}>Closing Cash Balance (30 June)</td>
                <td></td>
                <td style={{ textAlign:'right', color:col(closingCur), fontWeight:800, fontSize:16 }}>{fmt(closingCur)}</td>
                <td style={{ textAlign:'right', color:col(closingPrev), fontWeight:700 }}>{fmt(closingPrev)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop:16, padding:'12px 16px', background:'rgba(79,126,248,0.06)', border:'1px solid rgba(79,126,248,0.15)', borderRadius:10, fontSize:12, color:'#7a90b8' }}>
        💡 <strong style={{ color:'#4f7ef8' }}>Tip:</strong> Enter amounts as positive numbers. Operating payments are automatically shown as outflows. The closing balance is auto-calculated: Opening + Net Change.
      </div>
    </div>
  );
}
