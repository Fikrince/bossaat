"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Business = {id:string;name:string;category:string;district:string;status:string};
type Offer = {id:string;title:string;district:string;status:string;businesses?:{name?:string;status?:string}};
type Reservation = {id:string;customer_name:string;customer_phone:string;status:string;offers?:{title?:string}};\ntype SupportMessage = {id:string;user_id:string;subject:string;category:string;message:string;status:string;created_at:string};
export default function AdminPage(){
 const router=useRouter();
 const [businesses,setBusinesses]=useState<Business[]>([]);
 const [offers,setOffers]=useState<Offer[]>([]);
 const [reservations,setReservations]=useState<Reservation[]>([]);\n const [supportMessages,setSupportMessages]=useState<SupportMessage[]>([]);
 const [message,setMessage]=useState("Yönetici kontrolü yapılıyor…");
 const [loading,setLoading]=useState(true);
 async function load(){
  if(!supabase){setMessage("Veritabanı bağlantısı yapılandırılmadı.");setLoading(false);return;}
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){router.replace("/giris?next=%2Fadmin");return;}
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(profile?.role!=="admin"){setMessage("Bu sayfa yalnızca yönetici hesabına açıktır.");setLoading(false);return;}
  const [b,o,r]=await Promise.all([
   supabase.from("businesses").select("id,name,category,district,status").order("created_at",{ascending:false}),
   supabase.from("offers").select("id,title,district,status,businesses(name,status)").order("created_at",{ascending:false}),
   supabase.from("reservations").select("id,customer_name,customer_phone,status,offers(title)").order("created_at",{ascending:false})
  ]);
  setBusinesses((b.data||[]) as Business[]);setOffers((o.data||[]) as Offer[]);setReservations((r.data||[]) as Reservation[]);
  const err=b.error||o.error||r.error;setMessage(err?"Bazı yönetim kayıtları yüklenemedi: "+err.message:"Yönetim verileri güncel.");
  setLoading(false);
 }
 useEffect(()=>{load();},[]);
 async function updateBusiness(id:string,status:"approved"|"rejected"|"suspended"){
  if(!supabase)return;const {error}=await supabase.from("businesses").update({status}).eq("id",id);
  setMessage(error?"İşletme güncellenemedi: "+error.message:"İşletme durumu güncellendi.");if(!error)await load();
 }
 async function updateOffer(id:string,status:"published"|"paused"){
  if(!supabase)return;const {error}=await supabase.from("offers").update({status}).eq("id",id);
  setMessage(error?"Fırsat güncellenemedi: "+error.message:"Fırsat durumu güncellendi.");if(!error)await load();
 }
 async function updateReservation(id:string,status:"approved"|"rejected"|"completed"){
  if(!supabase)return;
  const current=reservations.find(r=>r.id===id);
  const allowed=current?.status==="pending"?(status==="approved"||status==="rejected"):current?.status==="approved"&&status==="completed";
  if(!current||!allowed){setMessage("Rezervasyonun mevcut durumundan bu işleme izin verilmiyor.");return;}
  const {error}=await supabase.from("reservations").update({status}).eq("id",id).eq("status",current.status);
  setMessage(error?"Rezervasyon güncellenemedi: "+error.message:"Rezervasyon durumu güncellendi.");if(!error)await load();
 }
 async function logout(){await supabase?.auth.signOut();router.push("/");}
 return <main className="dashboard"><header className="dash-nav"><Link className="brand" href="/"><span className="brand-mark">B</span><span>BOŞSAAT<small>YÖNETİM PANELİ</small></span></Link><button className="quiet-btn" onClick={logout}>Çıkış yap</button></header><section className="dash-content"><span className="eyebrow dark">PLATFORM YÖNETİMİ</span><h1>Yönetici paneli</h1><p>İşletmeleri, fırsatları ve rezervasyonları yönet.</p><div className="status-strip">{message}</div>
 {loading?<p>Yükleniyor…</p>:message.includes("yalnızca yönetici")?<p>Yönetici yetkisi bulunamadı. Normal kullanıcı hesapları bu alanı göremez.</p>:<>
 <h2>İşletme başvuruları ({businesses.length})</h2>{businesses.length?businesses.map(b=><div className="admin-row" key={b.id}><div><b>{b.name}</b><span>{b.category} · {b.district} · {b.status}</span></div><div className="admin-actions">{b.status==="pending"?<><button onClick={()=>updateBusiness(b.id,"approved")}>Onayla</button><button onClick={()=>updateBusiness(b.id,"rejected")}>Reddet</button></>:b.status==="approved"?<><span className="status-approved">Onaylandı</span><button onClick={()=>updateBusiness(b.id,"suspended")}>Askıya al</button></>:b.status==="suspended"?<><span className="status-suspended">Askıya alındı</span><button onClick={()=>updateBusiness(b.id,"approved")}>Yeniden etkinleştir</button></>:<span className="status-rejected">Reddedildi</span>}</div></div>):<div className="empty">İşletme kaydı yok.</div>}
 <h2>Fırsatlar ({offers.length})</h2>{offers.length?offers.map(o=><div className="admin-row" key={o.id}><div><b>{o.title}</b><span>{o.businesses?.name||"İşletme"} · {o.district} · {o.status}</span></div><div className="admin-actions"><button onClick={()=>updateOffer(o.id,"published")}>Yayınla</button><button onClick={()=>updateOffer(o.id,"paused")}>Durdur</button></div></div>):<div className="empty">Fırsat yok.</div>}
 <h2>Destek ve şikâyet mesajları ({supportMessages.length})</h2>{supportMessages.length?supportMessages.map(s=><div className="admin-row" key={s.id}><div><b>{s.subject} · {s.category==="complaint"?"Şikâyet":s.category==="suggestion"?"Öneri":s.category==="support"?"Destek":"Diğer"}</b><span>{s.message}</span><span>Kullanıcı: {s.user_id} · {new Date(s.created_at).toLocaleString("tr-TR")} · {s.status}</span></div></div>):<div className="empty">Yeni destek veya şikâyet mesajı yok.</div>}\n <h2>Rezervasyonlar ({reservations.length})</h2>{reservations.length?reservations.map(r=><div className="admin-row" key={r.id}><div><b>{r.offers?.title||"Rezervasyon"}</b><span>{r.customer_name} · {r.customer_phone} · {r.status}</span></div><div className="admin-actions">{r.status==="pending"?<><button onClick={()=>updateReservation(r.id,"approved")}>Onayla</button><button onClick={()=>updateReservation(r.id,"rejected")}>Reddet</button></>:r.status==="approved"?<button onClick={()=>updateReservation(r.id,"completed")}>Tamamlandı</button>:<span>{r.status==="rejected"?"Reddedildi":r.status==="completed"?"Tamamlandı":r.status==="cancelled"?"İptal edildi":r.status}</span>}</div></div>):<div className="empty">Rezervasyon yok.</div>}
 </>}
 </section></main>;
}
