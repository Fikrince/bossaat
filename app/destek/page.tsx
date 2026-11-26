"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SupportPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("support");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const client = supabase;
    if (!client) { setNotice("Veritabanı bağlantısı şu anda kullanılamıyor."); return; }
    let active = true;
    (async () => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) { router.replace("/giris?next=%2Fdestek"); return; }
      if (active) setReady(true);
    })();
    return () => { active = false; };
  }, [router]);
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const client = supabase;
    if (!client) { setNotice("Veritabanı bağlantısı şu anda kullanılamıyor. Lütfen daha sonra tekrar dene."); return; }
    setBusy(true); setNotice("");
    const { data: { user } } = await client.auth.getUser();
    if (!user) { router.replace("/giris?next=%2Fdestek"); return; }
    const { error } = await client.from("support_messages").insert({
      user_id: user.id, subject: subject.trim(), category, message: message.trim()
    });
    setBusy(false);
    if (error) setNotice("Mesaj kaydedilemedi. Lütfen tekrar dene veya e-posta ile ulaş.");
    else {
      let delivery = "Mesajın yönetici paneline kaydedildi.";
      try {
        const notification = await fetch("/api/support-notify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: subject.trim(), category, message: message.trim() })
        });
        if (notification.ok) {
          const result = await notification.json();
          const sent = [];
          if (result.notifications?.email === "sent") sent.push("e-posta bildirimi gönderildi");
          if (result.notifications?.whatsapp === "sent") sent.push("WhatsApp bildirimi gönderildi");
          if (sent.length) delivery += " Ayrıca " + sent.join(" ve ") + ".";
          else delivery += " Otomatik e-posta/WhatsApp bildirimi henüz yapılandırılmadı.";
        } else delivery += " Bildirim servisi şu anda kullanılamıyor.";
      } catch { delivery += " Bildirim servisine ulaşılamadı."; }
      setNotice(delivery); setSubject(""); setMessage("");
    }
  }
  return <main style={{minHeight:"100vh",background:"#f5f7fa",padding:"24px 16px 60px",color:"#172438"}}>
    <div style={{maxWidth:720,margin:"0 auto"}}>
      <Link href="/" style={{color:"#243b55",textDecoration:"none",fontWeight:800}}>← BOŞSAAT ana sayfa</Link>
      <section style={{background:"#fff",border:"1px solid #e4e9ef",borderRadius:20,padding:24,marginTop:22,boxShadow:"0 12px 36px rgba(20,40,60,.06)"}}>
        <div style={{fontSize:12,letterSpacing:2,fontWeight:800,color:"#6a7b90"}}>BOŞSAAT DESTEK</div>
        <h1 style={{fontSize:32,margin:"10px 0"}}>Sana nasıl yardımcı olabiliriz?</h1>
        <p style={{color:"#637287",lineHeight:1.6}}>Şikâyetini, sorunu veya önerini buradan gönder. Mesajın yönetici panelindeki destek kutusuna kaydedilir.</p>
        {!ready ? <p>Hesap kontrol ediliyor…</p> : <form onSubmit={send} style={{display:"grid",gap:14,marginTop:22}}>
          <label style={{display:"grid",gap:7,fontWeight:650}}>Talep türü
            <select value={category} onChange={e=>setCategory(e.target.value)} style={{padding:13,border:"1px solid #d6dee8",borderRadius:10,background:"#fff",fontSize:16}}>
              <option value="support">Destek talebi</option><option value="complaint">Şikâyet</option><option value="suggestion">Öneri</option><option value="other">Diğer</option>
            </select>
          </label>
          <label style={{display:"grid",gap:7,fontWeight:650}}>Konu
            <input required minLength={3} maxLength={120} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Kısaca konuyu yaz" style={{padding:13,border:"1px solid #d6dee8",borderRadius:10,fontSize:16}}/>
          </label>
          <label style={{display:"grid",gap:7,fontWeight:650}}>Mesajın
            <textarea required minLength={10} maxLength={3000} rows={6} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Yaşadığın sorunu ayrıntılı anlat…" style={{padding:13,border:"1px solid #d6dee8",borderRadius:10,fontSize:16,resize:"vertical"}}/>
          </label>
          <button disabled={busy} type="submit" style={{padding:15,border:0,borderRadius:11,background:"#172d46",color:"#fff",fontSize:16,fontWeight:800,opacity:busy ? 0.65 : 1}}>{busy?"Gönderiliyor…":"Mesajı gönder"}</button>
        </form>}
        {notice && <p role="status" style={{background:"#eef5f1",padding:13,borderRadius:10,lineHeight:1.5}}>{notice}</p>}
        <div style={{borderTop:"1px solid #e8edf2",marginTop:24,paddingTop:18,color:"#637287",lineHeight:1.7}}>
          <b style={{color:"#172438"}}>E-posta ile ulaş:</b> <a href="mailto:Ferhatcaga04@gmail.com" style={{color:"#1b5e91"}}>Ferhatcaga04@gmail.com</a><br/><b style={{color:"#172438"}}>WhatsApp:</b> <a href="https://wa.me/905413805904" target="_blank" rel="noreferrer" style={{color:"#1b5e91"}}>0541 380 59 04 üzerinden mesaj gönder</a>
          <p style={{fontSize:13,marginBottom:0}}>Mesaj formunu kullanmak için hesabına giriş yapmalısın. Dilersen doğrudan e-posta veya WhatsApp üzerinden de yazabilirsin.</p>
        </div>
      </section>
    </div>
  </main>;
}
