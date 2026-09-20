-- 資安修復：收緊 courses／registrations／users 三張表的「寫入」RLS。
-- 這三張表原本各自掛著 Allow all／allow_all_* 系列 policy（roles: public, qual: true,
-- with_check: true），任何人只要有公開的 anon key 就能直接 insert/update/delete，
-- 完全繞過後台/講師/居民各自的登入與擁有權檢查。
--
-- 到這次為止，後台、講師端、現場報到、居民報名四個角色的寫入路徑都已經搬到有身份驗證的
-- API route（一律用 service_role key，這個角色本來就有 BYPASSRLS，不受 RLS 限制），
-- 前端／元件已經沒有任何地方直寫這三張表，因此 anon／authenticated 不再需要任何寫入權限，
-- 直接收回。收回後這三張表對 anon／authenticated 只剩 SELECT（沿用既有的
-- courses_public_read／「居民只能查自己的 users」／「居民只能查自己的 registrations」）。
--
-- 注意：這三條保留下來的 SELECT policy 目前 qual 也是寫死 true（其中兩條名字寫著
-- 「居民只能查自己的」，但條件並沒有真的限制），等於讀取目前仍是完全公開。
-- 這是比這次任務範圍更大、風險也不小的獨立問題（後台/講師/居民很多頁面都還是前端
-- 直接用 anon key 查表），留待下一輪比照這次寫入遷移的節奏、一步一步搬到有驗證的
-- API route 之後才能收緊，不在這次一起處理。

DROP POLICY IF EXISTS "Allow all for courses" ON public.courses;
DROP POLICY IF EXISTS "courses_public_insert" ON public.courses;
DROP POLICY IF EXISTS "courses_public_update" ON public.courses;
DROP POLICY IF EXISTS "courses_public_delete" ON public.courses;

DROP POLICY IF EXISTS "allow_all_registrations" ON public.registrations;
DROP POLICY IF EXISTS "allow_all_users" ON public.users;
