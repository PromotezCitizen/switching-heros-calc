/**
 * 히어로 표 · 전용 무기 표의 칸 이름. 히어로마다 등급·성·캐릭터 각성, 전용 무기마다 초월 ★.
 * 등급이 비었으면 미보유, ★ 가 비었으면 미보유 (기본값 비어 있음)
 */
export function rosterGradeField(charId: string): string {
  return `heroOwnedGrade_${charId}`;
}
export function rosterStarField(charId: string): string {
  return `heroOwnedStar_${charId}`;
}
export function rosterAwakenField(charId: string): string {
  return `heroOwnedAwaken_${charId}`;
}
export function rosterAffinityField(charId: string): string {
  return `heroOwnedAffinity_${charId}`;
}
export function exclusiveOwnedStarField(weaponId: string): string {
  return `exclusiveOwnedStar_${weaponId}`;
}
/**
 * 전용 무기마다 "받은 초월 미션 ★" (그 ★ 까지의 초월 미션 보상을 받음). 비어 있으면 초월 ★ 까지 받은 것으로 침.
 * 게임은 받은 미션 번호 목록 (_receivedIds) 으로 계산하고, 미션이 ★ 순서로 열려 낮은 ★ 부터 받는다고 보아 가장 높은 ★ 하나로 받는다
 */
export function exclusiveMissionReceivedStarField(weaponId: string): string {
  return `exclusiveMissionReceivedStar_${weaponId}`;
}
/** 전용 무기마다 강화 레벨 (계산에는 1슬롯 히어로 무기 줄 값만 씀. 1슬롯 히어로를 바꿔도 다시 넣지 않게 무기마다 저장) */
export function exclusiveOwnedLevelField(weaponId: string): string {
  return `exclusiveOwnedLevel_${weaponId}`;
}
