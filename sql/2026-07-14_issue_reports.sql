-- 中台「問題通報」功能：新增 issue_reports 資料表
-- 講師於 /instructor 送出問題回報（問題類型、描述、截圖），供大後台查看

CREATE TABLE IF NOT EXISTS issue_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open', -- open / resolved
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_reports_created ON issue_reports(created_at DESC);

ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允許寫入" ON issue_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "允許讀取" ON issue_reports FOR SELECT USING (true);
