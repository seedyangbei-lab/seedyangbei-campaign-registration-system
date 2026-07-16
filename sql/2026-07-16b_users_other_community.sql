-- 非社宅居民「所在社區」欄位比照社宅居民房號，記在 users 身上才能跨次報名記住
-- 用途：/register 報名表單，非社宅居民填寫的「請說明來自哪個社區」目前只存在 registrations（每次報名各自一筆），
--       下次再報名時無從還原；這欄改存在 users，讓 prefillUserData 能跟社宅居民房號一樣自動帶入
-- 舊資料不受影響：新欄位預設 NULL，既有帳號視同尚未填寫，下次填了就會開始記住

ALTER TABLE users ADD COLUMN IF NOT EXISTS other_community text;
