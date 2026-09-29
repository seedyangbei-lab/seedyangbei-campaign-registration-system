-- 課程回饋問卷：新增 course_feedbacks 資料表
-- 居民上完課後填寫的課程回饋（取代原本的 Google 表單）。一筆報名紀錄最多一份回饋。
-- 居民基本資料不重複存，一律透過 registration_id／user_id 即時關聯 users 表。
--
-- 填寫規則（由 API route 在伺服器端檢查，這裡不做）：
-- - 課程開始後即可填寫，期限到「課程日期所在月份」的月底 23:59（台灣時間）
-- - 報名狀態為 confirmed（講師尚未點名）或 attended（已出席）才能填
-- - 沒有 LINE 帳號的現場報名者，由講師在中台代填（submitted_by = 'instructor'）
--
-- 題目欄位：五等級題存 1~5（5 = 最正向，例如「非常滿意」「非常足夠」），是非題存 boolean。
-- 之後題目若有調整，用 form_version 區分新舊版本，統計時分開計算。
--
-- 權限：只開 RLS、不建立任何 policy，anon／authenticated 完全不能讀寫。
-- 居民送出、講師代填／查看、後台查看，一律走有身份驗證的 API route（service_role key）。

CREATE TABLE IF NOT EXISTS course_feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  q_admin SMALLINT NOT NULL CHECK (q_admin BETWEEN 1 AND 5),         -- 行政作業（含報名、行前通知等）滿意度
  q_promotion SMALLINT NOT NULL CHECK (q_promotion BETWEEN 1 AND 5), -- 宣傳是否足夠（非常足夠～非常不足）
  q_purpose SMALLINT NOT NULL CHECK (q_purpose BETWEEN 1 AND 5),     -- 清楚活動目的與對社區的影響
  q_content SMALLINT NOT NULL CHECK (q_content BETWEEN 1 AND 5),     -- 活動內容規劃安排是否合適
  q_community BOOLEAN NOT NULL,                                      -- 是否有助於增加社區居民互動
  q_rejoin BOOLEAN NOT NULL,                                         -- 未來是否願意再參與
  comment TEXT,                                                      -- 其他建議與回饋（選填）

  submitted_by TEXT NOT NULL DEFAULT 'resident' CHECK (submitted_by IN ('resident', 'instructor')),
  proxy_instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL, -- 講師代填時記錄是哪位講師
  form_version SMALLINT NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (registration_id)
);

CREATE INDEX IF NOT EXISTS idx_course_feedbacks_course ON course_feedbacks(course_id);
CREATE INDEX IF NOT EXISTS idx_course_feedbacks_user ON course_feedbacks(user_id);

ALTER TABLE course_feedbacks ENABLE ROW LEVEL SECURITY;
