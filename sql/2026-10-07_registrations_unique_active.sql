-- 同一帳號同一堂課只能有一筆有效報名（已報名 confirmed／已出席 attended）
-- 報名 API 原本預期資料庫會擋重複（撞到 23505 就跳過），但這個限制一直沒建立；
-- 2026-10-07 學員登入過期後重新登入，把整批課又送出一次，產生重複報名。
-- 已取消（cancelled）、未出席（absent）不在限制內：取消後可以重新報名；被標未出席後又現場報到的紀錄也保留。
-- 執行前已先把既有的重複報名改成 cancelled。
CREATE UNIQUE INDEX IF NOT EXISTS registrations_unique_active
  ON public.registrations (course_id, user_id)
  WHERE status IN ('confirmed', 'attended');
