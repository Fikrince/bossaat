"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function BusinessRegisterPage(){
 const router=useRouter();
 const [name,setName]=useState(""); const [category,setCategory]=useState("Kuaför"); const [district,setDistrict]=useState(""); const [phone,setPhone]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault(); if(!supabase){setMessage("İşletme kayıt sistemi henüz yapılandırılmadı.");return;}
  setBusy(true);setMessage("");
  const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name,phone,role:"business"}}});
  if(error){setMessage(error.message);setBusy(false);return;}
  if(data.user){
   if(data.session){
    const {error:dbError}=await supabase.from("businesses").insert({owner_id:data.user.id,name,category,district,phone,status:"pending"});
    if(dbError)setMessage("Hesap açıldı ancak işletme kaydı tamamlanamadı: "+dbError.message);
    else router.push("/isletme");
   }else setMessage("Hesap oluşturuldu. E-posta doğrulamasını tamamlayıp giriş yaptıktan sonra işletme kaydını tamamla.");
  }
  setBusy(false);
 }
 return <main className="auth-shell"><section className="auth-card wide"><Link className="brand auth-brand" href="/"><span className="brand-mark">B</span><span>BOŞSAAT<small>İŞLETME KAYDI</small></span></Link><span className="eyebrow dark">İŞLETMENİ BOŞSAAT'E EKLE</span><h1>Boş saatlerin kazanca dönüşsün.</h1><p>İşletme hesabını oluştur. Kaydın yönetim onayından sonra yayına alınır.</p><form onSubmit={submit}>
 <label>İşletme adı<input required value={name} onChange={e=>setName(e.target.value)} /></label>
 <label>Hizmet kategorisi<select value={category} onChange={e=>setCategory(e.target.value)}><option>Kuaför</option><option>Berber</option><option>Güzellik Salonu</option><option>Bakım</option><option>Diğer</option></select></label>
 <label>İlçe<input required value={district} onChange={e=>setDistrict(e.target.value)} placeholder="Örn. Kadıköy" /></label>
 <label>Telefon<input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} /></label>
 <label>E-posta<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
 <label>Şifre<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
 <button className="submit-btn" disabled={busy}>{busy?"Kaydediliyor…":"İşletme hesabı oluştur"}</button>
 </form>{message&&<div className="auth-message">{message}</div>}<Link className="back-link" href="/">← Ana sayfaya dön</Link></section></main>;
}
