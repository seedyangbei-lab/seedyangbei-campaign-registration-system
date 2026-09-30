# 央北社宅活動報名系統 — 資安修復進度交接（第三份，接續第二份）

repo: `seedyangbei-lab/seedyangbei-campaign-registration-system`
分支：這一輪在 `claude/sweet-lovelace-ba98k7` 開發，每一步都 fast-forward 合併進 `main`，
`main` 目前最新是 `483a81a`，所有下列修改都已上線並在正式站測試通過。
Supabase project id: `jiquqxptrpivqhsovmrv`

## 這一輪的結論

第二份交接文件的「讀取面」全部完成：**居民的姓名、電話、房號、報名紀錄，現在已經不能再用公開的
anon key 從 Supabase 直接撈出來**。後台／講師／居民三個角色讀寫 `users`／`registrations` 的
地方全部改走有驗證的 API route，資料庫權限也已經收緊並實測過。

另外順手補了三個比讀取更急的洞（兩支完全沒驗證的 API、`instructors` 表任何人都能改），
以及居民登入體驗的調整（過期直接登出、效期延長為 180 天並自動續期）。

## 已完成（依上線順序，全部已合併進 main、正式站測試通過）

### 1. 居民端三小點（commit `6d917fc`）
- `/profile` 改呼叫新增的 **`GET /api/profile`**（resident token）：本人報名紀錄、點數、兌換申請、點數紀錄
- 兌換獎勵改呼叫新增的 **`POST /api/redeem`**：點數、品項上架／庫存、同品項是否已有待審申請，全部在伺服器檢查
- `/api/cancel-registration`、`/api/my-registrations` 改從 `x-resident-token` 解身份，不再信任前端傳的 `lineUserId`
- 刪除 `/api/member-points`（只收 `?line_user_id=`，任何人都能查別人點數）

### 2. 後台讀取＋兩支沒驗證的 API（commit `ad09ef2`）
- 新增 **`GET /api/admin/registrations`**（admin token）：支援 `courseId`／`userId`／`lineUserId`／`statuses`／
  `view=participation`（會員管理統計用的精簡欄位）／`order`。取代 `/admin` 首頁、報名名單、課程出席名單、
  會員管理頁的 anon 直查
- 會員管理頁改成進頁面一次撈回參與紀錄，參與次數、走勢圖、月份細項、個人走勢都在前端算
- **`/api/admin/members` 原本完全沒驗證**（任何人打網址就拿到全部會員），補上 admin token，
  並附上 LINE 會員對應的房號（`user_room_number`）供編輯表單預填
- **`/api/instructor/generate-claim-link` 原本沒驗證**（任何人都能產生講師綁定連結冒充講師），補上 admin token
- 現場報到彈窗（`WalkInRegistrationModal`）搜尋既有居民改由 `/api/search-members` 一併查 `users`，
  回傳格式改為 `{ users, lineMembers }`

### 3. `instructors` 表（commit `27b42dd`＋SQL `sql/2026-09-30_lock_down_instructors.sql`，已套用）
原本 `instructors` 四條 policy 全開，任何人都能讀出 `claim_token`、**把某位講師的 `line_user_id`
改成自己的 LINE 帳號冒充講師**、新增／刪除講師。
- 新增 **`/api/admin/instructors`**（GET/POST）、**`/api/admin/instructors/[id]`**（PATCH/DELETE，
  解除綁定用 `{ unbind: true }`）。列表不回傳邀請碼與綁定帳號，只回傳 `is_bound`／`has_active_claim`
- 新增 **`/api/instructor/me`**（GET/PATCH，instructor token）：講師中台各頁「目前登入的講師是誰」、
  個人資料、海報樣式設定。**後台解除綁定後，講師手上還沒過期的 token 立即失效**
- 可公開的欄位清單集中在 `src/lib/instructorColumns.ts`（`INSTRUCTOR_PUBLIC_COLUMNS`），要跟 SQL 的欄位授權保持一致
- 資料庫：拿掉 insert/update/delete policy 並收回寫入權限；讀取改成**欄位層級授權**，
  `line_user_id`、`claim_token`、`claim_token_expires_at` 對 anon 完全不可讀

### 4. 講師讀取＋收回 users／registrations 公開讀取（commit `0e07592`＋SQL `sql/2026-09-30_lock_down_read_users_registrations.sql`，已套用）
- 新增 **`GET /api/instructor/registrations`**（instructor token，確認課程 `instructor_ids` 包含本人）：
  取代講師中台出席點名（電腦版彈窗／手機版頁面）、報名紀錄的 anon 直查
