-- 課程開始後不再檢查名額（2026-10-17 決定）
-- 開課後還在報名的幾乎都是人已經在現場、想用手機直接報名的居民；
-- 這時候名額常被「有報名但沒來、講師還沒標未出席」的人佔著，照名額擋會讓現場的人報不了。
-- courses.date + time_start 是台灣當地時間，轉成 Asia/Taipei 再跟 now() 比。

CREATE OR REPLACE FUNCTION enforce_registration_capacity()
RETURNS trigger AS $$
DECLARE
  seats integer;
  starts_at timestamptz;
  current_count integer;
BEGIN
  IF NEW.status IS DISTINCT FROM 'confirmed' THEN
    RETURN NEW;
  END IF;

  SELECT max_seats, (date + time_start) AT TIME ZONE 'Asia/Taipei'
    INTO seats, starts_at
    FROM courses WHERE id = NEW.course_id;
  IF seats IS NULL THEN
    RETURN NEW;
  END IF;

  IF starts_at IS NOT NULL AND now() >= starts_at THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO current_count FROM registrations
    WHERE course_id = NEW.course_id AND status IN ('confirmed', 'attended');

  IF current_count >= seats THEN
    RAISE EXCEPTION '這堂課已達報名人數上限，請選擇其他場次'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
