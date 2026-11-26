"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Business = { id:string; name:string; category:string; description:string|null; district:string; address:string|null; phone:string|null; status:string };
export default function BusinessProfilePage() {
  const router = useRouter();
  const [business,setBusiness] = useState<Business|null>(null);
  const [name,setName] = useState("");
  const [category,setCategory] = useState("Kuaför");
  const [description,setDescription] = useState("");
  const [district,setDistrict] = useState("");
  const [address,setAddress] = useState("");
  const [phone,setPhone] = useState("");
  const [message,setMessage] = useState("İşletme bilgileri yükleniyor…");
  const [busy,setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) { setMessage("Veritabanı bağlantısı kullanılamıyor."); return; }
      const { data:{user}, error:authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !user) { router.replace("/giris?next=%2Fisletme%2Fprofil"); return; }
      const { data:profile } = await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
      if (profile?.role !== "business") { router.replace(profile?.role === "admin" ? "/admin" : "/panel"); return; }
      const { data, error } = await supabase.rpc("get_my_business_profile");
      if (!active) return;
      if (error || !data || !data.length) { setMessage(error ? "İşletme bilgileri yüklenemedi: "+error.message : "Henüz işletme kaydın bulunmuyor."); return; }
      const b = data[0] as Business;
      setBusiness(b); setName(b.name); setCategory(b.category); setDescription(b.description||""); setDistrict(b.district); setAddress(b.address||""); setPhone(b.phone||"");
      setMessage(b.status === "approved" ? "İşletme profilin yayında." : "İşletme başvurun yönetici onayı bekliyor.");
    })();
    return () => { active = false; };
  },[router]);

  async function save(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !business) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("businesses").update({
      name:name.trim(), category, description:description.trim(), district:district.trim(),
      address:address.trim(), phone:phone.trim()
    }).eq("id",business.id);
    setBusy(false);
    if (error) setMessage("Profil kaydedilemedi: "+error.message);
    else { setBusiness({...business,name:name.trim(),category,description:description.trim(),district:district.trim(),address:address.trim(),phone:phone.trim()}); setMessage("İşletme profilin başarıyla güncellendi."); }
  }

  return <main className="dashboard">
    <header className="dash-nav"><Link className="brand" href="/"><span className="brand-mark">B</span><span>BOŞSAAT<small>İŞLETME PROFİLİ</small></span></Link><Link className="quiet-btn" href="/isletme">Panele dön</Link></header>
    <section className="dash-content">
      <span className="eyebrow dark">İŞLETME BİLGİLERİ</span><h1>Profilini düzenle.</h1>
      <p>Müşterilerin işletmeni tanıyabilsin. Değişikliklerin işletme onay durumunu değiştirmez.</p>
      {message && <div className="status-strip" role="status">{message}</div>}
      {business && <form className="offer-form" onSubmit={save}>
        <label>İşletme adı<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
        <label>Hizmet kategorisi<select value={category} onChange={e=>setCategory(e.target.value)}><option>Kuaför</option><option>Berber</option><option>Güzellik Salonu</option><option>Bakım</option><option>Diğer</option></select></label>
        <label>İlçe<input required maxLength={80} value={district} onChange={e=>setDistrict(e.target.value)}/></label>
        <label>Telefon<input type="tel" maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
        <label>Adres<input maxLength={250} value={address} onChange={e=>setAddress(e.target.value)}/></label>
        <label>Açıklama<textarea maxLength={700} value={description} onChange={e=>setDescription(e.target.value)}/></label>
        <button className="submit-btn" disabled={busy}>{busy ? "Kaydediliyor…" : "Profil bilgilerini kaydet"}</button>
      </form>}
    </section>
  </main>;
}
