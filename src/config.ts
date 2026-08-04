/**
 * 데이터를 읽어올 구글 스프레드시트 주소.
 *
 * 바꾸는 방법:
 *   구글 시트 → 파일 → 공유 → 웹에 게시 → 형식 "쉼표로 구분된 값(.csv)" → 게시
 *   나오는 주소(.../pub?output=csv)를 아래에 그대로 붙여넣으면 된다.
 *
 * 빈 문자열이면 앱은 파일 선택 화면으로 시작한다.
 */
export const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR42K-XQ1mwHhc6D6NTwIsx-ft-wN-TYeiVVQ2H5WBMPIQDLl9nP2VpczO3_rX0v3k983CO5krashda/pub?output=csv'

/**
 * 시트를 사람이 직접 열어 수정할 수 있는 주소 (브라우저 주소창의 .../edit 주소).
 * 비어 있으면 '시트 열어 수정' 버튼을 숨긴다.
 *
 * 위 게시 주소의 `2PACX-...` 는 게시 전용 ID 라서 편집 주소를 여기서 유추할 수 없다.
 */
export const SHEET_EDIT_URL = ''
