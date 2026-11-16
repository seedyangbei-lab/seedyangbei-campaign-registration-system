-- 系列課程標記：同一門課在不同日期各開一堂（courses 仍是每天一筆），用同一個 series_key 串起來。
-- 海報編輯器與後台「批次匯出海報」會把同 series_key 的各堂課併成一張海報。NULL＝單次課程，行為不變。
-- （此 migration 已於 2026-11-16 直接套用到線上資料庫，這裡補檔以保持程式碼庫與資料庫一致）
alter table public.courses add column if not exists series_key text;
comment on column public.courses.series_key is '系列課程標記：同一個值＝同一門課在不同日期開的多堂（海報與前台可合併顯示）；NULL＝單次課程';
create index if not exists courses_series_key_idx on public.courses (series_key) where series_key is not null;