- `/api/register` 新增 **GET**：報名表單預填本人上次填的資料（原本用 anon key 依自稱的 lineUserId 查 `users`）
- 資料庫：
  - `users`：拿掉「居民只能查自己的 users」（qual 寫死 true 的那條），anon／authenticated **完全不能讀**
  - `registrations`：只開放 **`course_id`、`status`** 兩欄（欄位層級授權），給首頁／世界頁算名額、
    講師中台課程列表算人數、成果報告算出席人數用，沒有個資

### 5. 前台居民登入體驗（commit `308eae7`、`483a81a`）
- **過期直接登出**：`src/lib/resident-auth.ts` 新增 `getStoredLineUser()`，檢查 `residentToken` 到期時間
  （預留 5 分鐘緩衝），過期或舊登入沒有 token 就清掉 `localStorage.line_user` 當作未登入。
  導覽列、課程卡片、報名頁、個人頁、回饋頁、首次登入提示、教學導覽都改用這個檢查。
  原本最常踩到的是課程卡片：選完課只看有沒有 `line_user` 就跳過 LINE 登入，填完報名表送出才被擋
- 導覽列到期自動登出並提示「登入已過期」，手機切回頁面時再檢查一次（背景時計時器會暫停）
- **居民登入效期改為 180 天**（`RESIDENT_TOKEN_TTL_MS`）：居民多為長輩，重新登入是負擔。
  新增 **`POST /api/resident/refresh`**：導覽列載入時，token 簽出超過一天就用舊 token 換一張新的
  180 天 token（伺服器先驗證舊 token 有效才簽）。等於半年內來過一次就不用重新登入
- 後台／講師端效期維持 12 小時，沒動

## 目前資料庫權限現況（2026-09-30 查詢）

已收緊、不用再動：

| 表 | 狀態 |
|---|---|
| `users` | anon 完全不能讀寫 |
| `registrations` | anon 只能讀 `course_id`、`status`，不能寫 |
| `courses` | anon 只能讀，不能寫 |
| `instructors` | anon 只能讀公開欄位，不能寫 |
| `course_feedbacks` | RLS 開著、沒有任何 policy，anon 完全不能讀寫（一律走 `/api/feedback`） |
| `line_members` | anon **讀不到**（表層級 SELECT 早就被收回），但見下方「仍可寫入」 |

**還沒處理（任何人有 anon key 就能寫入）**，建議優先順序：

1. **`line_members` 可以 INSERT／UPDATE**：讀不到，但可以不帶條件整批 `update`（例如把所有人的點數、
   棟別戶號改掉），也能塞假會員。點數功能目前沒開，但棟別戶號資料本身會被竄改。
   **前端已經沒有任何地方直接寫 `line_members`**（後台編輯走 `/api/admin/members/[id]`、手動加點走
   `/api/attendance`、LINE callback 用 service role），所以**不用改程式碼，可以直接收回寫入權限**：
   拿掉 `line_members_public_insert`／`line_members_public_update` 兩條 policy、
   `REVOKE INSERT, UPDATE, DELETE ON public.line_members FROM anon, authenticated;`，工作量最小，建議下次第一個做
2. **`site_settings` 可以 INSERT／UPDATE**：網站設定（含 `points_enabled`、報告期限等）任何人都能改。
   寫入端：`admin/settings/page.tsx`、`admin/rewards/page.tsx`
3. **Storage（`images`、`course-posters` bucket）可以上傳／覆蓋／刪除**：任何人都能刪掉或替換課程海報、
   講師頭像。寫入端很多：後台課程／講師／設定頁、講師中台、海報編輯器、`IssueReportModal`
4. **點數相關**：`redemptions`、`point_logs`、`reward_items` 有一條叫「Service role full access」的 policy，
   但 roles 是 `public`，等於 anon 全開。寫入端：`admin/rewards/page.tsx`。**點數功能目前沒有開啟，使用者決定先不處理**
5. 其他全開寫入的表（資料敏感度較低，但一樣能被亂改／刪除）：
   - `checkin_events`、`checkin_records`（`admin/checkin`、`instructor/checkin`）
   - `course_categories`（`admin/categories`、`admin/courses`）
   - `course_reports`（`instructor/report`）
   - `course_edit_logs`（只開 insert）
   - `issue_reports`、`funnel_logs`（前台回報／漏斗紀錄，本來就需要匿名寫入，但 UPDATE／SELECT 也全開，
     `funnel_logs` 的 SELECT 會讓任何人讀到所有紀錄）
