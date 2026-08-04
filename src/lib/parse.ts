import * as XLSX from 'xlsx'

export type Equipment = {
  name: string
  total: number
  normal: number
  abnormal: number
}

export type Branch = {
  id: string
  name: string
  address: string
  equipment: Equipment[]
  total: number
  normal: number
  abnormal: number
  lat?: number
  lng?: number
  geoError?: string
}

type Field = 'abnormal' | 'normal' | 'total' | 'address' | 'name' | 'equipment'

/**
 * 헤더 이름으로 열을 찾는다. 순서가 중요하다:
 * - '정상수량'은 '비정상수량'의 부분 문자열이므로 abnormal 을 먼저 확정해야 한다.
 * - '수량'은 '정상수량'에도 들어있으므로 total 은 그 다음이다.
 * - '주소'는 '지점 주소' 같은 헤더에서 name 보다 우선해야 한다.
 */
const FIELD_KEYWORDS: [Field, string[]][] = [
  ['abnormal', ['비정상', '불량', '이상', '장애', 'abnormal']],
  ['normal', ['정상', '양호', 'normal']],
  ['total', ['보유', '총수량', '수량', 'total']],
  ['address', ['주소', '소재지', 'address']],
  ['name', ['지점', '이름', '지사', '사업장', '센터', 'name']],
  ['equipment', ['장비', '설비', '모델', 'equipment']],
]

const LABEL: Record<Field, string> = {
  abnormal: '비정상수량',
  normal: '정상수량',
  total: '보유수량',
  address: '주소',
  name: '지점명',
  equipment: '장비명',
}

const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, '').toLowerCase()

export function matchHeaders(headers: unknown[]): Partial<Record<Field, number>> {
  const cells = headers.map(norm)
  const used = new Set<number>()
  const found: Partial<Record<Field, number>> = {}

  for (const [field, keywords] of FIELD_KEYWORDS) {
    for (const kw of keywords) {
      const i = cells.findIndex((c, idx) => !used.has(idx) && c && c.includes(norm(kw)))
      if (i !== -1) {
        found[field] = i
        used.add(i)
        break
      }
    }
  }
  return found
}

/** 빈칸·문자·쉼표 섞인 값을 안전하게 숫자로. 못 읽으면 0. */
function toNum(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const n = Number(String(v ?? '').replace(/[,\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function parseWorkbook(book: XLSX.WorkBook): Branch[] {
  const sheet = book.Sheets[book.SheetNames[0]]
  if (!sheet) throw new Error('엑셀에서 시트를 찾을 수 없습니다.')

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false })
  if (rows.length === 0) throw new Error('엑셀이 비어 있습니다.')

  const cols = matchHeaders(rows[0])
  const missing = (['name', 'address'] as Field[]).filter((f) => cols[f] === undefined)
  if (missing.length > 0) {
    const headerList = rows[0].map((h) => String(h ?? '')).filter(Boolean).join(', ')
    throw new Error(
      `필수 열을 찾지 못했습니다: ${missing.map((f) => LABEL[f]).join(', ')}\n` +
        `엑셀 첫 행에서 찾은 열 이름: ${headerList || '(없음)'}`,
    )
  }

  const at = (row: unknown[], f: Field) => (cols[f] === undefined ? undefined : row[cols[f]!])
  const byId = new Map<string, Branch>()

  for (const row of rows.slice(1)) {
    const name = String(at(row, 'name') ?? '').trim()
    const address = String(at(row, 'address') ?? '').trim()
    if (!name || !address) continue // 빈 행 / 합계 행 등

    const normal = toNum(at(row, 'normal'))
    const abnormal = toNum(at(row, 'abnormal'))
    const total = cols.total === undefined ? normal + abnormal : toNum(at(row, 'total'))

    const id = `${name}|${address}`
    let branch = byId.get(id)
    if (!branch) {
      branch = { id, name, address, equipment: [], total: 0, normal: 0, abnormal: 0 }
      byId.set(id, branch)
    }
    branch.equipment.push({
      name: String(at(row, 'equipment') ?? '(장비명 없음)').trim() || '(장비명 없음)',
      total,
      normal,
      abnormal,
    })
    branch.total += total
    branch.normal += normal
    branch.abnormal += abnormal
  }

  if (byId.size === 0) throw new Error('표시할 데이터가 없습니다. 지점명과 주소가 채워진 행이 있는지 확인해 주세요.')
  return [...byId.values()]
}

export async function parseFile(file: File): Promise<Branch[]> {
  if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) {
    throw new Error('엑셀 파일(.xlsx)을 선택해 주세요.')
  }
  const buf = await file.arrayBuffer()
  return parseWorkbook(XLSX.read(buf, { type: 'array' }))
}

/** 앱과 함께 배포된 기본 엑셀을 읽는다. */
export async function parseUrl(url: string): Promise<Branch[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`기본 엑셀 파일을 불러오지 못했습니다 (${res.status})`)
  return parseWorkbook(XLSX.read(await res.arrayBuffer(), { type: 'array' }))
}

/**
 * 구글 스프레드시트의 '웹에 게시' CSV 를 읽는다.
 * 시트도 첫 행이 열 이름이므로 엑셀과 똑같은 열 매칭 로직을 그대로 쓴다.
 */
export async function parseSheetCsv(url: string): Promise<Branch[]> {
  let res: Response
  try {
    res = await fetch(url, { cache: 'no-store' })
  } catch {
    throw new Error(
      '구글 시트에 연결하지 못했습니다.\n' +
        '시트가 "웹에 게시" 상태인지, 인터넷 연결이 되는지 확인해 주세요.',
    )
  }
  if (!res.ok) throw new Error(`구글 시트를 불러오지 못했습니다 (${res.status})`)

  const text = await res.text()
  // 게시되지 않은 시트는 CSV 대신 로그인/오류 HTML 을 돌려준다.
  if (/^\s*</.test(text)) {
    throw new Error(
      '구글 시트가 "웹에 게시" 상태가 아닌 것 같습니다.\n' +
        '시트에서 [파일 → 공유 → 웹에 게시] 를 다시 확인해 주세요.',
    )
  }
  return parseWorkbook(XLSX.read(text, { type: 'string' }))
}
