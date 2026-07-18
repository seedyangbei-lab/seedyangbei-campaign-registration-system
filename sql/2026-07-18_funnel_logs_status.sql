-- 系統偵測異常事件（funnel_logs）新增可調整狀態欄位
-- 讓 /admin/health 的系統偵測列可以跟講師回報一樣切換 待處理／處理中／已解決
-- 已於 2026-07-18 直接透過 Supabase MCP 執行完成，此檔案僅作紀錄用途

ALTER TABLE funnel_logs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_funnel_logs_anomaly_status
  ON funnel_logs(status)
  WHERE step IN ('register_error', 'register_guard_fail', 'line_login_fail');

-- 補充：funnel_logs 原本只有 INSERT／SELECT 的 RLS policy，沒有 UPDATE policy，
-- 導致前台狀態切換寫入時被 RLS 靜默擋掉（回傳成功但實際 0 筆受影響），
-- 造成畫面上顯示「已解決」但資料庫其實還是「待處理」的不一致。
-- 已於 2026-07-18 直接透過 Supabase MCP 執行完成，此處僅作紀錄用途。
CREATE POLICY "允許所有人更新 funnel_logs" ON funnel_logs FOR UPDATE USING (true) WITH CHECK (true);
