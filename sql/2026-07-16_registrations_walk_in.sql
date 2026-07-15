-- 現場報到（無網路報名居民）支援：registrations 新增 is_walk_in 欄位
-- 用途：區分「現場臨時登記」與「線上 LINE 報名」的報名紀錄，供中台／後台簽到彈窗顯示標籤
-- 舊資料不受影響：DEFAULT false 會自動套用到所有既有資料列，不需額外回填

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS is_walk_in boolean NOT NULL DEFAULT false;
