-- =============================================
-- AKDAĞ ELEKTRONİK - Yeni Kategori Altyapısı
-- =============================================

-- 1) Kategoriler Tablosu
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- 2) Ürünler Tablosunu Güncelle
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);

-- 3) Kategori Verilerini Ekle (Seed)
-- Önce Ana Kategoriler, sonra Alt Kategoriler, sonra 3. Seviye

DO $$
DECLARE
  v_ses_id UUID;
  v_isik_id UUID;
  v_goruntu_id UUID;
  v_sahne_id UUID;
  v_aksesuar_id UUID;
  v_tasima_id UUID;

  -- Ses Sistemleri Altları
  v_mixer_id UUID;
  v_hoparlor_id UUID;
  v_mikrofon_id UUID;
  v_sinyal_id UUID;

  -- Işık Sistemleri Altları
  v_isik_har_id UUID;
  v_isik_sab_id UUID;
  v_efekt_id UUID;
  v_isik_kont_id UUID;
  v_mimari_id UUID;

  -- Görüntü Sistemleri Altları
  v_led_ekran_id UUID;
  v_projeksiyon_id UUID;
  v_goruntu_yonetim_id UUID;

  -- Sahne ve Truss Altları
  v_truss_id UUID;
  v_sahne_podyum_id UUID;
  v_kaldirma_id UUID;

  -- Kablo, Stand ve Aksesuar Altları
  v_kablo_id UUID;
  v_konnektor_id UUID;
  v_stand_id UUID;
  v_sarf_id UUID;

  -- Taşıma ve Altyapı Altları
  v_case_id UUID;
  v_enerji_id UUID;

