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
  operating_receipt: { label:'OPERATING RECEIPTS',  color:'#059669', emoji:'📥' },
  operating_payment: { label:'OPERATING PAYMENTS',  color:'#dc2626', emoji:'📤' },
  investing:         { label:'INVESTING ACTIVITIES', color:'#2563eb', emoji:'📈' },
  financing:         { label:'FINANCING ACTIVITIES', color:'#7c3aed', emoji:'🏦' },
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
  const col = (n: number) => n < 0 ? '#dc2626' : n > 0 ? '#059669' : '#475569';

  const types: CFRow['activity_type'][] = ['operating_receipt', 'operating_payment', 'investing', 'financing'];
  const inputStyle = {background:'#eff6ff', border:'2px solid #93c5fd', borderRadius:8, color:'#0f172a', padding:'6px 10px', width:'100%'};
  const tdContainerStyle = {padding:'8px', border:'2px dotted #93c5fd', borderRadius:8};

  return (
    <div className="page-body" style={{background:'#f0f5ff', minHeight:'100vh', padding:24}}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a' }}>💧 Cash Flow Statement</h1>
          <p style={{ color:'#475569', fontSize:13, marginTop:4 }}>Statement of Cash Flows — FY {yearLabel}</p>
        </div>
        <button className="btn-success" onClick={save} disabled={saving}>{saving ? 'Saving…' : '💾 Save All'}</button>
      </div>

      <div style={{background:'#eff6ff', border:'1px solid #93c5fd', borderRadius:8, padding:'12px 16px', marginBottom:24, color:'#0f172a', display:'flex', alignItems:'center', gap:8}}>
        <span style={{fontSize:20}}>💡</span>
        <span><strong>How to use:</strong> Click on any white input cell in the Amount columns to enter your figures. Press Tab to move to next field. Click Save when done.</span>
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

      <div style={{ background:'#fff', border:'1px solid #dde6f5', borderRadius:16, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table className="data-grid" style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#f1f5fd', color:'#475569', textAlign:'left'}}>
                <th style={{padding:'12px 16px'}}>Description</th>
                <th style={{ width:180, textAlign:'right', padding:'12px 16px', color:'#0f172a', fontWeight:700 }}>✏️ Enter Amount (KES)</th>
                <th style={{ width:160, textAlign:'right', padding:'12px 16px' }}>Current Year ✏️</th>
                <th style={{ width:160, textAlign:'right', padding:'12px 16px' }}>Previous Year ✏️</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening Balance */}
              <tr style={{background:'#eef2ff', color:'#7c3aed'}}><td colSpan={4} style={{ color:'#d97706', fontWeight:700, padding:'8px 16px' }}>💰 OPENING BALANCE</td></tr>
              <tr style={{transition:'background 0.2s'}} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f8ff'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <td style={{ paddingLeft:20, color:'#0f172a', padding:'12px 16px' }}>Cash and cash equivalents at 1st July</td>
                <td style={tdContainerStyle}>
                  <input style={inputStyle} type="number" step="0.01" value={openBalance || ''} placeholder="0.00"
                    onChange={e => setOpenBalance(parseFloat(e.target.value.replace(/,/g,'')) || 0)} />
                </td>
                <td style={{ textAlign:'right', color:'#d97706', fontWeight:600, padding:'12px 16px' }}>{fmt(openBalance)}</td>
                <td style={{...tdContainerStyle, textAlign:'right'}}>
                  <input style={inputStyle} type="number" step="0.01" value={openBalancePrev || ''} placeholder="0.00"
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
                    <tr style={{background:'#eef2ff', color:'#7c3aed'}} key={type+'-hdr'}>
                      <td colSpan={4} style={{ color:meta.color, fontWeight:700, padding:'8px 16px' }}>{meta.emoji} {meta.label}</td>
                    </tr>
                    {items.map((row, i) => {
                      const globalIdx = rows.indexOf(row);
                      return (
                        <tr key={row.description+i} style={{transition:'background 0.2s'}} onMouseEnter={(e) => e.currentTarget.style.background = '#f5f8ff'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ paddingLeft:20, color:'#0f172a', padding:'12px 16px' }}>{row.description}</td>
                          <td style={tdContainerStyle}>
                            <input style={inputStyle} type="number" step="0.01" value={row.amount || ''} placeholder="0.00"
                              onChange={e => upd(globalIdx, 'amount', e.target.value)} />
                          </td>
                          <td style={{ textAlign:'right', color:meta.color, fontWeight:600, padding:'12px 16px' }}>{fmt(row.amount)}</td>
                          <td style={{ textAlign:'right', color:'#475569', padding:'12px 16px' }}>{fmt(row.prev_amount)}</td>
                        </tr>
                      );
                    })}
                    <tr style={{background:'#f0f5ff'}}>
                      <td style={{ fontWeight:700, color:'#0f172a', padding:'12px 16px' }}>Net {meta.label.replace(' ACTIVITIES','').replace('OPERATING ','Operating ')}</td>
                      <td style={{padding:'12px 16px'}}></td>
                      <td style={{ textAlign:'right', color:col(netCur), fontWeight:800, padding:'12px 16px' }}>{fmt(netCur)}</td>
                      <td style={{ textAlign:'right', color:'#475569', fontWeight:700, padding:'12px 16px' }}>{fmt(netPrev)}</td>
                    </tr>
                  </>
                );
              })}

              {/* Net Change */}
              <tr style={{ background:'linear-gradient(135deg,rgba(37,99,235,0.08),rgba(124,58,237,0.05))' }}>
                <td style={{ fontWeight:800, fontSize:14, color:'#0f172a', padding:'16px' }}>Net Increase / (Decrease) in Cash</td>
                <td style={{padding:'16px'}}></td>
                <td style={{ textAlign:'right', color:col(netChangeCur), fontWeight:800, fontSize:16, padding:'16px' }}>{fmt(netChangeCur)}</td>
                <td style={{ textAlign:'right', color:col(netChangePrev), fontWeight:700, padding:'16px' }}>{fmt(netChangePrev)}</td>
              </tr>
              <tr style={{ background:'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.08))' }}>
                <td style={{ fontWeight:800, fontSize:14, color:'#0f172a', padding:'16px' }}>Closing Cash Balance (30 June)</td>
                <td style={{padding:'16px'}}></td>
                <td style={{ textAlign:'right', color:col(closingCur), fontWeight:800, fontSize:16, padding:'16px' }}>{fmt(closingCur)}</td>
                <td style={{ textAlign:'right', color:col(closingPrev), fontWeight:700, padding:'16px' }}>{fmt(closingPrev)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
