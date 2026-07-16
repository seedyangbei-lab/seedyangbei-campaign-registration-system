-- 出席狀態新增第三態「absent（未出席）」
-- registrations.status 這次會多出現一個新值 'absent'（原本只有 confirmed / attended / cancelled）
-- 這份腳本會先檢查 status 欄位有沒有設 CHECK constraint 限制允許的值，
-- 如果有，就把它換成一份包含 absent 在內的新規則；如果本來就沒有限制（單純文字欄位），這份腳本不會做任何事，可以放心整份直接執行。

DO $$
DECLARE
  con_name text;
BEGIN
  SELECT con.conname INTO con_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_attribute att ON att.attrelid = rel.oid
  WHERE rel.relname = 'registrations'
    AND con.contype = 'c'
    AND att.attname = 'status'
    AND att.attnum = ANY(con.conkey)
  LIMIT 1;

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE registrations DROP CONSTRAINT %I', con_name);
    ALTER TABLE registrations
      ADD CONSTRAINT registrations_status_check
      CHECK (status IN ('confirmed', 'attended', 'cancelled', 'absent'));
    RAISE NOTICE '已將舊的 constraint（%）換成包含 absent 的新規則', con_name;
  ELSE
    RAISE NOTICE 'status 欄位目前沒有 CHECK constraint，不需要調整，absent 可以直接寫入';
  END IF;
END $$;

-- 執行完可以順手跑這段確認結果（非必要，純粹檢查用）：
-- SELECT con.conname, pg_get_constraintdef(con.oid)
-- FROM pg_constraint con
-- JOIN pg_class rel ON rel.oid = con.conrelid
-- WHERE rel.relname = 'registrations' AND con.contype = 'c';