BEGIN
  -- 1. Ses Sistemleri
  INSERT INTO categories (name, slug) VALUES ('Ses Sistemleri (Pro Audio)', 'ses-sistemleri') 
  RETURNING id INTO v_ses_id;

  INSERT INTO categories (name, slug, parent_id) VALUES ('Mixer & Amfi', 'mixer-amfi', v_ses_id) RETURNING id INTO v_mixer_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('Analog Mikserler', 'analog-mikserler', v_mixer_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Dijital Mikserler', 'dijital-mikserler', v_mixer_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Power Mikserler', 'power-mikserler', v_mixer_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Power (Güç) Amfileri', 'power-amfileri', v_mixer_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Hat Trafolu (100V) Kurulum Amfileri', 'hat-trafolu-kurulum-amfileri', v_mixer_id);

  INSERT INTO categories (name, slug, parent_id) VALUES ('Hoparlörler', 'hoparlorler', v_ses_id) RETURNING id INTO v_hoparlor_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('Taşınabilir Ses Sistemleri', 'tasinabilir-ses-sistemleri', v_hoparlor_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Aktif Hoparlörler (Kabinler)', 'aktif-hoparlorler', v_hoparlor_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Pasif Hoparlörler (Kabinler)', 'pasif-hoparlorler', v_hoparlor_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Line Array (Dizi) Sistemler', 'line-array-sistemler', v_hoparlor_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Subwooferlar (Bas Kabinleri)', 'subwooferlar', v_hoparlor_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Tavan, Sütun ve Duvar Hoparlörleri (Kurulum)', 'tavan-sutun-duvar-hoparlorleri', v_hoparlor_id);

  INSERT INTO categories (name, slug, parent_id) VALUES ('Mikrofon Sistemleri', 'mikrofon-sistemleri', v_ses_id) RETURNING id INTO v_mikrofon_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('Telsiz (Kablosuz) Mikrofonlar (El, Yaka, Kafa)', 'telsiz-mikrofonlar', v_mikrofon_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Kablolu Dinamik ve Condenser Mikrofonlar', 'kablolu-mikrofonlar', v_mikrofon_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Kürsü ve Konferans (Delege) Sistemleri', 'kursu-ve-konferans-sistemleri', v_mikrofon_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Enstrüman Mikrofonları', 'enstruman-mikrofonlari', v_mikrofon_id);

  INSERT INTO categories (name, slug, parent_id) VALUES ('Sinyal İşleyiciler', 'sinyal-isleyiciler', v_ses_id) RETURNING id INTO v_sinyal_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('DSP (Dijital Ses İşlemcileri)', 'dsp-ses-islemcileri', v_sinyal_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Crossover ve Equalizerlar', 'crossover-ve-equalizerlar', v_sinyal_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Dağıtıcılar (Splitter)', 'ses-dagiticilar', v_sinyal_id);

  -- 2. Işık Sistemleri
  INSERT INTO categories (name, slug) VALUES ('Işık Sistemleri (Pro Lighting)', 'isik-sistemleri') 
  RETURNING id INTO v_isik_id;

  INSERT INTO categories (name, slug, parent_id) VALUES ('Sahne Işıkları (Hareketli)', 'sahne-isiklari-hareketli', v_isik_id) RETURNING id INTO v_isik_har_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('Robot Işıklar (Moving Head - Beam, Spot, Wash)', 'robot-isiklar', v_isik_har_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Scanner Sistemler', 'scanner-sistemler', v_isik_har_id);

  INSERT INTO categories (name, slug, parent_id) VALUES ('Sahne Işıkları (Sabit)', 'sahne-isiklari-sabit', v_isik_id) RETURNING id INTO v_isik_sab_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('LED Par ve Boyama Işıkları', 'led-par-ve-boyama-isiklari', v_isik_sab_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Profil, PC ve Tiyatro Spotları', 'tiyatro-spotlari', v_isik_sab_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Strobe (Çakar) ve Blinder (Kör Edici) Işıklar', 'strobe-ve-blinder-isiklar', v_isik_sab_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Lazer Sistemleri', 'lazer-sistemleri', v_isik_sab_id);

  INSERT INTO categories (name, slug, parent_id) VALUES ('Efekt Makineleri ve Likitler', 'efekt-makineleri-ve-likitler', v_isik_id) RETURNING id INTO v_efekt_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('Sis, Duman ve Hazer Makineleri', 'sis-ve-duman-makineleri', v_efekt_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Kar, Köpük ve Baloncuk Makineleri', 'kar-ve-kopuk-makineleri', v_efekt_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Kıvılcım (Cold Spark) ve Alev Makineleri', 'kivilcim-ve-alev-makineleri', v_efekt_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Efekt Likitleri ve Tozları', 'efekt-likitleri', v_efekt_id);

  INSERT INTO categories (name, slug, parent_id) VALUES ('Işık Kontrol', 'isik-kontrol', v_isik_id) RETURNING id INTO v_isik_kont_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('DMX Işık Masaları ve Konsollar', 'dmx-isik-masalari', v_isik_kont_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('PC/USB DMX Yazılım ve Arayüzleri', 'pc-dmx-yazilimlari', v_isik_kont_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('DMX Dağıtıcı (Splitter) ve Sinyal Güçlendiriciler', 'dmx-splitterlar', v_isik_kont_id);

  INSERT INTO categories (name, slug, parent_id) VALUES ('Mimari ve Dış Mekan Aydınlatma', 'mimari-aydinlatma', v_isik_id) RETURNING id INTO v_mimari_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('Dış Mekan (Outdoor) LED Par''lar', 'dis-mekan-led-parlar', v_mimari_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Wall Washerlar (Duvar Boyamalar)', 'wall-washerlar', v_mimari_id);

  -- 3. Görüntü Sistemleri
  INSERT INTO categories (name, slug) VALUES ('Görüntü Sistemleri (Visuals)', 'goruntu-sistemleri') 
  RETURNING id INTO v_goruntu_id;

  INSERT INTO categories (name, slug, parent_id) VALUES ('LED Ekran Sistemleri', 'led-ekran-sistemleri', v_goruntu_id) RETURNING id INTO v_led_ekran_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('İç Mekan (Indoor) LED Paneller', 'ic-mekan-led-paneller', v_led_ekran_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Dış Mekan (Outdoor) LED Paneller', 'dis-mekan-led-paneller', v_led_ekran_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('LED Ekran İşlemcileri (Video Processor) ve Gönderici Kartlar', 'led-ekran-islemcileri', v_led_ekran_id);

  INSERT INTO categories (name, slug, parent_id) VALUES ('Projeksiyon Cihazları ve Perdeler', 'projeksiyon-sistemleri', v_goruntu_id) RETURNING id INTO v_projeksiyon_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('Profesyonel Projeksiyon Cihazları', 'profesyonel-projeksiyonlar', v_projeksiyon_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Motorlu Projeksiyon Perdeleri', 'motorlu-projeksiyon-perdeleri', v_projeksiyon_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Stor ve Taşınabilir Perdeler', 'tasinabilir-projeksiyon-perdeleri', v_projeksiyon_id);

  INSERT INTO categories (name, slug, parent_id) VALUES ('Görüntü Yönetimi ve Dağıtım', 'goruntu-yonetimi', v_goruntu_id) RETURNING id INTO v_goruntu_yonetim_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('Video Mikserleri (Switcher)', 'video-mikserleri', v_goruntu_yonetim_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Görüntü Çoklayıcı (Splitter) ve Matrisler (Matrix)', 'goruntu-splitterlar', v_goruntu_yonetim_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Görüntü Çeviriciler (Converter)', 'goruntu-ceviriciler', v_goruntu_yonetim_id);

  -- 4. Sahne ve Truss
  INSERT INTO categories (name, slug) VALUES ('Sahne ve Truss (Truss & Rigging)', 'sahne-ve-truss') 
  RETURNING id INTO v_sahne_id;

  INSERT INTO categories (name, slug, parent_id) VALUES ('Truss Sistemleri', 'truss-sistemleri', v_sahne_id) RETURNING id INTO v_truss_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('Kare Trusslar', 'kare-trusslar', v_truss_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Üçgen Trusslar', 'ucgen-trusslar', v_truss_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Dairesel Trusslar', 'dairesel-trusslar', v_truss_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Köşe Bağlantıları ve Uzatmalar', 'truss-baglanti-aparatlari', v_truss_id);

  INSERT INTO categories (name, slug, parent_id) VALUES ('Sahne ve Podyum', 'sahne-ve-podyum', v_sahne_id) RETURNING id INTO v_sahne_podyum_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('Modüler Sahne Platformları', 'moduler-sahne-platformlari', v_sahne_podyum_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Sahne Ayakları ve Profiller', 'sahne-ayaklari', v_sahne_podyum_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Sahne Merdivenleri ve Korkuluklar', 'sahne-merdivenleri', v_sahne_podyum_id);

  INSERT INTO categories (name, slug, parent_id) VALUES ('Kaldırma Sistemleri (Rigging)', 'kaldirma-sistemleri', v_sahne_id) RETURNING id INTO v_kaldirma_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('Manuel Zincirli Vinçler (Chain Hoist)', 'manuel-vincler', v_kaldirma_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Elektrikli Vinç Motorları', 'elektrikli-vincler', v_kaldirma_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Kule (Lifter) Sistemleri', 'kule-lifterlar', v_kaldirma_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Bağlantı Ekipmanları (Kelepçe, Sapan, Kilit)', 'rigging-baglanti-ekipmanlari', v_kaldirma_id);

  -- 5. Kablo, Stand ve Aksesuar
  INSERT INTO categories (name, slug) VALUES ('Kablo, Stand ve Aksesuar (Accessories & Cables)', 'kablo-stand-ve-aksesuar') 
  RETURNING id INTO v_aksesuar_id;

  INSERT INTO categories (name, slug, parent_id) VALUES ('Kablolar (Hazır ve Makara)', 'kablolar', v_aksesuar_id) RETURNING id INTO v_kablo_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('Ses Kabloları (Mikrofon, Enstrüman, Hoparlör)', 'ses-kablolari', v_kablo_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('DMX Işık Kabloları', 'dmx-isik-kablolari', v_kablo_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Görüntü Kabloları (HDMI, SDI, VGA)', 'goruntu-kablolari', v_kablo_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Multicore (Yılan) Kablolar', 'multicore-kablolar', v_kablo_id);

  INSERT INTO categories (name, slug, parent_id) VALUES ('Konnektörler ve Adaptörler', 'konnektorler-ve-adaptorler', v_aksesuar_id) RETURNING id INTO v_konnektor_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('XLR, Speakon ve Çivi Jaklar', 'xlr-ve-speakon-konnektorler', v_konnektor_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Powercon Fişler', 'powercon-konnektorler', v_konnektor_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Çevirici Adaptör Jaklar', 'cevirici-adaptorler', v_konnektor_id);

  INSERT INTO categories (name, slug, parent_id) VALUES ('Standlar ve Sehpalar', 'standlar-ve-sehpalar', v_aksesuar_id) RETURNING id INTO v_stand_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('Hoparlör Standları (Ayakları)', 'hoparlor-standlari', v_stand_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Mikrofon Standları (Düz ve Deveboynu)', 'mikrofon-standlari', v_stand_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Işık Standları ve T-Barlar', 'isik-standlari', v_stand_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Nota ve Enstrüman Standları', 'nota-ve-enstruman-standlari', v_stand_id);

  INSERT INTO categories (name, slug, parent_id) VALUES ('Sarf Malzemeler', 'sarf-malzemeler', v_aksesuar_id) RETURNING id INTO v_sarf_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('Gaffar Bantlar ve Sahne Bantları', 'sahne-bantlari', v_sarf_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Kablo Toplayıcılar ve Cırtlar', 'kablo-toplayicilar', v_sarf_id);

  -- 6. Taşıma ve Altyapı
  INSERT INTO categories (name, slug) VALUES ('Taşıma ve Altyapı (Cases & Power)', 'tasima-ve-altyapi') 
  RETURNING id INTO v_tasima_id;

  INSERT INTO categories (name, slug, parent_id) VALUES ('Taşıma Çantaları (Hard Case & Bag)', 'tasima-cantalari', v_tasima_id) RETURNING id INTO v_case_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('Rack Kabinler (Standart 19")', 'rack-kabinler', v_case_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Mikser ve Işık Masası Caseleri', 'mikser-ve-isik-masasi-caseleri', v_case_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Kablo ve Aksesuar Sandıkları (Trunk Case)', 'trunk-caseler', v_case_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Soft Case Taşıma Çantaları', 'soft-case-cantalar', v_case_id);

  INSERT INTO categories (name, slug, parent_id) VALUES ('Enerji ve Güç Dağıtımı', 'enerji-ve-guc-dagitimi', v_tasima_id) RETURNING id INTO v_enerji_id;
    INSERT INTO categories (name, slug, parent_id) VALUES ('Sahne Tipi Güç Dağıtım Panoları (Power Box)', 'power-boxlar', v_enerji_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Rack Tipi Grup Prizler', 'rack-tipi-prizler', v_enerji_id);
    INSERT INTO categories (name, slug, parent_id) VALUES ('Sanayi Tipi Fiş, Priz ve Kauçuk Uzatmalar', 'sanayi-tipi-fislere-prizler', v_enerji_id);

END $$;
