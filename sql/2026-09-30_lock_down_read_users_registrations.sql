-- 資安修復：收回 users／registrations 的公開讀取（交接文件「讀取面」的最後一步）。
-- 這兩張表原本的 SELECT policy 名字寫著「居民只能查自己的 users／registrations」，
-- 但條件寫死 true，任何人只要有公開的 anon key 就能整批撈出所有居民的姓名、電話、房號、報名紀錄。
--
-- 前端讀取已經全部搬到有驗證的 API：
--   - 居民：/api/profile、/api/my-registrations、/api/register（GET 預填）、/api/feedback
--   - 後台：/api/admin/registrations、/api/admin/members
--   - 講師：/api/instructor/registrations
--   - 現場報到搜尋：/api/search-members
-- 前端剩下直接查表的只有「算名額／人數」：首頁、世界頁、講師中台課程列表、成果報告出席人數，
-- 都只用到 registrations 的 course_id、status 兩個欄位，沒有個資。
--
-- ⚠️ 一定要等這版程式碼部署到正式站之後才能執行，否則舊版前端的名單頁面會查詢失敗。
--
-- 做法：
--   - users：anon／authenticated 完全不能讀
--   - registrations：只開放 course_id、status 兩個欄位（欄位層級授權），其他欄位與 users 關聯都讀不到
--   - service_role（API route 用的）不受影響

-- users
DROP POLICY IF EXISTS "居民只能查自己的 users" ON public.users;
REVOKE SELECT ON public.users FROM anon, authenticated;

-- registrations：保留 SELECT policy（列層級仍然全開），但欄位只開放 course_id、status
REVOKE SELECT ON public.registrations FROM anon, authenticated;
GRANT SELECT (course_id, status) ON public.registrations TO anon, authenticated;
