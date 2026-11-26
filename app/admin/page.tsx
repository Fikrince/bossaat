"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Business = {id:string;name:string;category:string;district:string;status:string;image_url:string|null};
type Offer = {id:string;title:string;district:string;status:string;businesses?:{name?:string;status?:string}};
type Reservation = {id:string;customer_name:string;customer_phone:string;status:string;offers?:{title?:string}};
type SupportMessage = {id:string;user_id:string;subject:string;category:string;message:string;status:string;created_at:string};
export default function AdminPage(){
 const router=useRouter();
 const [businesses,setBusinesses]=useState<Business[]>([]);
 const [offers,setOffers]=useState<Offer[]>([]);
 const [reservations,setReservations]=useState<Reservation[]>([]);
 const [supportMessages,setSupportMessages]=useState<SupportMessage[]>([]);
 const [message,setMessage]=useState("Yönetici kontrolü yapılıyor…");
 const [loading,setLoading]=useState(true);
 const [photoBusyId,setPhotoBusyId]=useState("");
 async function load(){
  if(!supabase){setMessage("Veritabanı bağlantısı yapılandırılmadı.");setLoading(false);return;}
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){router.replace("/giris?next=%2Fadmin");return;}
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(profile?.role!=="admin"){setMessage("Bu sayfa yalnızca yönetici hesabına açıktır.");setLoading(false);return;}
  const [b,o,r,s]=await Promise.all([
   supabase.from("businesses").select("id,name,category,district,status,image_url").order("created_at",{ascending:false}),
   supabase.from("offers").select("id,title,district,status,businesses(name,status)").order("created_at",{ascending:false}),
   supabase.from("reservations").select("id,customer_name,customer_phone,status,offers(title)").order("created_at",{ascending:false}),
   supabase.from("support_messages").select("id,user_id,subject,category,message,status,created_at").order("created_at",{ascending:false})
  ]);
  setBusinesses((b.data||[]) as Business[]);setOffers((o.data||[]) as Offer[]);setReservations((r.data||[]) as Reservation[]);setSupportMessages((s.data||[]) as SupportMessage[]);
  const err=b.error||o.error||r.error||s.error;setMessage(err?"Bazı yönetim kayıtları yüklenemedi: "+err.message:"Yönetim verileri güncel.");
  setLoading(false);
 }
 useEffect(()=>{load();},[]);
 function photoPath(url:string|null){
  if(!url)return null;
  const marker="/storage/v1/object/public/business-photos/";
  const index=url.indexOf(marker);
  return index<0?null:decodeURIComponent(url.slice(index+marker.length).split("?")[0]);
 }
 async function uploadBusinessPhoto(b:Business,file:File){
  if(!supabase)return;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setMessage("Fotoğraf JPG, PNG veya WEBP olmalı.");return;}
  if(file.size>5*1024*1024){setMessage("Fotoğraf en fazla 5 MB olabilir.");return;}
  setPhotoBusyId(b.id);setMessage("");
  let newPath="";
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(authError||!user)throw new Error("Fotoğraf değiştirmek için tekrar giriş yap.");
   const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
   newPath=user.id+"/"+b.id+"/"+crypto.randomUUID()+"."+ext;
   const {error:uploadError}=await supabase.storage.from("business-photos").upload(newPath,file,{contentType:file.type,upsert:false});
   if(uploadError)throw uploadError;
   const publicUrl=supabase.storage.from("business-photos").getPublicUrl(newPath).data.publicUrl;
   const {error:updateError}=await supabase.from("businesses").update({image_url:publicUrl}).eq("id",b.id);
   if(updateError)throw updateError;
   const oldPath=photoPath(b.image_url);
   if(oldPath)await supabase.storage.from("business-photos").remove([oldPath]);
   setMessage("İşletme fotoğrafı yönetici tarafından güncellendi.");
   await load();
  }catch(error){
   if(newPath)await supabase.storage.from("business-photos").remove([newPath]);
   setMessage("Fotoğraf güncellenemedi: "+(error instanceof Error?error.message:"Bilinmeyen hata"));
  }finally{setPhotoBusyId("");}
 }
 async function deleteBusinessPhoto(b:Business){
  if(!supabase||!b.image_url||!window.confirm(b.name+" işletmesinin fotoğrafı silinsin mi?"))return;
  setPhotoBusyId(b.id);setMessage("");
  try{
   const {error}=await supabase.from("businesses").update({image_url:null}).eq("id",b.id);
   if(error)throw error;
   const oldPath=photoPath(b.image_url);
   if(oldPath){const removed=await supabase.storage.from("business-photos").remove([oldPath]);if(removed.error)throw removed.error;}
   setMessage("İşletme fotoğrafı silindi.");
   await load();
  }catch(error){setMessage("Fotoğraf silinemedi: "+(error instanceof Error?error.message:"Bilinmeyen hata"));}
  finally{setPhotoBusyId("");}
 }
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
 <h2>İşletme başvuruları ({businesses.length})</h2>{businesses.length?businesses.map(b=><div className="admin-row" key={b.id}><div style={{minWidth:0,flex:1}}><b>{b.name}</b><span>{b.category} · {b.district} · {b.status}</span>{b.image_url?<img src={b.image_url} alt={b.name+" işletme fotoğrafı"} style={{display:"block",width:180,height:110,objectFit:"cover",borderRadius:10,marginTop:10}}/>:<span>Fotoğraf eklenmemiş.</span>}<label style={{display:"block",marginTop:10,fontSize:13}}>Fotoğrafı değiştir (JPG, PNG, WEBP · en fazla 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={photoBusyId===b.id} onChange={e=>{const file=e.target.files?.[0];e.target.value="";if(file)uploadBusinessPhoto(b,file);}}/></label>{b.image_url&&<button className="quiet-btn" disabled={photoBusyId===b.id} onClick={()=>deleteBusinessPhoto(b)}>Fotoğrafı sil</button>}</div><div className="admin-actions">{b.status==="pending"?<><button onClick={()=>updateBusiness(b.id,"approved")}>Onayla</button><button onClick={()=>updateBusiness(b.id,"rejected")}>Reddet</button></>:b.status==="approved"?<><span className="status-approved">Onaylandı</span><button onClick={()=>updateBusiness(b.id,"suspended")}>Askıya al</button></>:b.status==="suspended"?<><span className="status-suspended">Askıya alındı</span><button onClick={()=>updateBusiness(b.id,"approved")}>Yeniden etkinleştir</button></>:<span className="status-rejected">Reddedildi</span>}</div></div>):<div className="empty">İşletme kaydı yok.</div>}
 <h2>Fırsatlar ({offers.length})</h2>{offers.length?offers.map(o=><div className="admin-row" key={o.id}><div><b>{o.title}</b><span>{o.businesses?.name||"İşletme"} · {o.district} · {o.status}</span></div><div className="admin-actions"><button onClick={()=>updateOffer(o.id,"published")}>Yayınla</button><button onClick={()=>updateOffer(o.id,"paused")}>Durdur</button></div></div>):<div className="empty">Fırsat yok.</div>}
 <h2>Destek ve şikâyet mesajları ({supportMessages.length})</h2>{supportMessages.length?supportMessages.map(s=><div className="admin-row" key={s.id}><div><b>{s.subject} · {s.category==="complaint"?"Şikâyet":s.category==="suggestion"?"Öneri":s.category==="support"?"Destek":"Diğer"}</b><span>{s.message}</span><span>Kullanıcı: {s.user_id} · {new Date(s.created_at).toLocaleString("tr-TR")} · {s.status}</span></div></div>):<div className="empty">Yeni destek veya şikâyet mesajı yok.</div>}
 <h2>Rezervasyonlar ({reservations.length})</h2>{reservations.length?reservations.map(r=><div className="admin-row" key={r.id}><div><b>{r.offers?.title||"Rezervasyon"}</b><span>{r.customer_name} · {r.customer_phone} · {r.status}</span></div><div className="admin-actions">{r.status==="pending"?<><button onClick={()=>updateReservation(r.id,"approved")}>Onayla</button><button onClick={()=>updateReservation(r.id,"rejected")}>Reddet</button></>:r.status==="approved"?<button onClick={()=>updateReservation(r.id,"completed")}>Tamamlandı</button>:<span>{r.status==="rejected"?"Reddedildi":r.status==="completed"?"Tamamlandı":r.status==="cancelled"?"İptal edildi":r.status}</span>}</div></div>):<div className="empty">Rezervasyon yok.</div>}
 </>}
 </section></main>;
}
