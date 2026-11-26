"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, supabaseReady } from "@/lib/supabase";

export default function GirisPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) { setMessage("Hesap sistemi şu anda yapılandırılamadı."); return; }
    if (mode === "reset") { await sendReset(); return; }
    if (mode === "signup" && password !== confirmPassword) { setMessage("Girdiğin şifreler birbiriyle aynı değil."); return; }
    setBusy(true); setMessage("");
    if (mode === "signup") {
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName, first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim(), role: "customer" } },
      });
      if (error) setMessage("Kayıt tamamlanamadı: " + error.message);
      else if (data.user && data.user.identities?.length === 0) { setMode("login"); setMessage("Bu e-posta adresiyle bir hesap zaten var. Giriş yapmayı dene veya “Şifremi unuttum” bağlantısını kullan."); }
      else if (data.session) router.push("/panel");
      else setMessage("Hesabın oluşturuldu. E-posta doğrulaması gerekiyorsa gelen kutunu ve Spam klasörünü kontrol et. E-posta ulaşmıyorsa platformun e-posta gönderim servisi yapılandırılmalıdır.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setMessage("Giriş yapılamadı: " + error.message);
      else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id || "").maybeSingle();
        router.push(profile?.role === "business" ? "/isletme" : profile?.role === "admin" ? "/admin" : "/panel");
      }
    }
    setBusy(false);
  }

  async function sendReset() {
    if (!supabase) { setMessage("Hesap sistemi şu anda kullanılamıyor."); return; }
    if (!email.trim()) { setMessage("Önce yukarıdaki e-posta alanına kayıtlı e-posta adresini yaz."); return; }
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: "https://bossaat-ferhatcaga-04.vercel.app/sifre-yenile",
    });
    setMessage(error
      ? "Şifre yenileme isteği gönderilemedi: " + error.message
      : "İstek Supabase'e iletildi. E-posta gelmezse bu, adresin kayıtlı olmaması veya e-posta gönderim ayarlarının kısıtlı olması nedeniyle olabilir. Gelen kutusu ve Spam klasörünü kontrol et.");
    setBusy(false);
  }

  return <main className="auth-shell"><section className="auth-card">
    <Link className="brand auth-brand" href="/"><span className="brand-mark">B</span><span>BOŞSAAT<small>YEREL FIRSAT AĞI</small></span></Link>
    <span className="eyebrow dark">BOŞSAAT HESABI</span>
    <h1>{mode === "login" ? "Tekrar hoş geldin." : mode === "signup" ? "Aramıza katıl." : "Şifreni yenile."}</h1>
    <p>{mode === "login" ? "Fırsatlarını ve rezervasyon taleplerini takip et." : mode === "signup" ? "Ücretsiz müşteri hesabını oluştur. Tüm alanları doldur." : "Kayıtlı e-posta adresini yaz. Sana şifre yenileme bağlantısı gönderelim."}</p>
    <form onSubmit={submit}>
      {mode === "signup" && <>
        <label>Ad<input required value={firstName} onChange={e=>setFirstName(e.target.value)} autoComplete="given-name" /></label>
        <label>Soyad<input required value={lastName} onChange={e=>setLastName(e.target.value)} autoComplete="family-name" /></label>
        <label>Telefon numarası<input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel" /></label>
      </>}
      <label>E-posta adresi<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" /></label>
      {mode !== "reset" && <label>Şifre (en az 8 karakter)<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>}
      {mode === "signup" && <label>Şifreyi tekrar gir<input required minLength={8} type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password" /></label>}
      <button className="submit-btn" disabled={busy}>{busy ? "İşleniyor…" : mode === "login" ? "Giriş yap" : mode === "signup" ? "Hesabımı oluştur" : "Şifre yenileme bağlantısı gönder"}</button>
    </form>
    {mode === "login" && <button type="button" onClick={()=>{setMode("reset");setMessage("");setPassword("");}} disabled={busy} style={{display:"block",width:"100%",marginTop:16,padding:"13px 16px",border:"1px solid #18314d",borderRadius:6,background:"#eef3f7",color:"#102139",fontWeight:700,fontSize:14,cursor:"pointer"}}>ŞİFREMİ UNUTTUM</button>}
    {message && <div className="auth-message" role="status">{message}</div>}
    {!supabaseReady && <div className="auth-message">Üyelik sistemi bağlantı ayarı bekliyor.</div>}
    <div className="auth-switch">{mode === "login" ? "Henüz hesabın yok mu?" : mode === "signup" ? "Zaten hesabın var mı?" : "Şifreni hatırladın mı?"} <button type="button" onClick={()=>{setMode(mode === "login" ? "signup" : "login");setMessage("");setPassword("");setConfirmPassword("");}}>{mode === "login" ? "Üye ol" : "Giriş yap"}</button></div>
    <Link className="back-link" href="/">← Ana sayfaya dön</Link>
  </section></main>;
}
