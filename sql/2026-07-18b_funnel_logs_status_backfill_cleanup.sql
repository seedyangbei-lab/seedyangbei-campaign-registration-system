-- 一次性資料清理，非結構變更
--
-- 背景：funnel_logs.status 欄位是這次新增的，ALTER TABLE 當下用 DEFAULT 'pending'
-- 幫所有既有的異常事件（含這個追蹤功能上線前累積的歷史記錄）都填成「待處理」，
-- 導致側邊欄未讀角標一次跳到 17，但實際上只有 2026-07-16 20:02 之後的 3 筆
-- 是這次功能上線後才發生、真的需要人工檢視的事件。
--
-- 這裡把上線前（2026-07-16 12:00 UTC 之前）的歷史異常事件一次性標記為已解決，
-- 讓角標數字回歸「當下真的待處理」的狀態，不要背著兩週份的舊資料當未讀。
-- 已於 2026-07-18 直接透過 Supabase MCP 執行完成，此檔案僅作紀錄用途。

UPDATE funnel_logs
SET status = 'resolved'
WHERE step IN ('register_error', 'register_guard_fail', 'line_login_fail')
  AND created_at < '2026-07-16 12:00:00+00';
