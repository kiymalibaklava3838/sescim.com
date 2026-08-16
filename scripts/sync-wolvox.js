const Firebird = require('node-firebird');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_SIZE = 100; // 100'lük gruplar halinde gönder

const options = {
    host: '127.0.0.1',
    port: 3050,
    database: 'C:\\Akinsoft\\Wolvox8\\Database_FB\\AKDAG2013\\2025\\WOLVOX.FDB',
    user: 'SYSDBA',
    password: 'masterkey',
    lowercase_keys: false,
    role: null,
    pageSize: 4096,
};

console.log('Wolvox Veritabanına Bağlanılıyor...');

Firebird.attach(options, async function(err, db) {
    if (err) {
        console.error('Firebird Bağlantı Hatası:', err);
        process.exit(1);
    }

    console.log('Wolvox Bağlantısı Başarılı. Veriler Çekiliyor...');

    // Veritabanı yolundan yılı çıkar (örn: ...2025\WOLVOX.FDB → 2025)
    const yilMatch = options.database.match(/\\(\d{4})\\/);
    const yil = yilMatch ? parseInt(yilMatch[1]) : new Date().getFullYear();
    console.log(`Senkronizasyon Yılı: ${yil}`);

    const sql = `
        SELECT 
            S.STOKKODU, 
            S.STOK_ADI, 
            S.ACIKLAMA1,
            S.MARKASI,
            S.MODELI,
            S.DOVIZ_BIRIMI,
            (SELECT FIRST 1 FIYATI FROM STOK_FIYAT WHERE BLSTKODU = S.BLKODU AND FIYAT_NO = 1) as FIYAT,
            (SELECT SUM(H.KPB_GMIK - H.KPB_CMIK) FROM STOKHR H WHERE H.BLSTKODU = S.BLKODU AND (H.SILINDI IS NULL OR H.SILINDI = 0)) as MIKTAR
        FROM STOK S
        WHERE S.AKTIF = 1
    `;

    db.query(sql, async function(err, result) {
        if (err) {
            console.error('Sorgu Hatası:', err);
            db.detach();
            process.exit(1);
        }

        console.log(`${result.length} Adet Ürün Bulundu. Supabase'e Toplu Aktarılıyor...`);

        // Tüm satırları önce hazırla
        const rows = [];
        for (const row of result) {
            const stok_kodu = row.STOKKODU ? row.STOKKODU.toString().trim() : null;
            if (!stok_kodu) continue;

            const stok_adi = row.STOK_ADI ? row.STOK_ADI.toString().trim() : '';
            const aciklama = row.ACIKLAMA1 ? row.ACIKLAMA1.toString().trim() : null;
            const marka = row.MARKASI ? row.MARKASI.toString().trim() : '';
            const model = row.MODELI ? row.MODELI.toString().trim() : '';
            const fiyat = row.FIYAT || 0;
            const dovizRaw = row.DOVIZ_BIRIMI ? row.DOVIZ_BIRIMI.toString().trim() : '';
            const doviz = (!dovizRaw || dovizRaw === 'TL') ? 'TRY' : dovizRaw;
            const miktar = row.MIKTAR || 0;

            // Marka/Model zaten ürün adında yoksa başına ekle
            let tam_ad = stok_adi;
            if (marka && !tam_ad.toLowerCase().includes(marka.toLowerCase())) {
                tam_ad = marka + ' ' + tam_ad;
            }
            if (model && !tam_ad.toLowerCase().includes(model.toLowerCase())) {
                tam_ad = tam_ad + ' ' + model;
            }

            rows.push({
                stok_kodu,
                stok_adi: tam_ad.trim(),
                aciklama: aciklama || null,
                fiyat_doviz: fiyat,
                doviz_tipi: doviz,
                stok_miktari: miktar,
                yil: yil,
                is_processed: false,
                updated_at: new Date().toISOString()
            });
        }

        // 100'lük batch'ler halinde gönder
        let basarili = 0;
        let hatali = 0;
        const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);
            const batchNo = Math.floor(i / BATCH_SIZE) + 1;
            
            try {
                const { error } = await supabase
                    .from('wolvox_taslak')
                    .upsert(batch, { onConflict: 'stok_kodu' });

                if (error) {
                    console.error(`Batch ${batchNo}/${totalBatches} Hatası:`, error.message);
                    hatali += batch.length;
                } else {
                    basarili += batch.length;
                    process.stdout.write(`\rBatch ${batchNo}/${totalBatches} tamamlandı... (${basarili} ürün)`);
                }
            } catch (e) {
                console.error(`Batch ${batchNo} İşlem Hatası:`, e);
                hatali += batch.length;
            }
        }

        console.log(`\n\nSENKRONİZASYON TAMAMLANDI!`);
        console.log(`Başarılı: ${basarili}`);
        console.log(`Hatalı: ${hatali}`);
        
        db.detach();
        process.exit(0);
    });
});
