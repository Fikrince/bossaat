import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <header className="wrap nav">
        <Link className="brand" href="/"><span className="brand-mark">B</span><span>BOŞSAAT<small>YEREL FIRSAT AĞI</small></span></Link>
        <nav className="nav-links"><a href="#nasil-calisir">Nasıl çalışır?</a><a href="#isletmeler">İşletmeler için</a></nav>
        <Link className="nav-cta" href="/giris">Giriş yap / Üye ol</Link>
      </header>
      <section className="hero">
        <div className="hero-grid" />
        <div className="wrap hero-inner">
          <div className="eyebrow"><span /> SON DAKİKA RANDEVU FIRSATLARI</div>
          <h1>Boş kalan saatler,<br /><em>senin fırsatın.</em></h1>
          <p className="hero-copy">Yakınındaki kuaför, berber ve güzellik işletmelerinin boş randevu saatlerini avantajlı fiyatlarla keşfet.</p>
          <a className="hero-button" href="#firsatlar">Fırsatları keşfet →</a>
          <div className="hero-foot"><span>✓ İndirimli randevular</span><span>✓ Kolay talep</span><span>✓ İşletmeden onay</span></div>
        </div>
      </section>
      <section className="search-panel wrap" id="firsatlar">
        <div className="search-heading"><div><div className="eyebrow dark">BUGÜNÜN FIRSATLARI</div><h2>Boş saatini değerlendir.</h2></div><span className="live-label"><i /> Yeni fırsatlar burada</span></div>
        <div className="empty">Fırsat ilanları yayına alındığında burada listelenecek. İlk fırsatları yakında keşfedebilirsin.</div>
        <p className="demo-note">BOŞSAAT'te rezervasyon talebi oluşturmak ücretsizdir. Ödeme, güvenli ödeme altyapısı devreye alındıktan sonra sunulacaktır.</p>
      </section>
      <section className="how wrap" id="nasil-calisir"><span className="section-kicker">ÜÇ ADIMDA</span><h2>Fırsatı bul, talep et, onayını al.</h2><div className="steps">
        <div><b>01</b><h3>Fırsatları keşfet</h3><p>Yakınındaki işletmelerin indirimli boş randevu saatlerini incele.</p></div>
        <div><b>02</b><h3>Talebini gönder</h3><p>Sana uygun saat için rezervasyon talebi oluştur.</p></div>
        <div><b>03</b><h3>Onayını bekle</h3><p>İşletme talebini onayladığında randevun kesinleşsin.</p></div>
      </div></section>
      <section className="business-band" id="isletmeler"><div className="wrap business-inner"><div><span className="eyebrow">İŞLETMELER İÇİN</span><h2>Boş saatlerin kazanca dönüşsün.</h2><p>İptal olan veya boş kalan randevularını indirimli fırsat olarak yayınla, yeni müşterilere ulaş.</p></div><Link className="business-button" href="/isletme-kayit">İşletmeni kaydet →</Link></div></section>
      <footer className="footer"><div className="wrap footer-inner"><Link className="brand" href="/"><span className="brand-mark">B</span><span>BOŞSAAT</span></Link><span>© 2026 BOŞSAAT · Boş kalan saatler, senin fırsatın.</span><Link href="/giris">Hesabına giriş yap</Link></div></footer>
    </main>
  );
}
