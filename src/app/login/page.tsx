'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Welcome back!');
      router.push('/dashboard');
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#070b14', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', position:'relative', overflow:'hidden' }}>
      {/* Animated background orbs */}
      <div style={{ position:'absolute', width:600, height:600, background:'radial-gradient(circle, rgba(79,126,248,0.12) 0%, transparent 70%)', top:-100, left:-100, borderRadius:'50%', animation:'float 8s ease-in-out infinite' }} />
      <div style={{ position:'absolute', width:500, height:500, background:'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', bottom:-100, right:-100, borderRadius:'50%', animation:'float 10s ease-in-out infinite reverse' }} />

      <div style={{ width:'100%', maxWidth:460, position:'relative', zIndex:1 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ width:72, height:72, background:'linear-gradient(135deg, #4f7ef8, #8b5cf6)', borderRadius:20, display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:16, boxShadow:'0 20px 60px rgba(79,126,248,0.4)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h1 style={{ fontSize:28, fontWeight:800, color:'#e8edf8', letterSpacing:'-0.5px' }}>SchoolFinance Pro</h1>
          <p style={{ color:'#7a90b8', fontSize:14, marginTop:6 }}>Secondary School Financial Management System</p>
        </div>

        {/* Card */}
        <div style={{ background:'rgba(13,21,38,0.9)', border:'1px solid #1e2d4a', borderRadius:24, padding:36, backdropFilter:'blur(20px)', boxShadow:'0 40px 100px rgba(0,0,0,0.5)' }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#e8edf8', marginBottom:6 }}>Sign In</h2>
          <p style={{ color:'#7a90b8', fontSize:13, marginBottom:28 }}>Enter your credentials to access the system</p>

          <form onSubmit={handleLogin}>
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#4a5f82' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
                  </span>
                  <input className="form-input" type="email" placeholder="admin@school.ac.ke" value={email} onChange={e=>setEmail(e.target.value)} style={{ paddingLeft:42 }} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#4a5f82' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  </span>
                  <input className="form-input" type={showPw?'text':'password'} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} style={{ paddingLeft:42, paddingRight:42 }} required />
                  <button type="button" onClick={()=>setShowPw(!showPw)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#4a5f82', cursor:'pointer', padding:0 }}>
                    {showPw
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'13px', fontSize:'15px', marginTop:8 }}>
                {loading ? (
                  <><span style={{ width:18, height:18, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }} /> Signing in...</>
                ) : (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg> Sign In</>
                )}
              </button>
            </div>
          </form>
        </div>

        <p style={{ textAlign:'center', color:'#4a5f82', fontSize:12, marginTop:24 }}>
          SchoolFinance Pro © {new Date().getFullYear()} — Kenya Secondary Schools
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}`}</style>
    </div>
  );
}
