"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SifreYenilePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setMessage("Hesap sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar dene.");
      setChecking(false);
      return;
    }

    let alive = true;
    let confirmed = false;
    let subscription: { unsubscribe: () => void } | null = null;
    let fallbackTimer: ReturnType<typeof window.setTimeout> | null = null;

    const finish = (ok: boolean, errorMessage?: string) => {
      if (!alive || confirmed) return;
      confirmed = true;
      setRecoveryReady(ok);
      setChecking(false);
      if (!ok) {
        setMessage(errorMessage || "Bu şifre yenileme bağlantısı geçersiz veya süresi dolmuş. Giriş sayfasından yeni bağlantı iste.");
      } else {
        setMessage("E-posta bağlantın doğrulandı. Şimdi yeni şifreni iki kez girerek kaydedebilirsin.");
      }
    };

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session) {
          finish(false, "E-posta bağlantısı doğrulanamadı veya süresi dolmuş. Giriş sayfasından yeniden şifre bağlantısı iste.");
          return;
        }
        window.history.replaceState({}, document.title, window.location.pathname);
        finish(true);
        return;
      }

      // Supports older Supabase recovery links that return tokens in the URL hash.
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        finish(false, "Şifre yenileme oturumu açılamadı. E-postadaki bağlantı süresi dolmuş olabilir.");
        return;
      }
      if (data.session) {
        finish(true);
        return;
      }

      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) finish(true);
      });
      subscription = listener.subscription;
      // Allow the client to process legacy URL-fragment tokens before showing an error.
      fallbackTimer = window.setTimeout(async () => {
        if (confirmed || !alive) return;
        const { data: latest } = await supabase.auth.getSession();
        finish(Boolean(latest.session));
      }, 900);
    })();

    return () => {
      alive = false;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      subscription?.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !recoveryReady) return;
    if (password.length < 8) {
      setMessage("Şifren en az 8 karakter olmalı.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Girdiğin şifreler birbiriyle aynı değil.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage("Şifre güncellenemedi: " + error.message);
    } else {
      setMessage("Şifren başarıyla güncellendi. Artık yeni şifrenle giriş yapabilirsin.");
      setRecoveryReady(false);
      setCompleted(true);
      await supabase.auth.signOut();
    }
    setBusy(false);
  }

  return <main className="auth-shell"><section className="auth-card">
    <Link className="brand auth-brand" href="/"><span className="brand-mark">B</span><span>BOŞSAAT<small>YEREL FIRSAT AĞI</small></span></Link>
    <span className="eyebrow dark">HESAP GÜVENLİĞİ</span>
    <h1>Yeni şifre belirle.</h1>
    <p>Şifre yenileme bağlantın doğrulandıktan sonra yeni şifreni burada güvenle oluşturabilirsin.</p>
    {checking ? <div className="auth-message" role="status">E-posta bağlantın doğrulanıyor…</div> : recoveryReady ? <form onSubmit={submit}>
      <label>Yeni şifre (en az 8 karakter)<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" /></label>
      <label>Yeni şifreyi tekrar gir<input required minLength={8} type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password" /></label>
      <button className="submit-btn" disabled={busy}>{busy ? "Kaydediliyor…" : "Yeni şifremi kaydet"}</button>
    </form> : null}
    {message && <div className="auth-message" role="status">{message}</div>}
    {!checking && !recoveryReady && <Link className="submit-btn" style={{display:"block",textAlign:"center",marginTop:18}} href="/giris">{completed ? "Yeni şifremle giriş yap" : "Yeni bağlantı iste / Giriş yap"}</Link>}
    <Link className="back-link" href="/giris">← Giriş sayfasına dön</Link>
  </section></main>;
}
