import type { Branch } from './parse'

/**
 * OpenStreetMap(Nominatim) 으로 주소 → 좌표 변환.
 *
 * Nominatim 이용 정책상 초당 1건을 넘길 수 없어 순차 + 대기 방식이다.
 * 결과(실패 포함)를 localStorage 에 캐시해 같은 파일을 다시 올릴 때는 요청이 0건이 된다.
 *
 * ponytail: 무료·무가입 조건이라 도로명 단위 매칭 오차(최대 1~2km)를 감수한다.
 * 정확도가 문제가 되면 카카오 로컬 API 키를 받아 geocodeOne 만 교체하면 된다.
 */

const ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const CACHE_PREFIX = 'geo:v1:'
const THROTTLE_MS = 1100

type GeoResult = { lat: number; lng: number } | { error: string }

function readCache(address: string): GeoResult | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + address)
    return raw ? (JSON.parse(raw) as GeoResult) : null
  } catch {
    return null
  }
}

function writeCache(address: string, result: GeoResult) {
  try {
    localStorage.setItem(CACHE_PREFIX + address, JSON.stringify(result))
  } catch {
    // 저장 공간이 꽉 찬 경우 — 캐시는 없어도 동작하므로 무시
  }
}

export function clearGeocodeCache() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(CACHE_PREFIX)) localStorage.removeItem(key)
  }
}

async function geocodeOne(address: string): Promise<GeoResult> {
  // '서울 서초구 사임당로23길 27' 처럼 뒤에 붙은 상세주소(층/호)는 매칭률을 떨어뜨린다.
  const queries = [address, address.replace(/\s*\d+층.*$/, '').replace(/\s*\(.*?\)\s*$/, '')]
  for (const q of [...new Set(queries)].filter(Boolean)) {
    const url = `${ENDPOINT}?format=json&limit=1&accept-language=ko&q=${encodeURIComponent(q)}`
    let res: Response
    try {
      res = await fetch(url, { headers: { Accept: 'application/json' } })
    } catch {
      return { error: '네트워크 연결에 실패했습니다.' }
    }
    if (!res.ok) return { error: `지도 서버 오류 (${res.status})` }
    const hits = (await res.json()) as { lat: string; lon: string }[]
    if (hits.length > 0) {
      return { lat: Number(hits[0].lat), lng: Number(hits[0].lon) }
    }
  }
  return { error: '이 주소를 지도에서 찾지 못했습니다.' }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * 지점 목록에 좌표를 채운다. 한 건씩 끝날 때마다 onProgress 로 알려주므로
 * 화면에서 진행바와 이미 찾은 지점을 바로 보여줄 수 있다.
 */
export async function geocodeBranches(
  branches: Branch[],
  onProgress: (done: number, total: number, updated: Branch[]) => void,
): Promise<Branch[]> {
  const result = branches.map((b) => ({ ...b }))

  // 같은 주소가 여러 지점에 있으면 요청은 한 번만
  const addresses = [...new Set(result.map((b) => b.address))]
  const resolved = new Map<string, GeoResult>()
  let needsNetwork = false

  for (const address of addresses) {
    const cached = readCache(address)
    if (cached) resolved.set(address, cached)
    else needsNetwork = true
  }

  const apply = () => {
    for (const b of result) {
      const r = resolved.get(b.address)
      if (!r) continue
      if ('error' in r) {
        b.geoError = r.error
      } else {
        b.lat = r.lat
        b.lng = r.lng
        b.geoError = undefined
      }
    }
  }

  apply()
  const pending = addresses.filter((a) => !resolved.has(a))
  onProgress(addresses.length - pending.length, addresses.length, result)
  if (!needsNetwork) return result

  for (let i = 0; i < pending.length; i++) {
    const address = pending[i]
    const r = await geocodeOne(address)
    resolved.set(address, r)
    writeCache(address, r)
    apply()
    onProgress(addresses.length - pending.length + i + 1, addresses.length, result)
    if (i < pending.length - 1) await sleep(THROTTLE_MS)
  }

  return result
}
