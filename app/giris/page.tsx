"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, supabaseReady } from "@/lib/supabase";

export default function GirisPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) {
      setMessage("Hesap sistemi henüz yapılandırılmadı. Supabase bağlantı bilgileri gerekli.");
      return;
    }
    setBusy(true); setMessage("");
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, role: "customer" } } });
      setMessage(error ? error.message : "Kayıt isteğin alındı. E-posta doğrulaması gerekiyorsa gelen kutunu kontrol et.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id || "").maybeSingle();
        router.push(profile?.role === "business" ? "/isletme" : profile?.role === "admin" ? "/admin" : "/panel");
      }
    }
    setBusy(false);
  }

  return <main className="auth-shell"><section className="auth-card">
    <Link className="brand auth-brand" href="/"><span className="brand-mark">B</span><span>BOŞSAAT<small>YEREL FIRSAT AĞI</small></span></Link>
    <span className="eyebrow dark">BOŞSAAT HESABI</span><h1>{mode === "login" ? "Tekrar hoş geldin." : "Aramıza katıl."}</h1>
    <p>{mode === "login" ? "Fırsatlarını ve rezervasyon taleplerini takip et." : "İndirimli randevu fırsatlarını keşfetmek için ücretsiz hesap oluştur."}</p>
    <form onSubmit={submit}>
      {mode === "signup" && <label>Ad soyad<input required value={name} onChange={e=>setName(e.target.value)} autoComplete="name" /></label>}
      <label>E-posta<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /></label>
      <label>Şifre<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
      <button className="submit-btn" disabled={busy}>{busy ? "İşleniyor…" : mode === "login" ? "Giriş yap" : "Hesap oluştur"}</button>
    </form>
    {message && <div className="auth-message">{message}</div>}
    {!supabaseReady && <div className="auth-message">Not: Canlı üyelik için Supabase URL ve anonim anahtarının Vercel'e eklenmesi gerekiyor.</div>}
    <div className="auth-switch">{mode === "login" ? "Henüz hesabın yok mu?" : "Zaten hesabın var mı?"} <button type="button" onClick={()=>{setMode(mode === "login" ? "signup" : "login");setMessage("");}}>{mode === "login" ? "Üye ol" : "Giriş yap"}</button></div>
    <Link className="back-link" href="/">← Ana sayfaya dön</Link>
  </section></main>;
}
