-- 新增「講師欄位設定」：決定課程卡片對外要顯示個別講師姓名，還是固定顯示「央北種子戶聯合主辦」
-- （央北種子戶全體合辦的集合型活動，如中秋共好日，實際出力名單改用簽到表核實，不靠這個欄位顯示）
ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_mode TEXT NOT NULL DEFAULT 'single'
  CHECK (instructor_mode IN ('single', 'multiple', 'community'));

COMMENT ON COLUMN courses.instructor_mode IS '講師欄位設定：single=單一講師、multiple=多位講師（顯示 instructor_ids 姓名）、community=央北種子戶聯合主辦（對外固定顯示文字，不顯示個別姓名）';

-- 既有課程回填：依原本 instructor_ids 是否有多人，落在「單一」或「多位講師」，
-- 確保這次上版對所有既有課程的卡片顯示是無感的，不會有人因為這次改動突然變樣
UPDATE courses SET instructor_mode = 'multiple' WHERE array_length(instructor_ids, 1) > 1;
