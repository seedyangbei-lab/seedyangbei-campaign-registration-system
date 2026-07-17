-- 講師成果報告功能：新增 course_reports 資料表
-- 課程結束後，講師需在期限內（預設 7 天，可於 site_settings 調整）填寫成果報告，
-- 供大後台（接案團隊）依課程查看。一份報告對應一場課程，不對應單一講師身份
-- （多講師課程由任一綁定講師代填即可，跟課程編輯權限邏輯一致）。
--
-- 「活動名稱/日期/時間」永遠即時抓 courses 表，不重複存；
-- 「合作夥伴」＝該課程 instructor_ids 扣掉提交者本人，即時算，也不重複存；
-- 「活動簡介」預設帶入 courses.description，「參與人數」預設帶入 registrations 表 status='attended' 的數量，
-- 兩者都存進本表（可能被講師手動修正過，跟 courses/registrations 當下數字不一定一致）。

CREATE TABLE IF NOT EXISTS course_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
  summary TEXT,                          -- 活動簡介，預設帶 courses.description，可編輯
  participant_count INTEGER,             -- 活動參與人數，預設帶出席紀錄數，可編輯
  signin_photo_urls TEXT[] DEFAULT '{}', -- 簽到表照片（給城鄉發展局的實體佐證）
  reflection TEXT NOT NULL,              -- 心得感想
  photo_urls TEXT[] DEFAULT '{}',        -- 活動紀錄照片
  submitted_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_reports_course ON course_reports(course_id);
CREATE INDEX IF NOT EXISTS idx_course_reports_instructor ON course_reports(instructor_id);

ALTER TABLE course_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允許寫入" ON course_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "允許更新" ON course_reports FOR UPDATE USING (true);
CREATE POLICY "允許讀取" ON course_reports FOR SELECT USING (true);

-- 成果報告填寫期限（天數），預設 7 天，可在 /admin/settings 之後開放調整
INSERT INTO site_settings (key, value, updated_at)
VALUES ('report_deadline_days', '7', now())
ON CONFLICT (key) DO NOTHING;
