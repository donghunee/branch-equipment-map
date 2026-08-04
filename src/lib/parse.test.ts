import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseWorkbook } from './parse'

function wb(rows: unknown[][]) {
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return book
}

const HEADER = ['이름', '주 소', '장비명', '보유수량', '정상수량', '비정상수량']

describe('parseWorkbook', () => {
  it('정상수량과 비정상수량을 뒤바꾸지 않는다', () => {
    // '정상수량'은 '비정상수량'의 부분 문자열이므로 매칭 순서가 틀리면 값이 뒤바뀐다.
    const [b] = parseWorkbook(wb([HEADER, ['서초금융센터', '서울 서초구 사임당로23길 27', 'VPN', 10, 8, 2]]))
    expect(b.normal).toBe(8)
    expect(b.abnormal).toBe(2)
    expect(b.total).toBe(10)
  })

  it('열 순서가 바뀌어도 헤더 이름으로 찾는다', () => {
    const [b] = parseWorkbook(
      wb([
        ['비정상수량', '주소', '정상수량', '지점명', '보유수량', '장비'],
        [3, '서울 중구 남대문로9길 40', 7, '중앙센터', 10, '스위치'],
      ]),
    )
    expect(b.name).toBe('중앙센터')
    expect(b.address).toBe('서울 중구 남대문로9길 40')
    expect(b.abnormal).toBe(3)
    expect(b.normal).toBe(7)
    expect(b.equipment[0].name).toBe('스위치')
  })

  it('같은 지점의 장비 여러 행을 하나로 합산한다', () => {
    const branches = parseWorkbook(
      wb([
        HEADER,
        ['강남리더스', '서울 강남구 테헤란로 114', 'VPN', 10, 8, 2],
        ['강남리더스', '서울 강남구 테헤란로 114', '스위치', 5, 5, 0],
        ['삼성화재본사', '서울 서초구 서초대로74길 14', 'VPN', 20, 20, 0],
      ]),
    )
    expect(branches).toHaveLength(2)
    const gangnam = branches.find((b) => b.name === '강남리더스')!
    expect(gangnam.equipment).toHaveLength(2)
    expect(gangnam.total).toBe(15)
    expect(gangnam.normal).toBe(13)
    expect(gangnam.abnormal).toBe(2)
  })

  it('빈칸이나 문자로 된 수량은 0으로 처리한다', () => {
    const [b] = parseWorkbook(wb([HEADER, ['A지점', '서울시청', 'VPN', null, '없음', '']]))
    expect(b.total).toBe(0)
    expect(b.normal).toBe(0)
    expect(b.abnormal).toBe(0)
  })

  it('보유수량 열이 없으면 정상+비정상으로 계산한다', () => {
    const [b] = parseWorkbook(wb([['지점명', '주소', '정상수량', '비정상수량'], ['A지점', '서울시청', 6, 4]]))
    expect(b.total).toBe(10)
  })

  it('지점명 열이 없으면 에러를 던진다', () => {
    expect(() => parseWorkbook(wb([['주소', '정상수량'], ['서울시청', 1]]))).toThrow(/지점명/)
  })

  it('주소 열이 없으면 에러를 던진다', () => {
    expect(() => parseWorkbook(wb([['지점명', '정상수량'], ['A지점', 1]]))).toThrow(/주소/)
  })

  it('데이터 행이 없으면 에러를 던진다', () => {
    expect(() => parseWorkbook(wb([HEADER]))).toThrow(/데이터/)
  })

  it('지점명이나 주소가 빈 행은 건너뛴다', () => {
    const branches = parseWorkbook(
      wb([HEADER, ['A지점', '서울시청', 'VPN', 1, 1, 0], ['', '', '', '', '', ''], [null, '서울역', 'VPN', 1, 1, 0]]),
    )
    expect(branches).toHaveLength(1)
  })

  it('1000 처럼 쉼표가 들어간 수량도 숫자로 읽는다', () => {
    const [b] = parseWorkbook(wb([HEADER, ['A지점', '서울시청', 'VPN', '1,200', '1,150', '50']]))
    expect(b.total).toBe(1200)
    expect(b.normal).toBe(1150)
    expect(b.abnormal).toBe(50)
  })
})
