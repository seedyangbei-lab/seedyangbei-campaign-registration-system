-- LINE 登入授權碼的短期快取：同一組 code 第二次打到 callback 時，沿用第一次成功換到的 LINE 身份。
-- 2026-10-03 有一台 Android Chrome 連續 17 次登入全部 invalid_grant（從 9/12 起從未成功過），
-- 連第一次（跳轉後 6 秒）都失敗，研判是有別的請求（連結掃描、預先載入等）先把一次性的 code 用掉了，
-- 使用者自己的請求才拿到「授權碼已失效」。
-- 只存 code 的 SHA-256 雜湊與 LINE 公開個人資料，不存 access token；120 秒後失效。
-- 只有 service role（callback API）會讀寫，開 RLS 但不給任何 policy，anon 完全碰不到。
CREATE TABLE IF NOT EXISTS public.line_login_code_cache (
  code_hash text PRIMARY KEY,
  line_user_id text NOT NULL,
  display_name text,
  picture_url text,
  email text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.line_login_code_cache ENABLE ROW LEVEL SECURITY;
