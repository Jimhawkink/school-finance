'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const t = toast.loading('Signing in…');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message, { id: t }); setLoading(false); return; }
    toast.success('Welcome back!', { id: t });
    router.replace('/dashboard');
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#f0f5ff 0%,#e8f0fe 50%,#f5f0ff 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:"'Inter',sans-serif", position:'relative', overflow:'hidden' }}>
      {/* Background decorations */}
      <div style={{ position:'absolute', top:-120, right:-120, width:500, height:500, background:'radial-gradient(circle,rgba(37,99,235,0.07) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-100, left:-100, width:400, height:400, background:'radial-gradient(circle,rgba(124,58,237,0.06) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:440, position:'relative', zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ width:64, height:64, background:'linear-gradient(135deg,#2563eb,#7c3aed)', borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 20px', boxShadow:'0 12px 32px rgba(37,99,235,0.35)' }}>🏫</div>
          <h1 style={{ fontSize:28, fontWeight:900, color:'#0f172a', letterSpacing:'-0.5px', marginBottom:8 }}>SchoolFinance Pro</h1>
          <p style={{ color:'#64748b', fontSize:14 }}>Secondary School Financial Management System</p>
        </div>

        {/* Card */}
        <div style={{ background:'#fff', borderRadius:24, padding:'36px 40px', boxShadow:'0 20px 60px rgba(0,0,0,0.1)', border:'1px solid #e2e8f0' }}>
          <h2 style={{ fontSize:20, fontWeight:800, color:'#0f172a', marginBottom:6 }}>Sign In</h2>
          <p style={{ fontSize:13, color:'#64748b', marginBottom:28 }}>Enter your credentials to access the system</p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>EMAIL ADDRESS</label>
              <div style={{ position:'relative' }}>
                <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@school.ac.ke"
                  style={{ width:'100%', background:'#f8fafc', border:'2px solid #e2e8f0', borderRadius:10, padding:'12px 14px 12px 44px', fontSize:14, color:'#0f172a', outline:'none', transition:'all 0.2s', fontFamily:"'Inter',sans-serif" }}
                  onFocus={e=>{(e.target as HTMLInputElement).style.borderColor='#2563eb';(e.target as HTMLInputElement).style.background='#eff6ff';(e.target as HTMLInputElement).style.boxShadow='0 0 0 3px rgba(37,99,235,0.1)';}}
                  onBlur={e=>{(e.target as HTMLInputElement).style.borderColor='#e2e8f0';(e.target as HTMLInputElement).style.background='#f8fafc';(e.target as HTMLInputElement).style.boxShadow='none';}} />
              </div>
            </div>

            <div style={{ marginBottom:28 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>PASSWORD</label>
              <div style={{ position:'relative' }}>
                <div style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                </div>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                  style={{ width:'100%', background:'#f8fafc', border:'2px solid #e2e8f0', borderRadius:10, padding:'12px 44px 12px 44px', fontSize:14, color:'#0f172a', outline:'none', transition:'all 0.2s', fontFamily:"'Inter',sans-serif" }}
                  onFocus={e=>{(e.target as HTMLInputElement).style.borderColor='#2563eb';(e.target as HTMLInputElement).style.background='#eff6ff';(e.target as HTMLInputElement).style.boxShadow='0 0 0 3px rgba(37,99,235,0.1)';}}
                  onBlur={e=>{(e.target as HTMLInputElement).style.borderColor='#e2e8f0';(e.target as HTMLInputElement).style.background='#f8fafc';(e.target as HTMLInputElement).style.boxShadow='none';}} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:0 }}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'13px', fontSize:15, borderRadius:12 }}>
              {loading ? (
                <><span style={{ width:18,height:18,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.8s linear infinite',display:'inline-block' }} /> Signing in…</>
              ) : '→ Sign In'}
            </button>
          </form>
        </div>

        <div style={{ textAlign:'center', marginTop:24, fontSize:12, color:'#94a3b8' }}>
          SchoolFinance Pro © 2026 — Kenya Secondary Schools
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
