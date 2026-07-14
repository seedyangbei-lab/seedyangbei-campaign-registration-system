-- 講師回報處理狀態擴充為三態：pending（待處理）/ in_progress（處理中）/ resolved（已解決）
-- 對應「系統健康」頁面查看詳情彈窗可切換狀態

ALTER TABLE issue_reports ALTER COLUMN status SET DEFAULT 'pending';
UPDATE issue_reports SET status = 'pending' WHERE status = 'open';
