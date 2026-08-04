import type { Branch } from './parse'

/** 비정상 장비가 1개 이상이면 이상 지점 — 지도·목록의 빨간 표시 기준. */
export const isAbnormal = (b: Pick<Branch, 'abnormal'>) => b.abnormal >= 1

/** Leaflet 은 CSS 변수를 못 읽어서 색을 직접 지정한다. Tailwind red-600 / blue-600. */
export const MARKER_COLOR = {
  abnormal: '#dc2626',
  ok: '#2563eb',
} as const
