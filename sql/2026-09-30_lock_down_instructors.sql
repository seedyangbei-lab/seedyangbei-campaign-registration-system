-- 資安修復：收緊 instructors 表。
-- 原本掛著 instructors_public_read/insert/update/delete 四條 policy（roles: public, qual: true），
-- 任何人只要有公開的 anon key 就能：
--   1. 讀出每位講師的 claim_token（綁定邀請碼），自己拿去綁定冒充講師
--   2. 直接把某位講師的 line_user_id 改成自己的 LINE 帳號，冒充講師登入中台
--   3. 任意新增／修改／刪除講師
--
-- 前端已經改成：
--   - 後台講師管理 → /api/admin/instructors、/api/admin/instructors/[id]（後台 token）
--   - 講師中台「我是誰」、個人資料、海報設定 → /api/instructor/me（講師 token）
-- 前端已經沒有任何地方寫 instructors，也沒有任何地方讀／篩選 line_user_id、claim_token。
--
-- ⚠️ 一定要等上面那版程式碼部署到正式站之後才能執行：舊版前端有 select('*') 跟
--    .eq('line_user_id', ...)，欄位權限收掉之後會直接查詢失敗（講師中台會進不去）。
--
-- 做法：
--   - 拿掉 insert/update/delete policy，並收回 anon／authenticated 的寫入權限
--   - 讀取改成欄位層級授權：只開放公開欄位（首頁課程卡片、講師名單、海報會用到），
--     line_user_id、claim_token、claim_token_expires_at 對 anon／authenticated 完全不可讀
--   - 公開欄位清單要跟 src/lib/instructorColumns.ts 的 INSTRUCTOR_PUBLIC_COLUMNS 保持一致
--   - service_role（API route 用的）不受影響

DROP POLICY IF EXISTS "instructors_public_insert" ON public.instructors;
DROP POLICY IF EXISTS "instructors_public_update" ON public.instructors;
DROP POLICY IF EXISTS "instructors_public_delete" ON public.instructors;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.instructors FROM anon, authenticated;

REVOKE SELECT ON public.instructors FROM anon, authenticated;
GRANT SELECT (id, name, bio, avatar_url, phone, line_id, is_active, created_at, updated_at, poster_settings)
  ON public.instructors TO anon, authenticated;
