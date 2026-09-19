-- 修補資安漏洞：get_secret() / trigger_auto_debug() 原本任何人（含未登入的 anon）
-- 都能透過 Supabase REST API（/rest/v1/rpc/...）呼叫，等於能把 Vault 裡的任何密鑰
-- （包含 cron_shared_secret）讀出來，或任意觸發 auto-debug。
-- 這兩支函式實際只給內部 pg_cron 排程（yangbei-auto-debug-cron）呼叫，
-- 不需要對外開放，直接收回 anon／authenticated 的執行權限即可。

REVOKE EXECUTE ON FUNCTION public.get_secret(text) FROM anon, authenticated;

-- trigger_auto_debug() 建立時沒收回過 PUBLIC 的預設執行權限，光是收回 anon／authenticated
-- 不夠（anon／authenticated 會透過 PUBLIC 繼續繼承權限），要連 PUBLIC 一起收回，
-- 再明確把權限給回真正需要呼叫它的 service_role（pg_cron 排程本身是用 postgres 執行，不受影響）。
REVOKE EXECUTE ON FUNCTION public.trigger_auto_debug() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trigger_auto_debug() TO service_role;
