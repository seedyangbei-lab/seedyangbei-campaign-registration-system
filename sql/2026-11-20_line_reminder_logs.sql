-- 上課前一天 LINE 提醒的發送紀錄（/api/cron/course-reminders 每天傍晚寫入）
-- 一個人、一個上課日只會有一筆：同一人隔天有多堂課合併成一則，排程重跑也不會重複發送。
-- status：sent（LINE 已收下）、failed（LINE 回錯誤）、skipped_quota（當月額度不足，沒發）
-- 只有 service role（cron API）會讀寫，開 RLS 但不給任何 policy，anon 完全碰不到。
-- 已於 2026-11-20 直接透過 Supabase MCP 執行完成，此檔案僅作紀錄用途
CREATE TABLE IF NOT EXISTS public.line_reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_date date NOT NULL,
  line_user_id text NOT NULL,
  course_ids uuid[] NOT NULL,
  status text NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (line_user_id, course_date)
);
CREATE INDEX IF NOT EXISTS idx_line_reminder_logs_created_at ON public.line_reminder_logs (created_at);
ALTER TABLE public.line_reminder_logs ENABLE ROW LEVEL SECURITY;
