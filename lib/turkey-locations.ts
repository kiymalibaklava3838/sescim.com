/**
 * Türkiye 81 İl ve İlçe Listesi
 * Statik, ultra hafif ve anlık çalışan adres veri kütüphanesi.
 */

export interface SehirData {
  il: string
  ilceler: string[]
}

export const TURKIYE_ILLER: SehirData[] = [
  { il: 'Adana', ilceler: ['Seyhan', 'Yüreğir', 'Çukurova', 'Sarıçam', 'Ceyhan', 'Kozan', 'İmamoğlu', 'Karataş', 'Karaisalı', 'Pozantı', 'Yumurtalık', 'Tufanbeyli', 'Feke', 'Aladağ', 'Saimbeyli'] },
  { il: 'Adıyaman', ilceler: ['Merkez', 'Besni', 'Kahta', 'Gölbaşı', 'Gerger', 'Sincik', 'Çelikhan', 'Tut', 'Samsat'] },
  { il: 'Afyonkarahisar', ilceler: ['Merkez', 'Sandıklı', 'Dinar', 'Bolvadin', 'Sinanpaşa', 'Emirdağ', 'Şuhut', 'Çay', 'İhsaniye', 'İscehisar', 'Sultandağı', 'Çobanlar', 'Dazkırı', 'Başmakçı', 'Hocalar', 'Kızılören', 'Evciler', 'Bayat'] },
  { il: 'Ağrı', ilceler: ['Merkez', 'Patnos', 'Doğubayazıt', 'Diyadin', 'Eleşkirt', 'Tutak', 'Taşlıçay', 'Hamur'] },
  { il: 'Amasya', ilceler: ['Merkez', 'Merzifon', 'Suluova', 'Taşova', 'Gümüşhacıköy', 'Göynücek', 'Hamamözü'] },
  { il: 'Ankara', ilceler: ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Etimesgut', 'Sincan', 'Altındağ', 'Pursaklar', 'Gölbaşı', 'Polatlı', 'Çubuk', 'Kahramankazan', 'Beypazarı', 'Elmadağ', 'Şereflikoçhisar', 'Akyurt', 'Nallıhan', 'Haymana', 'Kızılcahamam', 'Bala', 'Kalecik', 'Ayaş', 'Güdül', 'Çamlıdere', 'Evren'] },
  { il: 'Antalya', ilceler: ['Muratpaşa', 'Kepez', 'Alanya', 'Manavgat', 'Konyaaltı', 'Serik', 'Aksu', 'Kumluca', 'Döşemealtı', 'Kaş', 'Korkuteli', 'Gazipaşa', 'Finike', 'Kemer', 'Elmalı', 'Demre', 'Akseki', 'Gündoğmuş', 'İbradı'] },
  { il: 'Artvin', ilceler: ['Merkez', 'Hopa', 'Borçka', 'Yusufeli', 'Arhavi', 'Şavşat', 'Ardanuç', 'Kemalpaşa', 'Murgul'] },
  { il: 'Aydın', ilceler: ['Efeler', 'Nazilli', 'Söke', 'Kuşadası', 'Didim', 'İncirliova', 'Çine', 'Germencik', 'Bozdoğan', 'Köşk', 'Kuyucak', 'Sultanhisar', 'Karacasu', 'Buharkent', 'Yenipazar', 'Koçarlı', 'Karpuzlu'] },
  { il: 'Balıkesir', ilceler: ['Karesi', 'Altıeylül', 'Bandırma', 'Edremit', 'Gönen', 'Ayvalık', 'Burhaniye', 'Bigadiç', 'Susurluk', 'Dursunbey', 'Sındırgı', 'İvrindi', 'Erdek', 'Havran', 'Kepsut', 'Manyas', 'Savaştepe', 'Balya', 'Gömeç', 'Marmara'] },
  { il: 'Bilecik', ilceler: ['Merkez', 'Bozüyük', 'Osmaneli', 'Söğüt', 'Gölpazarı', 'Pazaryeri', 'İnhisar', 'Yenipazar'] },
  { il: 'Bingöl', ilceler: ['Merkez', 'Genç', 'Solhan', 'Karlıova', 'Adaklı', 'Kiğı', 'Yedisu', 'Yayladere'] },
  { il: 'Bitlis', ilceler: ['Tatvan', 'Merkez', 'Güroymak', 'Ahlat', 'Hizan', 'Mutki', 'Adilcevaz'] },
  { il: 'Bolu', ilceler: ['Merkez', 'Gerede', 'Mudurnu', 'Göynük', 'Mengen', 'Yeniçağa', 'Dörtdivan', 'Seben', 'Kıbrıscık'] },
  { il: 'Burdur', ilceler: ['Merkez', 'Bucak', 'Gölhisar', 'Yeşilova', 'Çavdır', 'Tefenni', 'Ağlasun', 'Karamanlı', 'Altınyayla', 'Çeltikçi', 'Kemer'] },
  { il: 'Bursa', ilceler: ['Osmangazi', 'Yıldırım', 'Nilüfer', 'İnegöl', 'Gemlik', 'Mustafakemalpaşa', 'Mudanya', 'Gürsu', 'Karacabey', 'Orhangazi', 'Kestel', 'Yenişehir', 'İznik', 'Orhaneli', 'Keles', 'Büyükorhan', 'Harmancık'] },
  { il: 'Çanakkale', ilceler: ['Merkez', 'Biga', 'Çan', 'Gelibolu', 'Yenice', 'Ayvacık', 'Ezine', 'Bayramiç', 'Lapseki', 'Eceabat', 'Gökçeada', 'Bozcaada'] },
  { il: 'Çankırı', ilceler: ['Merkez', 'Çerkeş', 'Ilgaz', 'Orta', 'Şabanözü', 'Kurşunlu', 'Yapraklı', 'Kızılırmak', 'Eldivan', 'Atkaracalar', 'Korgun', 'Bayramören'] },
  { il: 'Çorum', ilceler: ['Merkez', 'Sungurlu', 'Osmancık', 'Alaca', 'İskilip', 'Kargı', 'Mecitözü', 'Ortaköy', 'Uğurludağ', 'Dodurga', 'Oğuzlar', 'Laçin', 'Boğazkale', 'Bayat'] },
  { il: 'Denizli', ilceler: ['Pamukkale', 'Merkezefendi', 'Çivril', 'Acıpayam', 'Tavas', 'Honaz', 'Sarayköy', 'Buldan', 'Kale', 'Çal', 'Çameli', 'Serinhisar', 'Bozkurt', 'Güney', 'Çardak', 'Bekilli', 'Beyağaç', 'Babadağ', 'Baklan'] },
  { il: 'Diyarbakır', ilceler: ['Bağlar', 'Kayapınar', 'Yenişehir', 'Sur', 'Ergani', 'Bismil', 'Silvan', 'Çınar', 'Çermik', 'Dicle', 'Kulp', 'Hani', 'Madeni', 'Eğil', 'Lice', 'Hazro', 'Kocaköy', 'Çüngüş'] },
  { il: 'Edirne', ilceler: ['Merkez', 'Keşan', 'Uzunköprü', 'İpsala', 'Havsa', 'Meriç', 'Enez', 'Süloğlu', 'Lalapaşa'] },
  { il: 'Elazığ', ilceler: ['Merkez', 'Kovancılar', 'Karakoçan', 'Palu', 'Arıcak', 'Baskil', 'Maden', 'Sivrice', 'Alacakaya', 'Keban', 'Ağın'] },
  { il: 'Erzincan', ilceler: ['Merkez', 'Tercan', 'Üzümlü', 'Çayırlı', 'İliç', 'Kemah', 'Kemaliye', 'Refahiye', 'Otlukbeli'] },
  { il: 'Erzurum', ilceler: ['Yakutiye', 'Palandöken', 'Aziziye', 'Horasan', 'Oltu', 'Pasinler', 'Karayazı', 'Hınıs', 'Tekman', 'Karaçoban', 'Aşkale', 'Şenkaya', 'Çat', 'Köprüköy', 'İspir', 'Tortum', 'Narman', 'Uzundere', 'Olur', 'Pazaryolu'] },
  { il: 'Eskişehir', ilceler: ['Odunpazarı', 'Tepebaşı', 'Sivrihisar', 'Çifteler', 'Seyitgazi', 'Alpu', 'Mihalıççık', 'Mahmudiye', 'Beylikova', 'İnönü', 'Günyüzü', 'Han', 'Mihalgazi', 'Sarıcakaya'] },
  { il: 'Gaziantep', ilceler: ['Şahinbey', 'Şehitkamil', 'Nizip', 'İslahiye', 'Nurdağı', 'Araban', 'Oğuzeli', 'Yavuzeli', 'Karkamış'] },
  { il: 'Giresun', ilceler: ['Merkez', 'Bulancak', 'Espiye', 'Görele', 'Tirebolu', 'Dereli', 'Şebinkarahisar', 'Keşap', 'Yağlıdere', 'Alucra', 'Piraziz', 'Eynesil', 'Çamoluk', 'Güce', 'Doğankent', 'Çanakçı'] },
  { il: 'Gümüşhane', ilceler: ['Merkez', 'Kelkit', 'Şiran', 'Kürtün', 'Torul', 'Köse'] },
  { il: 'Hakkari', ilceler: ['Yüksekova', 'Merkez', 'Şemdinli', 'Çukurca', 'Derecik'] },
  { il: 'Hatay', ilceler: ['Antakya', 'İskenderun', 'Defne', 'Dörtyol', 'Samandağ', 'Kırıkhan', 'Reyhanlı', 'Arsuz', 'Altınözü', 'Hassa', 'Payas', 'Erzin', 'Yayladağı', 'Belen', 'Kumlu'] },
  { il: 'Isparta', ilceler: ['Merkez', 'Yalvaç', 'Eğirdir', 'Şarkikaraağaç', 'Gelendost', 'Keçiborlu', 'Senirkent', 'Sütçüler', 'Gönen', 'Uluborlu', 'Atabey', 'Aksu', 'Yenişarbademli'] },
  { il: 'Mersin', ilceler: ['Tarsus', 'Toroslar', 'Akdeniz', 'Yenişehir', 'Mezitli', 'Erdemli', 'Silifke', 'Anamur', 'Mut', 'Bozyazı', 'Gülnar', 'Aydıncık', 'Çamlıyayla'] },
  { il: 'İstanbul', ilceler: ['Esenyurt', 'Küçükçekmece', 'Bağcılar', 'Pendik', 'Ümraniye', 'Bahçelievler', 'Sultangazi', 'Üsküdar', 'Maltepe', 'Gaziosmanpaşa', 'Kartal', 'Kadıköy', 'Esenler', 'Kağıthane', 'Fatih', 'Avcılar', 'Başakşehir', 'Ataşehir', 'Sancaktepe', 'Eyüpsultan', 'Beylikdüzü', 'Sarıyer', 'Sultanbeyli', 'Zeytinburnu', 'Güngören', 'Şişli', 'Bayrampaşa', 'Tuzla', 'Arnavutköy', 'Çekmeköy', 'Büyükçekmece', 'Beykoz', 'Beyoğlu', 'Bakırköy', 'Silivri', 'Beşiktaş', 'Çatalca', 'Şile', 'Adalar'] },
  { il: 'İzmir', ilceler: ['Buca', 'Karabağlar', 'Bornova', 'Konak', 'Karşıyaka', 'Bayraklı', 'Çiğli', 'Torbalı', 'Menemen', 'Gaziemir', 'Ödemiş', 'Kemalpaşa', 'Bergama', 'Aliağa', 'Menderes', 'Tire', 'Balçova', 'Urla', 'Narlıdere', 'Seferihisar', 'Çeşme', 'Dikili', 'Kiraz', 'Beydağ', 'Kınık', 'Güzelbahçe', 'Foça', 'Selçuk', 'Karaburun', 'Beydağ'] },
  { il: 'Kars', ilceler: ['Merkez', 'Kağızman', 'Sarıkamış', 'Selim', 'Digor', 'Arpaçay', 'Akyaka', 'Susuz'] },
  { il: 'Kastamonu', ilceler: ['Merkez', 'Tosya', 'Taşköprü', 'Cide', 'İnebolu', 'Araç', 'Devrekani', 'Bozkurt', 'Daday', 'Azdavay', 'Çatalzeytin', 'Küre', 'Doğanyurt', 'İhsangazi', 'Pınarbaşı', 'Şenpazar', 'Abana', 'Seydiler', 'Hanonu', 'Ağlı'] },
  { il: 'Kayseri', ilceler: ['Melikgazi', 'Kocasinan', 'Talas', 'Develi', 'Yahyalı', 'Bünyan', 'İncesu', 'Pınarbaşı', 'Tomarza', 'Yeşilhisar', 'Sarıoğlan', 'Hacılar', 'Sarız', 'Felahiye', 'Akkışla', 'Özvatan'] },
  { il: 'Kırklareli', ilceler: ['Lüleburgaz', 'Merkez', 'Babaeski', 'Vize', 'Pınarhisar', 'Demirköy', 'Pehlivanköy', 'Kofçaz'] },
  { il: 'Kırşehir', ilceler: ['Merkez', 'Kaman', 'Mucur', 'Çiçekdağı', 'Akpınar', 'Boztepe', 'Akçakent'] },
  { il: 'Kocaeli', ilceler: ['Gebze', 'İzmit', 'Darıca', 'Körfez', 'Gölcük', 'Derince', 'Çayırova', 'Kartepe', 'Başiskele', 'Karamürsel', 'Kandıra', 'Dilovası'] },
  { il: 'Konya', ilceler: ['Selçuklu', 'Karatay', 'Meram', 'Ereğli', 'Akşehir', 'Beyşehir', 'Cihanbeyli', 'Kulu', 'Seydişehir', 'Ilgın', 'Bozkır', 'Kadınhanı', 'Sarayönü', 'Hüyük', 'Karahüyük', 'Yunak', 'Doğanhisar', 'Çumra', 'Hadim', 'Altınekin', 'Tuzlukçu', 'Güneysınır', 'Halkapınar', 'Emirgazi', 'Taşkent', 'Ahırlı', 'Derbent', 'Akören', 'Yalıhüyük'] },
  { il: 'Kütahya', ilceler: ['Merkez', 'Tavşanlı', 'Simav', 'Gediz', 'Emet', 'Altıntaş', 'Domaniç', 'Hisarcık', 'Aslanapa', 'Çavdarhisar', 'Şaphane', 'Pazarlar', 'Dumlupınar'] },
  { il: 'Malatya', ilceler: ['Battalgazi', 'Yeşilyurt', 'Doğanşehir', 'Akçadağ', 'Darende', 'Hekimhan', 'Pütürge', 'Yazıhan', 'Arapgir', 'Kuluncak', 'Arguvan', 'Kale', 'Doğanyol'] },
  { il: 'Manisa', ilceler: ['Yunusemre', 'Şehzadeler', 'Akhisar', 'Turgutlu', 'Salihli', 'Soma', 'Alaşehir', 'Saruhanlı', 'Kula', 'Kırkağaç', 'Demirci', 'Sarıgöl', 'Gördes', 'Selendi', 'Ahmetli', 'Gölmarmara', 'Köprübaşı'] },
  { il: 'Kahramanmaraş', ilceler: ['Onikişubat', 'Dulkadiroğlu', 'Elbistan', 'Afşin', 'Türkoğlu', 'Pazarcık', 'Göksun', 'Andırın', 'Çağlayancerit', 'Nurhak', 'Ekinözü'] },
  { il: 'Mardin', ilceler: ['Kızıltepe', 'Artuklu', 'Midyat', 'Nusaybin', 'Derik', 'Mazıdağı', 'Dargeçit', 'Savur', 'Yeşilli', 'Ömerli'] },
  { il: 'Muğla', ilceler: ['Bodrum', 'Fethiye', 'Milas', 'Menteşe', 'Marmaris', 'Seydikemer', 'Ortaca', 'Yatağan', 'Dalaman', 'Köyceğiz', 'Ula', 'Datça', 'Kavaklıdere'] },
  { il: 'Muş', ilceler: ['Merkez', 'Bulanık', 'Malazgirt', 'Varto', 'Hasköy', 'Korkut'] },
  { il: 'Nevşehir', ilceler: ['Merkez', 'Ürgüp', 'Avanos', 'Gülşehir', 'Derinkuyu', 'Acıgöl', 'Kozaklı', 'Hacıbektaş'] },
  { il: 'Niğde', ilceler: ['Merkez', 'Bor', 'Çiftlik', 'Ulukışla', 'Altunhisar', 'Çamardı'] },
  { il: 'Ordu', ilceler: ['Altınordu', 'Ünye', 'Fatsa', 'Gölköy', 'Korgan', 'Kumru', 'Perşembe', 'Akkuş', 'Aybastı', 'Ulubey', 'İkizce', 'Gürgentepe', 'Çatalpınar', 'Çaybaşı', 'Mesudiye', 'Kabadüz', 'Kabataş', 'Çamaş', 'Gülyalı'] },
  { il: 'Rize', ilceler: ['Merkez', 'Çayeli', 'Ardeşen', 'Pazar', 'Fındıklı', 'Güneysu', 'Kalkandere', 'İyidere', 'Derepazarı', 'Çamlıhemşin', 'İkizdere', 'Hemşin'] },
  { il: 'Sakarya', ilceler: ['Adapazarı', 'Serdivan', 'Akyazı', 'Erenler', 'Hendek', 'Karasu', 'Geyve', 'Arifiye', 'Sapanca', 'Pamukova', 'Ferizli', 'Kocaali', 'Kaynarca', 'Söğütlü', 'Karapürçek', 'Taraklı'] },
  { il: 'Samsun', ilceler: ['İlkadım', 'Atakum', 'Bafra', 'Çarşamba', 'Canik', 'Vezirköprü', 'Terme', 'Tekkeköy', 'Havza', 'Alaçam', '19 Mayıs', 'Ayvacık', 'Kavak', 'Salıpazarı', 'Asarcık', 'Ladik', 'Yakakent'] },
  { il: 'Siirt', ilceler: ['Merkez', 'Kurtalan', 'Pervari', 'Baykan', 'Şirvan', 'Eruh', 'Tillo'] },
  { il: 'Sinop', ilceler: ['Merkez', 'Boyabat', 'Gerze', 'Ayancık', 'Durağan', 'Türkeli', 'Erfelek', 'Saraydüzü', 'Dikmen'] },
  { il: 'Sivas', ilceler: ['Merkez', 'Şarkışla', 'Yıldızeli', 'Suşehri', 'Zara', 'Gemerek', 'Kangal', 'Gürün', 'Divriği', 'Koyulhisar', 'Altınyayla', 'Hafik', 'Ulaş', 'İmranlı', 'Akıncılar', 'Gölova', 'Doğanşar'] },
  { il: 'Tekirdağ', ilceler: ['Çorlu', 'Süleymanpaşa', 'Çerkezköy', 'Kapaklı', 'Ergene', 'Malkara', 'Saray', 'Hayrabolu', 'Şarköy', 'Muratlı', 'Marmaraereğlisi'] },
  { il: 'Tokat', ilceler: ['Merkez', 'Erbaa', 'Turhal', 'Niksar', 'Zile', 'Reşadiye', 'Almus', 'Pazar', 'Yeşilyurt', 'Artova', 'Sulusaray', 'Başçiftlik'] },
  { il: 'Trabzon', ilceler: ['Ortahisar', 'Akçaabat', 'Araklı', 'Of', 'Yomra', 'Arsin', 'Vakfıkebir', 'Sürmene', 'Maçka', 'Beşikdüzü', 'Çarşıbaşı', 'Tonya', 'Düzköy', 'Çaykara', 'Şalpazarı', 'Hayrat', 'Köprübaşı', 'Dernekpazarı'] },
  { il: 'Tunceli', ilceler: ['Merkez', 'Pertek', 'Mazgirt', 'Çemişgezek', 'Hozat', 'Ovacık', 'Pülümür', 'Nazımiye'] },
  { il: 'Şanlıurfa', ilceler: ['Eyyübiye', 'Haliliye', 'Siverek', 'Viranşehir', 'Karaköprü', 'Akçakale', 'Suruç', 'Birecik', 'Ceylanpınar', 'Harran', 'Bozova', 'Hilvan', 'Halfeti'] },
  { il: 'Uşak', ilceler: ['Merkez', 'Banaz', 'Eşme', 'Sivaslı', 'Ulubey', 'Karahallı'] },
  { il: 'Van', ilceler: ['İpekyolu', 'Erciş', 'Tuşba', 'Edremit', 'Özalp', 'Çaldıran', 'Başkale', 'Muradiye', 'Gürpınar', 'Gevaş', 'Saray', 'Çatak', 'Bahçesaray'] },
  { il: 'Yozgat', ilceler: ['Merkez', 'Sorgun', 'Akdağmadeni', 'Yerköy', 'Boğazlıyan', 'Sarıkaya', 'Çekerek', 'Şefaatli', 'Saraykent', 'Çayıralan', 'Kadışehri', 'Aydıncık', 'Yenifakılı', 'Chandır'] },
  { il: 'Zonguldak', ilceler: ['Ereğli', 'Merkez', 'Çaycuma', 'Devrek', 'Kozlu', 'Alaplı', 'Kilimli', 'Gökçebey'] },
  { il: 'Aksaray', ilceler: ['Merkez', 'Ortaköy', 'Eskil', 'Gülağaç', 'Güzelyurt', 'Ağaçören', 'Sultanhanı', 'Sarıyahşi'] },
  { il: 'Bayburt', ilceler: ['Merkez', 'Demirözü', 'Aydıntepe'] },
  { il: 'Karaman', ilceler: ['Merkez', 'Ermenek', 'Sarıveliler', 'Ayrancı', 'Kazımkarabekir', 'Başyayla'] },
  { il: 'Kırıkkale', ilceler: ['Merkez', 'Yahşihan', 'Keskin', 'Delice', 'Bahşılı', 'Sulakyurt', 'Balışeyh', 'Karakeçili', 'Çelebi'] },
  { il: 'Batman', ilceler: ['Merkez', 'Cozluk', 'Kozluk', 'Sason', 'Beşiri', 'Gercüş', 'Hasankeyf'] },
  { il: 'Şırnak', ilceler: ['Cizre', 'Silopi', 'Merkez', 'İdil', 'Uludere', 'Beytüşşebap', 'Güçlükonak'] },
  { il: 'Bartın', ilceler: ['Merkez', 'Ulus', 'Amasra', 'Kurucaşile'] },
  { il: 'Ardahan', ilceler: ['Merkez', 'Göle', 'Çıldır', 'Hanak', 'Posof', 'Damal'] },
  { il: 'Iğdır', ilceler: ['Merkez', 'Tuzluca', 'Aralık', 'Karakoyunlu'] },
  { il: 'Yalova', ilceler: ['Merkez', 'Çiftlikköy', 'Çınarcık', 'Altınova', 'Armutlu', 'Termal'] },
  { il: 'Karabük', ilceler: ['Merkez', 'Safranbolu', 'Yenice', 'Eskipazar', 'Eflani', 'Ovacık'] },
  { il: 'Kilis', ilceler: ['Merkez', 'Musabeyli', 'Elbeyli', 'Polateli'] },
  { il: 'Osmaniye', ilceler: ['Merkez', 'Kadirli', 'Düziçi', 'Bahçe', 'Toprakkale', 'Sumbas', 'Hasanbeyli'] },
  { il: 'Düzce', ilceler: ['Merkez', 'Akçakoca', 'Kaynaşlı', 'Gölyaka', 'Çilimli', 'Yığılca', 'Gümüşova', 'Cumayeri'] },
]

export const IL_ISIMLERI = TURKIYE_ILLER.map((item) => item.il).sort((a, b) => a.localeCompare('tr'))

export function getIlcelerByIl(ilAdi: string): string[] {
  if (!ilAdi) return []
  const found = TURKIYE_ILLER.find((item) => item.il.toLowerCase() === ilAdi.toLowerCase())
  return found ? found.ilceler.sort((a, b) => a.localeCompare('tr')) : []
}
