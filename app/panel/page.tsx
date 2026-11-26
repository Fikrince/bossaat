"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, supabaseReady } from "@/lib/supabase";

type Reservation = { id:string; status:string; created_at:string; offers?:{title?:string; businesses?:{name?:string}} };
export default function PanelPage() {
  const router=useRouter();
  const [rows,setRows]=useState<Reservation[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [busyId,setBusyId]=useState("");
  async function loadReservations(userId:string) {
    if(!supabase)return;
    const {data,error}=await supabase.from("reservations").select("id,status,created_at,offers(title,businesses(name))").eq("customer_id",userId).order("created_at",{ascending:false});
    setRows((data||[]) as Reservation[]);
    if(error)setMessage("Rezervasyonlar yüklenemedi: "+error.message);
    setLoading(false);
  }
  useEffect(()=>{
    if(!supabase){setLoading(false);return;}
    let active=true;
    (async()=>{
      const {data:{user},error}=await supabase.auth.getUser();
      if(!active)return;
      if(error||!user){router.replace("/giris?next=%2Fpanel");return;}
      await loadReservations(user.id);
    })();
    const {data:listener}=supabase.auth.onAuthStateChange((event)=>{
      if(event==="SIGNED_OUT")router.replace("/giris?next=%2Fpanel");
    });
    return()=>{active=false;listener.subscription.unsubscribe();};
  },[router]);
  async function cancelReservation(id:string){
    if(!supabase)return;
    setBusyId(id);setMessage("");
    const {error}=await supabase.from("reservations").update({status:"cancelled"}).eq("id",id).eq("status","pending");
    if(error)setMessage(error.message.includes("duplicate")?"Bu randevu için başka bir talep zaten etkin.": "Talep iptal edilemedi: "+error.message);
    else {
      const {data:{user}}=await supabase.auth.getUser();
      if(user)await loadReservations(user.id);
      setMessage("Bekleyen rezervasyon talebin iptal edildi.");
    }
    setBusyId("");
  }
  async function logout(){await supabase?.auth.signOut();router.replace("/");}
  return <main className="dashboard"><header className="dash-nav"><Link className="brand" href="/"><span className="brand-mark">B</span><span>BOŞSAAT<small>YEREL FIRSAT AĞI</small></span></Link><button className="quiet-btn" onClick={logout}>Çıkış yap</button></header><section className="dash-content"><span className="eyebrow dark">MÜŞTERİ PANELİ</span><h1>Rezervasyon panelin.</h1><p>Rezervasyon taleplerini buradan takip edebilirsin.</p><div className="dash-actions"><Link className="dash-tile" href="/#firsatlar"><b>Fırsatları keşfet</b><span>Yakınındaki boş saatleri görüntüle →</span></Link><Link className="dash-tile" href="/isletme-kayit"><b>İşletmem var</b><span>İşletmeni BOŞSAAT'e ekle →</span></Link></div><h2>Rezervasyonlarım</h2>{message&&<div className="status-strip" role="status">{message}</div>}{loading?<p>Yükleniyor…</p>:!supabaseReady?<p>Veritabanı bağlantısı kurulmadı.</p>:rows.length===0?<div className="empty">Henüz rezervasyon talebin yok.</div>:<div className="table-wrap"><table><thead><tr><th>Fırsat</th><th>İşletme</th><th>Durum</th><th>Tarih</th><th>İşlem</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.offers?.title||"Fırsat"}</td><td>{r.offers?.businesses?.name||"İşletme"}</td><td>{r.status==="pending"?"Onay bekliyor":r.status==="approved"?"Onaylandı":r.status==="rejected"?"Reddedildi":r.status==="cancelled"?"İptal edildi":r.status==="completed"?"Tamamlandı":r.status}</td><td>{new Date(r.created_at).toLocaleDateString("tr-TR")}</td><td>{r.status==="pending"?<button className="quiet-btn" disabled={busyId===r.id} onClick={()=>cancelReservation(r.id)}>{busyId===r.id?"İptal ediliyor…":"Talebi iptal et"}</button>:"—"}</td></tr>)}</tbody></table></div>}</section></main>;
}
