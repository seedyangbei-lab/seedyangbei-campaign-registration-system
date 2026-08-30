-- 問題：前台報名完全沒有檢查名額，已報名人數會超過課程「預設開課人數」(courses.max_seats)
-- 修法：在 registrations 新增一筆「confirmed」報名時，於 DB 層擋下超額報名，
--       避免多人同時搶名額造成的競態問題（純前端檢查無法完全避免）
-- 不影響現場報到：admin 後台現場登記報到是直接寫入 status='attended'，不會觸發這個檢查，
--       讓工作人員仍可視現場狀況彈性讓人入場

CREATE OR REPLACE FUNCTION enforce_registration_capacity()
RETURNS trigger AS $$
DECLARE
  seats integer;
  current_count integer;
BEGIN
  IF NEW.status IS DISTINCT FROM 'confirmed' THEN
    RETURN NEW;
  END IF;

  SELECT max_seats INTO seats FROM courses WHERE id = NEW.course_id;
  IF seats IS NULL THEN
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

DROP TRIGGER IF EXISTS trg_enforce_registration_capacity ON registrations;
CREATE TRIGGER trg_enforce_registration_capacity
  BEFORE INSERT ON registrations
  FOR EACH ROW EXECUTE FUNCTION enforce_registration_capacity();
