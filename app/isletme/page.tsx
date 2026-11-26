"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Business={id:string;name:string;status:string;image_url:string|null};
type Offer={id:string;title:string;category:string;district:string;description:string|null;starts_at:string;original_price:number;offer_price:number;status:string};
type RequestRow={id:string;customer_name:string;customer_phone:string;status:string;offers?:{title?:string}};
export default function BusinessPage(){
 const router=useRouter();
 const [businesses,setBusinesses]=useState<Business[]>([]);
 const [offers,setOffers]=useState<Offer[]>([]);
 const [requests,setRequests]=useState<RequestRow[]>([]);
 const [businessId,setBusinessId]=useState("");
 const [editingId,setEditingId]=useState("");
 const [title,setTitle]=useState(""); const [category,setCategory]=useState("Kuaför"); const [district,setDistrict]=useState(""); const [description,setDescription]=useState(""); const [startsAt,setStartsAt]=useState(""); const [original,setOriginal]=useState(""); const [price,setPrice]=useState("");
 const [message,setMessage]=useState("Yükleniyor…");
 const [busy,setBusy]=useState(false);\n const [photoBusy,setPhotoBusy]=useState(false);
 async function load(){
  if(!supabase){setMessage("Veritabanı bağlantısı henüz yapılandırılmadı.");return;}
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){router.replace("/giris?next=%2Fisletme");return;}
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(profile?.role==="admin"){router.replace("/admin");return;}
  if(profile?.role!=="business"){router.replace("/panel");return;}
  const {data:bs,error}=await supabase.from("businesses").select("id,name,status,image_url").eq("owner_id",user.id);
  if(error){setMessage("İşletmeler yüklenemedi: "+error.message);return;}
  const list=(bs||[]) as Business[];setBusinesses(list);
  if(list.length){
   const ids=list.map(x=>x.id);
   if(!ids.includes(businessId))setBusinessId(list[0].id);
   const [o,r]=await Promise.all([
    supabase.from("offers").select("id,title,category,district,description,starts_at,original_price,offer_price,status").in("business_id",ids).order("created_at",{ascending:false}),
    supabase.from("reservations").select("id,customer_name,customer_phone,status,offers(title,business_id)").order("created_at",{ascending:false})
   ]);
   if(o.error)setMessage("Fırsatlar yüklenemedi: "+o.error.message);
   setOffers((o.data||[]) as Offer[]);
   if(r.error)setMessage("Rezervasyonlar yüklenemedi: "+r.error.message);
   setRequests(((r.data||[]) as any[]).filter(x=>ids.includes(x.offers?.business_id)) as RequestRow[]);
   if(!error&&!o.error&&!r.error)setMessage(list.some(x=>x.status==="pending")?"İşletme başvurun yönetici onayı bekliyor.":"İşletme panelin güncel.");
  }else setMessage("Henüz işletme kaydın yok. Önce işletmeni kaydet.");
 }
 useEffect(()=>{load();},[]);
 function resetForm(){
  setEditingId("");setTitle("");setCategory("Kuaför");setDistrict("");setDescription("");setStartsAt("");setOriginal("");setPrice("");
 }
 function editOffer(o:Offer){
  setEditingId(o.id);setTitle(o.title);setCategory(o.category);setDistrict(o.district);setDescription(o.description||"");
  const local=new Date(o.starts_at);const offset=local.getTimezoneOffset();setStartsAt(new Date(local.getTime()-offset*60000).toISOString().slice(0,16));
  setOriginal(String(o.original_price));setPrice(String(o.offer_price));
  document.getElementById("offer-form")?.scrollIntoView({behavior:"smooth"});
 }
 async function uploadBusinessPhoto(e:React.ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];e.target.value="";
  if(!file||!supabase||!businessId)return;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setMessage("Lütfen JPG, PNG veya WEBP formatında fotoğraf seç.");return;}
  if(file.size>5*1024*1024){setMessage("Fotoğraf en fazla 5 MB olabilir.");return;}
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setMessage("Fotoğraf yüklemek için tekrar giriş yap.");return;}
  setPhotoBusy(true);setMessage("");
  const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
  const path=user.id+"/"+businessId+"/"+crypto.randomUUID()+"."+ext;
  const {error:uploadError}=await supabase.storage.from("business-photos").upload(path,file,{contentType:file.type,upsert:false});
  if(uploadError){setMessage("Fotoğraf yüklenemedi: "+uploadError.message);setPhotoBusy(false);return;}
  const {data:{publicUrl}}=supabase.storage.from("business-photos").getPublicUrl(path);
  const {error:updateError}=await supabase.from("businesses").update({image_url:publicUrl}).eq("id",businessId);
  if(updateError)setMessage("Fotoğraf yüklendi ancak işletme profiline kaydedilemedi: "+updateError.message);
  else{setBusinesses(prev=>prev.map(b=>b.id===businessId?{...b,image_url:publicUrl}:b));setMessage("İşletme fotoğrafın başarıyla güncellendi.");}
  setPhotoBusy(false);
 }
 async function saveOffer(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase||!businessId)return;
  const originalNum=Number(original),priceNum=Number(price),start=new Date(startsAt);
  if(!startsAt||Number.isNaN(start.getTime())||!Number.isFinite(originalNum)||!Number.isFinite(priceNum)||originalNum<0||priceNum<0||priceNum>originalNum||start<=new Date()){
   setMessage("Tarih gelecekte olmalı. İndirimli fiyat normal fiyattan yüksek olamaz.");return;
  }
  setBusy(true);setMessage("");
  const values={title:title.trim(),category,district:district.trim(),description:description.trim(),starts_at:start.toISOString(),original_price:originalNum,offer_price:priceNum};
  const result=editingId
   ? await supabase.from("offers").update(values).eq("id",editingId)
   : await supabase.from("offers").insert({...values,business_id:businessId,status:businesses.find(b=>b.id===businessId)?.status==="approved"?"published":"draft"});
  if(result.error)setMessage("Fırsat kaydedilemedi: "+result.error.message);
  else{setMessage(editingId?"Fırsat bilgileri güncellendi.":businesses.find(b=>b.id===businessId)?.status==="approved"?"Fırsatın yayınlandı.":"İşletmen onaylanana kadar fırsat taslak olarak kaydedildi.");resetForm();await load();}
  setBusy(false);
 }
 async function updateOfferStatus(id:string,status:"published"|"paused"){
  if(!supabase)return;setBusy(true);
  const {error}=await supabase.from("offers").update({status}).eq("id",id);
  setMessage(error?"Fırsat durumu değiştirilemedi: "+error.message:status==="published"?"Fırsat yeniden yayına alındı.":"Fırsat duraklatıldı.");
  if(!error)await load();setBusy(false);
 }
 async function deleteOffer(id:string){
  if(!supabase||!window.confirm("Bu fırsatı kalıcı olarak silmek istiyor musun?"))return;
  setBusy(true);const {error}=await supabase.from("offers").delete().eq("id",id);
  setMessage(error?"Fırsat silinemedi: "+error.message:"Fırsat silindi.");
  if(!error){if(editingId===id)resetForm();await load();}setBusy(false);
 }
 async function setStatus(id:string,status:"approved"|"rejected"){
  if(!supabase)return;setBusy(true);const {error}=await supabase.from("reservations").update({status}).eq("id",id).eq("status","pending");
  setMessage(error?"Talep güncellenemedi: "+error.message:"Rezervasyon talebi güncellendi.");
  if(!error)await load();setBusy(false);
 }
 async function logout(){await supabase?.auth.signOut();router.replace("/");}
 return <main className="dashboard"><header className="dash-nav"><Link className="brand" href="/"><span className="brand-mark">B</span><span>BOŞSAAT<small>İŞLETME PANELİ</small></span></Link><button className="quiet-btn" onClick={logout}>Çıkış yap</button></header><section className="dash-content"><span className="eyebrow dark">İŞLETME YÖNETİMİ</span><h1>İşletme paneli</h1><p>Boş saatlerini fırsata dönüştür, rezervasyon taleplerini yönet.</p>{message&&<div className="status-strip" role="status">{message}</div>}
 <h2>İşletme fotoğrafı</h2><div className="admin-row"><div style={{width:"100%"}}>{businesses.find(b=>b.id===businessId)?.image_url?<img src={businesses.find(b=>b.id===businessId)?.image_url||""} alt="İşletme fotoğrafı" style={{width:"100%",maxWidth:360,maxHeight:220,objectFit:"cover",borderRadius:12,display:"block",marginBottom:12}}/>:<p>Henüz işletme fotoğrafı eklenmemiş.</p>}<label>Fotoğraf seç (JPG, PNG veya WEBP · en fazla 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadBusinessPhoto} disabled={!businessId||photoBusy}/></label><p>{photoBusy?"Fotoğraf yükleniyor…":"Fotoğrafın müşterilere işletme sayfalarında gösterilir."}</p></div></div>
 <h2 id="offer-form">{editingId?"Fırsatı düzenle":"Yeni fırsat yayınla"}</h2><form className="offer-form" onSubmit={saveOffer}>
 <label>İşletme<select required value={businessId} onChange={e=>setBusinessId(e.target.value)}>{businesses.map(b=><option key={b.id} value={b.id}>{b.name} · {b.status==="approved"?"Onaylı":"Onay bekliyor"}</option>)}</select></label>
 <label>Hizmet başlığı<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Saç kesimi ve fön"/></label>
 <label>Kategori<select value={category} onChange={e=>setCategory(e.target.value)}><option>Kuaför</option><option>Berber</option><option>Güzellik</option><option>Bakım</option><option>Diğer</option></select></label>
 <label>İlçe<input required maxLength={80} value={district} onChange={e=>setDistrict(e.target.value)}/></label>
 <label>Randevu başlangıcı<input required type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)}/></label>
 <label>Normal fiyat (₺)<input required type="number" min="0" step="0.01" value={original} onChange={e=>setOriginal(e.target.value)}/></label>
 <label>İndirimli fiyat (₺)<input required type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></label>
 <label>Açıklama<textarea maxLength={500} value={description} onChange={e=>setDescription(e.target.value)}/></label>
 <button className="submit-btn" disabled={!businesses.length||busy}>{busy?"Kaydediliyor…":editingId?"Değişiklikleri kaydet":"Fırsatı kaydet"}</button>{editingId&&<button type="button" className="quiet-btn" style={{gridColumn:"1/-1",color:"#34465b",borderColor:"#d5dce4"}} onClick={resetForm}>Düzenlemeden vazgeç</button>}</form>
 <h2>Yayınladığım fırsatlar ({offers.length})</h2>{offers.length?offers.map(o=><div className="admin-row" key={o.id}><div><b>{o.title}</b><span>{new Date(o.starts_at).toLocaleString("tr-TR")} · {o.offer_price} ₺ · {o.status}</span></div><div className="admin-actions"><button disabled={busy} onClick={()=>editOffer(o)}>Düzenle</button><button disabled={busy} onClick={()=>updateOfferStatus(o.id,o.status==="published"?"paused":"published")}>{o.status==="published"?"Durdur":"Yayınla"}</button><button disabled={busy} onClick={()=>deleteOffer(o.id)}>Sil</button></div></div>):<div className="empty">Henüz fırsatın yok.</div>}
 <h2 style={{marginTop:36}}>Rezervasyon talepleri ({requests.length})</h2>{requests.length?requests.map(r=><div className="admin-row" key={r.id}><div><b>{r.offers?.title||"Randevu talebi"}</b><span>{r.customer_name} · {r.customer_phone} · {r.status}</span></div><div className="admin-actions">{r.status==="pending"?<><button disabled={busy} onClick={()=>setStatus(r.id,"approved")}>Onayla</button><button disabled={busy} onClick={()=>setStatus(r.id,"rejected")}>Reddet</button></>:<span>İşlem tamamlandı</span>}</div></div>):<div className="empty">Henüz rezervasyon talebi yok.</div>}
 </section></main>;
}
