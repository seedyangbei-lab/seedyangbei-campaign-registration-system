-- 讓後臺可對「單一課程」個別調整成果報告繳交期限
-- 有值時優先於全站預設的 report_deadline_days 天數計算
ALTER TABLE courses ADD COLUMN IF NOT EXISTS report_deadline_extended_to DATE;

COMMENT ON COLUMN courses.report_deadline_extended_to IS '成果報告個別延長期限（覆蓋 site_settings.report_deadline_days 的計算結果），NULL 代表沿用預設期限';
