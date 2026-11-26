"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Business={id:string;name:string;status:string};
type Offer={id:string;title:string;starts_at:string;offer_price:number;status:string};
type RequestRow={id:string;customer_name:string;customer_phone:string;status:string;offers?:{title?:string}};
export default function BusinessPage(){
 const router=useRouter();
 const [businesses,setBusinesses]=useState<Business[]>([]);
 const [offers,setOffers]=useState<Offer[]>([]);
 const [requests,setRequests]=useState<RequestRow[]>([]);
 const [businessId,setBusinessId]=useState("");
 const [title,setTitle]=useState(""); const [category,setCategory]=useState("Kuaför"); const [district,setDistrict]=useState(""); const [description,setDescription]=useState(""); const [startsAt,setStartsAt]=useState(""); const [original,setOriginal]=useState(""); const [price,setPrice]=useState("");
 const [message,setMessage]=useState("Yükleniyor…");
 async function load(){
  if(!supabase){setMessage("Veritabanı bağlantısı henüz yapılandırılmadı.");return;}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){router.replace("/giris");return;}
  const {data:bs,error}=await supabase.from("businesses").select("id,name,status").eq("owner_id",session.user.id);
  if(error){setMessage("İşletmeler yüklenemedi: "+error.message);return;}
  const list=(bs||[]) as Business[];setBusinesses(list);
  if(list.length){setBusinessId(list[0].id);const ids=list.map(x=>x.id);
   const {data:os}=await supabase.from("offers").select("id,title,starts_at,offer_price,status").in("business_id",ids).order("created_at",{ascending:false});setOffers((os||[]) as Offer[]);
   const {data:rs}=await supabase.from("reservations").select("id,customer_name,customer_phone,status,offers(title,business_id)").order("created_at",{ascending:false});
   setRequests(((rs||[]) as any[]).filter(r=>ids.includes(r.offers?.business_id)) as RequestRow[]);
  }else setMessage("Henüz işletme kaydın yok. Önce işletmeni kaydet.");
 }
 useEffect(()=>{load();},[]);
 async function publish(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase||!businessId)return;
  const originalNum=Number(original),priceNum=Number(price);
  if(!startsAt||!Number.isFinite(originalNum)||!Number.isFinite(priceNum)||priceNum>originalNum){setMessage("Fiyat ve tarih bilgilerini kontrol et.");return;}
  const b=businesses.find(x=>x.id===businessId);if(!b)return;
  const {error}=await supabase.from("offers").insert({business_id:businessId,title,category,district:district||"",description,starts_at:new Date(startsAt).toISOString(),original_price:originalNum,offer_price:priceNum,status:b.status==="approved"?"published":"draft"});
  if(error)setMessage("Fırsat kaydedilemedi: "+error.message);
  else{setMessage(b.status==="approved"?"Fırsatın yayınlandı.":"İşletmen onaylanana kadar fırsat taslak olarak kaydedildi.");setTitle("");setDescription("");setOriginal("");setPrice("");await load();}
 }
 async function setStatus(id:string,status:"approved"|"rejected"){
  if(!supabase)return;const {error}=await supabase.from("reservations").update({status}).eq("id",id);
  if(error)setMessage("Talep güncellenemedi: "+error.message);else{setMessage("Rezervasyon talebi güncellendi.");await load();}
 }
 async function logout(){await supabase?.auth.signOut();router.push("/");}
 return <main className="dashboard"><header className="dash-nav"><Link className="brand" href="/"><span className="brand-mark">B</span><span>BOŞSAAT<small>İŞLETME PANELİ</small></span></Link><button className="quiet-btn" onClick={logout}>Çıkış yap</button></header><section className="dash-content"><span className="eyebrow dark">İŞLETME YÖNETİMİ</span><h1>İşletme paneli</h1><p>Boş saatlerini fırsata dönüştür, rezervasyon taleplerini yönet.</p>{message&&<div className="status-strip">{message}</div>}
 <h2>Yeni fırsat yayınla</h2><form className="offer-form" onSubmit={publish}>
 <label>İşletme<select required value={businessId} onChange={e=>setBusinessId(e.target.value)}>{businesses.map(b=><option key={b.id} value={b.id}>{b.name} · {b.status==="approved"?"Onaylı":"Onay bekliyor"}</option>)}</select></label>
 <label>Hizmet başlığı<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Saç kesimi ve fön"/></label>
 <label>Kategori<select value={category} onChange={e=>setCategory(e.target.value)}><option>Kuaför</option><option>Berber</option><option>Güzellik</option><option>Bakım</option><option>Diğer</option></select></label>
 <label>İlçe<input required value={district} onChange={e=>setDistrict(e.target.value)}/></label>
 <label>Randevu başlangıcı<input required type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)}/></label>
 <label>Normal fiyat (₺)<input required type="number" min="0" step="0.01" value={original} onChange={e=>setOriginal(e.target.value)}/></label>
 <label>İndirimli fiyat (₺)<input required type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></label>
 <label>Açıklama<textarea value={description} onChange={e=>setDescription(e.target.value)}/></label>
 <button className="submit-btn" disabled={!businesses.length}>Fırsatı kaydet</button></form>
 <h2>Yayınladığım fırsatlar</h2>{offers.length?offers.map(o=><div className="admin-row" key={o.id}><div><b>{o.title}</b><span>{new Date(o.starts_at).toLocaleString("tr-TR")} · {o.offer_price} ₺ · {o.status}</span></div></div>):<div className="empty">Henüz fırsatın yok.</div>}
 <h2 style={{marginTop:36}}>Rezervasyon talepleri</h2>{requests.length?requests.map(r=><div className="admin-row" key={r.id}><div><b>{r.offers?.title||"Randevu talebi"}</b><span>{r.customer_name} · {r.customer_phone} · {r.status}</span></div><div className="admin-actions"><button onClick={()=>setStatus(r.id,"approved")}>Onayla</button><button onClick={()=>setStatus(r.id,"rejected")}>Reddet</button></div></div>):<div className="empty">Henüz rezervasyon talebi yok.</div>}
 </section></main>;
}