6. **`admin_users`**：有 `password_hash` 欄位，SELECT 對 anon 全開。**目前 0 筆資料，程式碼也沒有任何地方用到**，
   風險低，但建議直接收回 anon 權限或把表刪掉。`seed_users` 同樣沒被程式碼使用

## 這一輪的做法與踩過的坑（延續前兩份）

- **「先上程式碼、再改資料庫」順序不能反**：舊版前端有 `select('*')` 或篩選被藏起來的欄位，
  先改資料庫會讓頁面整個查不到資料。這一輪每一步都是：合併 → 使用者在正式站測試 → 才套用 SQL。
- **欄位層級授權比整張表收回更好用**：公開頁面還需要部分欄位時（`instructors` 的姓名、
  `registrations` 的 `course_id`／`status`），用 `REVOKE SELECT ON t FROM anon, authenticated;
  GRANT SELECT (欄位...) ON t TO anon, authenticated;`，前端不用改。注意：
  - 之後 anon 查詢**不能用 `select('*')`**，也不能用沒授權的欄位篩選或排序，否則直接 42501
  - `count` 查詢（`{ count: 'exact', head: true }`）要 select 一個有授權的欄位（例如 `course_id`）
- **套用 SQL 前先在交易裡演練**：用 `execute_sql` 跑 `begin; …SQL…; set local role anon; …測試查詢…; rollback;`，
  拒絕的情況用 `do $$ begin … exception when insufficient_privilege then … end $$;` 接住，
  結果寫進 temp table 再 select 出來。正式資料庫完全不會被改到，確認沒問題才 `apply_migration`。
- **查權限現況**：除了 `pg_policies`，也要看 `has_table_privilege`／`has_column_privilege`。
  這一輪發現 `line_members` 雖然有 SELECT policy，但表層級 SELECT 早被收回，實際上讀不到——只看 policy 會誤判。
- **Next.js route 檔案不能 export handler 以外的東西**（例如共用的 helper function），build 會失敗，要放進 `src/lib/`。
- **`setTimeout` 超過約 24.8 天會溢位變成立刻觸發**：居民 token 180 天，導覽列的自動登出計時器已處理。
- **這個雲端環境的網路擋 `supabase.co`**，沒辦法直接用 anon key 打 REST API 測試，改用上面的 SQL 演練。
- **這個環境看不到 Vercel 部署紀錄**（403），每次合併後要請使用者到 Vercel 後台確認部署完成。
- `npx next lint` 在這個 repo 會跳互動式設定並改到 `tsconfig.json`，不要用；型別檢查用 `npx tsc --noEmit -p .`，
  完整檢查用 `npx next build`（需要帶假的 `NEXT_PUBLIC_SUPABASE_URL` 等環境變數），build 完記得
  `git checkout tsconfig.json` 並刪掉 `.next`。
- 講師／居民的 LINE 登入沒辦法在 preview 網址測（redirect_uri 寫死正式站），一律在正式站測。

## 各角色 API 對照（目前全貌）

| 角色 | 驗證方式 | API |
|---|---|---|
| 後台 | `x-admin-token`（`ADMIN_TOKEN_SECRET`，12 小時） | `/api/admin/courses[/id]`、`/api/admin/registrations[/id]`、`/api/admin/members[/id]`、`/api/admin/instructors[/id]`、`/api/admin/feedback[/courseId]`、`/api/admin/save-schedule-settings`、`/api/instructor/generate-claim-link` |
| 講師 | `x-instructor-token`（`INSTRUCTOR_TOKEN_SECRET`，12 小時，token 內含 instructorId） | `/api/instructor/me`、`/api/instructor/courses[/id]`、`/api/instructor/registrations[/id]` |
| 後台或講師 | 兩種 token 擇一 | `/api/attendance`、`/api/walk-in-registration`、`/api/search-members`、`/api/feedback-counts` |
| 居民 | `x-resident-token`（`RESIDENT_TOKEN_SECRET`，180 天＋自動續期，token 內含 lineUserId） | `/api/profile`、`/api/register`（GET 預填／POST 報名）、`/api/redeem`、`/api/cancel-registration`、`/api/my-registrations`、`/api/feedback`、`/api/resident/refresh` |
