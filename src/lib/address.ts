// 社宅房號共用選項：報名表單（/register）與現場報到（簽到彈窗）共用同一份，避免兩邊資料漂移
export const BUILDINGS = ['A棟', 'B棟', 'C棟', 'D棟']
export const UNIT_NUMBERS = ['398', '400', '135', '137']
export const FLOORS = Array.from({ length: 17 }, (_, i) => String(i + 2)) // 2 ~ 18（C 棟）
export const FLOORS_HIGH = Array.from({ length: 20 }, (_, i) => String(i + 2)) // 2 ~ 21（A、B、D 棟樓層較高）
export const SUB_UNITS = Array.from({ length: 20 }, (_, i) => String(i + 1)) // 1 ~ 20

// A、B、D 棟樓層蓋得比 C 棟高，選這三棟時樓層下拉選單要放寬到 21 樓
export function getFloors(building: string): string[] {
  return building === 'A棟' || building === 'B棟' || building === 'D棟' ? FLOORS_HIGH : FLOORS
}

export function formatRoomNumber(building: string, unitNumber: string, floor: string, subUnit: string): string {
  if (!building || !unitNumber || !floor || !subUnit) return ''
  return subUnit === 'none' ? `${building} ${unitNumber}-${floor}F` : `${building} ${unitNumber}-${floor}F-${subUnit}`
}
