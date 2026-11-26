"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SifreYenilePage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) { setMessage("Hesap sistemi şu anda kullanılamıyor."); return; }
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    setMessage(error ? error.message : "Şifren başarıyla güncellendi. Giriş sayfasından yeni şifrenle giriş yapabilirsin.");
    setBusy(false);
  }

  return <main className="auth-shell"><section className="auth-card">
    <Link className="brand auth-brand" href="/"><span className="brand-mark">B</span><span>BOŞSAAT<small>YEREL FIRSAT AĞI</small></span></Link>
    <span className="eyebrow dark">HESAP GÜVENLİĞİ</span>
    <h1>Yeni şifre belirle.</h1>
    <p>E-posta ile gelen şifre yenileme bağlantısını açtıktan sonra yeni şifreni burada oluştur.</p>
    <form onSubmit={submit}>
      <label>Yeni şifre<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" /></label>
      <button className="submit-btn" disabled={busy}>{busy ? "Kaydediliyor…" : "Şifremi güncelle"}</button>
    </form>
    {message && <div className="auth-message">{message}</div>}
    <Link className="back-link" href="/giris">← Giriş sayfasına dön</Link>
  </section></main>;
}
