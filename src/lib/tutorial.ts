// 首次登入教學（4 步驟導覽）共用狀態工具
// step: '1' 選擇課程 -> '2' 前往報名 -> '3' 填寫資料 -> '4' 報名成功
const STEP_KEY = 'yangbei_onboarding_step'
const SEEN_KEY = 'yangbei_seen_onboarding'

export function getTutorialStep(): string | null {
  try { return localStorage.getItem(STEP_KEY) } catch { return null }
}

export function setTutorialStep(step: string) {
  try { localStorage.setItem(STEP_KEY, step) } catch {}
}

export function clearTutorialStep() {
  try { localStorage.removeItem(STEP_KEY) } catch {}
}

export function isTutorialSeen(): boolean {
  try { return localStorage.getItem(SEEN_KEY) === 'true' } catch { return false }
}

// 教學全部結束（或使用者按跳過）：標記已看過，之後不會再自動觸發
export function markTutorialSeen() {
  try { localStorage.setItem(SEEN_KEY, 'true') } catch {}
  clearTutorialStep()
}

// 首頁用：判斷是否該自動開始教學（剛用 LINE 登入、且從未看過教學、且目前沒有進行中的步驟）
export function shouldAutoStartTutorial(): boolean {
  try {
    if (!localStorage.getItem('line_user')) return false
    if (isTutorialSeen()) return false
    if (getTutorialStep()) return false
    return true
  } catch { return false }
}
