-- Motor'dan teslim fikri birakildi: metin artik Icerik Plani formunda yazilip
-- dogrudan secilen seslendirmene gidiyor, yani kartin bir ai_scripts satirina
-- isaret etmesi gerekmiyor. Kullanilmayan kolon ve indeksi kaldiriyoruz;
-- semada yazan her sey gercekten kullanilsin.
--
-- Kolon hic veri tasimadi (tek yonlu, yeni ozellikle birlikte eklenmisti), bu
-- yuzden dusurmek guvenli.
DROP INDEX IF EXISTS idx_content_queue_script;
ALTER TABLE content_queue DROP COLUMN IF EXISTS script_id;
