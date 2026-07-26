// 社宅房號共用選項：報名表單（/register）與現場報到（簽到彈窗）共用同一份，避免兩邊資料漂移
export const BUILDINGS = ['A棟', 'B棟', 'C棟', 'D棟']
export const UNIT_NUMBERS = ['398', '400', '135', '137']
export const FLOORS = Array.from({ length: 17 }, (_, i) => String(i + 2)) // 2 ~ 18
export const SUB_UNITS = Array.from({ length: 20 }, (_, i) => String(i + 1)) // 1 ~ 20

export function formatRoomNumber(building: string, unitNumber: string, floor: string, subUnit: string): string {
  if (!building || !unitNumber || !floor || !subUnit) return ''
  return subUnit === 'none' ? `${building} ${unitNumber}-${floor}F` : `${building} ${unitNumber}-${floor}F-${subUnit}`
}
