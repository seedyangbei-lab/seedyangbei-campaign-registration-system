-- 新增「對外顯示講師」：一凡姐這類種子戶會用自己的中台幫其他種子戶開課、做海報，
-- 開課的人一定在 instructor_ids 裡，海報與課程卡就會一起掛上開課者的名字。
-- 這個欄位讓開課的人勾選對外（海報、首頁課程卡、居民報名紀錄）要顯示哪幾位講師；
-- instructor_ids 不變，課後報告、權限、後台統計照舊認列所有講師。
-- NULL 或空陣列 = 顯示 instructor_ids 全部（既有課程不需回填，上版後顯示不變）
ALTER TABLE courses ADD COLUMN IF NOT EXISTS display_instructor_ids UUID[];

COMMENT ON COLUMN courses.display_instructor_ids IS '對外顯示的講師（instructor_ids 的子集）：海報、課程卡、居民報名紀錄只顯示這幾位；NULL＝顯示 instructor_ids 全部';
