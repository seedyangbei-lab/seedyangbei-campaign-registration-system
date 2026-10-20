-- 海報「邊框英文裝飾」改為預設關閉。舊版預設是開啟，講師存設定時會一併把 borderOn: true 存進去，
-- 所以光改程式預設值不會影響已存過設定的講師。這裡只把 poster_settings 裡的 borderOn 改成 false，
-- 其他設定（配色、字體、照片縮放位置等）完全不動；講師要用的話可在編輯器「裝飾」分頁自行打開。
UPDATE instructors
SET poster_settings = jsonb_set(poster_settings, '{borderOn}', 'false'::jsonb)
WHERE poster_settings ? 'borderOn'
  AND poster_settings->'borderOn' = 'true'::jsonb;
