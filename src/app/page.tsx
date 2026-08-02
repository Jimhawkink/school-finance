'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard');
      else router.replace('/login');
    });
  }, [router]);
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'linear-gradient(135deg,#f0f5ff,#e8f0fe)', fontFamily:"'Inter',sans-serif", gap:16 }}>
      <div style={{ width:56, height:56, background:'linear-gradient(135deg,#2563eb,#7c3aed)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>🏫</div>
      <div style={{ width:36, height:36, border:'3px solid #2563eb', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:14, color:'#475569', fontWeight:500 }}>Loading SchoolFinance Pro…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
