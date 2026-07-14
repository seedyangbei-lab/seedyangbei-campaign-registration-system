-- 講師回報處理狀態擴充為三態：pending（待處理）/ in_progress（處理中）/ resolved（已解決）
-- 對應「系統健康」頁面查看詳情彈窗可切換狀態

ALTER TABLE issue_reports ALTER COLUMN status SET DEFAULT 'pending';
UPDATE issue_reports SET status = 'pending' WHERE status = 'open';

-- 原本的遷移只開放 INSERT / SELECT，沒有 UPDATE 政策，
-- 導致「查看詳情」彈窗切換狀態時會被 RLS 擋下、存不進去，這裡補上
CREATE POLICY "允許更新" ON issue_reports FOR UPDATE USING (true) WITH CHECK (true);
