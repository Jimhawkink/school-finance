'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '../layout';
import toast from 'react-hot-toast';

type School = { id?:string; name:string; district:string; county:string; school_type:string; principal_name:string; bom_chairperson:string; index_no?:string; postal_address?:string; phone?:string; email?:string; };
type Year   = { id?:string; year_label:string; start_date:string; end_date:string; is_current:boolean; is_locked:boolean; };

export default function SetupPage() {
  const { schoolId } = useApp();
  const [tab, setTab]             = useState<'school'|'years'>('school');
  const [school, setSchool]       = useState<School>({ name:'', district:'', county:'', school_type:'Secondary', principal_name:'', bom_chairperson:'' });
  const [years, setYears]         = useState<Year[]>([]);
  const [newYear, setNewYear]     = useState<Year>({ year_label:'', start_date:'', end_date:'', is_current:false, is_locked:false });
  const [saving, setSaving]       = useState(false);
  const [addingYear, setAddingYear] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const { data: sc } = await supabase.from('finance_schools').select('*').limit(1).single();
    if (sc) setSchool(sc);
    if (sc?.id) {
      const { data: yrs } = await supabase.from('finance_financial_years').select('*').eq('school_id', sc.id).order('year_label', { ascending: false });
      setYears(yrs || []);
    }
  }

  async function saveSchool() {
    setSaving(true);
    const t = toast.loading('Saving school details…');
    try {
      if (school.id) {
        await supabase.from('finance_schools').update({ ...school, updated_at: new Date().toISOString() }).eq('id', school.id);
      } else {
        const { data } = await supabase.from('finance_schools').insert({ ...school, created_at: new Date().toISOString() }).select().single();
        if (data) setSchool(data);
      }
      toast.success('School details saved!', { id: t });
    } catch (e: any) { toast.error(e.message, { id: t }); }
    setSaving(false);
  }

  async function saveYear() {
    if (!school.id) { toast.error('Save school details first'); return; }
    if (!newYear.year_label || !newYear.start_date || !newYear.end_date) { toast.error('Fill all year fields'); return; }
    setAddingYear(true);
    const t = toast.loading('Adding financial year…');
    try {
      if (newYear.is_current) {
        await supabase.from('finance_financial_years').update({ is_current: false }).eq('school_id', school.id);
      }
      const { data } = await supabase.from('finance_financial_years').insert({ ...newYear, school_id: school.id, created_at: new Date().toISOString() }).select().single();
      if (data) setYears(p => [data, ...p]);
      setNewYear({ year_label:'', start_date:'', end_date:'', is_current:false, is_locked:false });
      toast.success('Financial year added!', { id: t });
    } catch (e: any) { toast.error(e.message, { id: t }); }
    setAddingYear(false);
  }

  async function setCurrent(yr: Year) {
    if (!yr.id) return;
    await supabase.from('finance_financial_years').update({ is_current: false }).eq('school_id', school.id);
    await supabase.from('finance_financial_years').update({ is_current: true }).eq('id', yr.id);
    setYears(p => p.map(y => ({ ...y, is_current: y.id === yr.id })));
    toast.success(`${yr.year_label} set as current year`);
  }

  async function toggleLock(yr: Year) {
    if (!yr.id) return;
    await supabase.from('finance_financial_years').update({ is_locked: !yr.is_locked }).eq('id', yr.id);
    setYears(p => p.map(y => y.id === yr.id ? { ...y, is_locked: !y.is_locked } : y));
    toast.success(yr.is_locked ? 'Year unlocked' : 'Year locked');
  }

  const F = ({ label, value, onChange, type='text', required=false }: any) => (
    <div className="form-group">
      <label className="form-label" style={{ color: '#475569', fontWeight: 600 }}>{label}{required && <span style={{ color:'#dc2626' }}> *</span>}</label>
      <input className="form-input setup-input" type={type} value={value} onChange={e => onChange(e.target.value)} required={required} />
    </div>
  );

  return (
    <div className="page-body" style={{ background: '#f0f5ff', minHeight: '100vh' }}>
      <style>{`
        .setup-input {
          background: #fff;
          border: 1px solid #dde6f5;
          border-radius: 8px;
          color: #0f172a;
          padding: 8px 12px;
          width: 100%;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s;
        }
        .setup-input:focus {
          border-color: #2563eb;
        }
        .form-select.setup-input {
          appearance: auto;
        }
        .light-table th {
          background: #f1f5fd;
          color: #475569;
          font-weight: 700;
          padding: 12px;
          border-bottom: 1px solid #dde6f5;
          text-align: left;
        }
        .light-table td {
          padding: 12px;
          border-bottom: 1px solid #dde6f5;
          color: #0f172a;
        }
        .light-table tr {
          background: #fff;
        }
        .light-table tr:hover {
          background: #f5f8ff;
        }
      `}</style>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a' }}>⚙️ School Setup</h1>
          <p style={{ color:'#475569', fontSize:13, marginTop:4 }}>Configure your school profile and financial years</p>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="tab-nav" style={{ marginBottom:24 }}>
        <button className={`tab-btn ${tab==='school'?'active':''}`} onClick={() => setTab('school')}>🏫 School Profile</button>
        <button className={`tab-btn ${tab==='years'?'active':''}`} onClick={() => setTab('years')}>📅 Financial Years</button>
      </div>

      {tab === 'school' && (
        <div className="glass" style={{ padding:32, background:'#fff', border:'1px solid #dde6f5', borderRadius:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            <F label="School Name" value={school.name} onChange={(v:string) => setSchool(p=>({...p,name:v}))} required />
            <F label="School Index No." value={school.index_no||''} onChange={(v:string) => setSchool(p=>({...p,index_no:v}))} />
            <F label="District" value={school.district} onChange={(v:string) => setSchool(p=>({...p,district:v}))} required />
            <F label="County" value={school.county} onChange={(v:string) => setSchool(p=>({...p,county:v}))} required />
            <div className="form-group">
              <label className="form-label" style={{ color: '#475569', fontWeight: 600 }}>School Type</label>
              <select className="form-select setup-input" value={school.school_type} onChange={e => setSchool(p=>({...p,school_type:e.target.value}))}>
                <option>Secondary</option>
                <option>Primary</option>
                <option>ECDE</option>
              </select>
            </div>
            <F label="Postal Address" value={school.postal_address||''} onChange={(v:string) => setSchool(p=>({...p,postal_address:v}))} />
            <F label="Phone" value={school.phone||''} onChange={(v:string) => setSchool(p=>({...p,phone:v}))} />
            <F label="Email" type="email" value={school.email||''} onChange={(v:string) => setSchool(p=>({...p,email:v}))} />
            <F label="Principal Name" value={school.principal_name} onChange={(v:string) => setSchool(p=>({...p,principal_name:v}))} required />
            <F label="BOM Chairperson" value={school.bom_chairperson} onChange={(v:string) => setSchool(p=>({...p,bom_chairperson:v}))} required />
          </div>
          <div style={{ marginTop:28, display:'flex', justifyContent:'flex-end' }}>
            <button className="btn-primary" onClick={saveSchool} disabled={saving}>{saving?'Saving…':'💾 Save School Details'}</button>
          </div>
        </div>
      )}

      {tab === 'years' && (
        <>
          {/* Add Year */}
          <div className="glass" style={{ padding:28, marginBottom:24, background:'#fff', border:'1px solid #dde6f5', borderRadius:16 }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'#0f172a', marginBottom:20 }}>➕ Add Financial Year</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:16, alignItems:'end' }}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#475569', fontWeight: 600 }}>Year Label <span style={{color:'#dc2626'}}>*</span></label>
                <input className="form-input setup-input" placeholder="e.g. 2024/2025" value={newYear.year_label} onChange={e => setNewYear(p=>({...p,year_label:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: '#475569', fontWeight: 600 }}>Start Date</label>
                <input className="form-input setup-input" type="date" value={newYear.start_date} onChange={e => setNewYear(p=>({...p,start_date:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: '#475569', fontWeight: 600 }}>End Date</label>
                <input className="form-input setup-input" type="date" value={newYear.end_date} onChange={e => setNewYear(p=>({...p,end_date:e.target.value}))} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#475569' }}>
                  <input type="checkbox" checked={newYear.is_current} onChange={e => setNewYear(p=>({...p,is_current:e.target.checked}))} style={{accentColor:'#2563eb'}} />
                  Set as Current
                </label>
                <button className="btn-primary" onClick={saveYear} disabled={addingYear}>{addingYear?'Adding…':'Add Year'}</button>
              </div>
            </div>
          </div>

          {/* Years Table */}
          <div style={{ background:'#fff', border:'1px solid #dde6f5', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', background:'#f1f5fd', borderBottom:'1px solid #dde6f5' }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#475569' }}>Financial Years ({years.length})</span>
            </div>
            {years.length === 0 ? (
              <div style={{ padding:48, textAlign:'center', color:'#94a3b8' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
                <div style={{ fontSize:14 }}>No financial years yet. Add one above.</div>
              </div>
            ) : (
              <table className="data-grid light-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Year Label</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th style={{ textAlign:'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map(yr => (
                    <tr key={yr.id}>
                      <td style={{ fontWeight:700, color:'#0f172a' }}>{yr.year_label}</td>
                      <td style={{ color:'#475569' }}>{yr.start_date}</td>
                      <td style={{ color:'#475569' }}>{yr.end_date}</td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          {yr.is_current && <span className="badge badge-green">Current</span>}
                          {yr.is_locked  && <span className="badge badge-red">Locked</span>}
                          {!yr.is_current && !yr.is_locked && <span className="badge badge-blue">Open</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                          {!yr.is_current && (
                            <button className="btn-ghost" style={{ padding:'5px 12px', fontSize:12, color: '#475569' }} onClick={() => setCurrent(yr)}>Set Current</button>
                          )}
                          <button className="btn-ghost" style={{ padding:'5px 12px', fontSize:12, color: yr.is_locked?'#059669':'#f59e0b' }} onClick={() => toggleLock(yr)}>
                            {yr.is_locked ? '🔓 Unlock' : '🔒 Lock'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
