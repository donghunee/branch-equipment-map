import { useEffect, useRef, useState } from 'react'
import { CircleAlert, FileSpreadsheet, MapPinOff, Upload } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BranchDetailDialog } from '@/components/BranchDetailDialog'
import { BranchTable } from '@/components/BranchTable'
import { MapView } from '@/components/MapView'
import { geocodeBranches } from '@/lib/geocode'
import { parseFile, parseUrl, type Branch } from '@/lib/parse'
import { isAbnormal } from '@/lib/status'

type Status = 'idle' | 'parsing' | 'geocoding'

/** 앱과 함께 배포되는 기본 데이터. 첫 화면에서 자동으로 불러온다. */
const DEFAULT_FILE = '주소정보.xlsx'

export default function App() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selected, setSelected] = useState<Branch | null>(null)
  const [status, setStatus] = useState<Status>('parsing') // 첫 화면부터 기본 데이터를 읽는다
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState(DEFAULT_FILE)
  const inputRef = useRef<HTMLInputElement>(null)

  async function load(label: string, getBranches: () => Promise<Branch[]>) {
    setError(null)
    setSelected(null)
    setBranches([])
    setFileName(label)
    setStatus('parsing')
    try {
      const parsed = await getBranches()
      setBranches(parsed)
      setStatus('geocoding')
      setProgress({ done: 0, total: parsed.length })
      const final = await geocodeBranches(parsed, (done, total, updated) => {
        setProgress({ done, total })
        setBranches([...updated])
      })
      setBranches(final)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBranches([])
      throw e
    } finally {
      setStatus('idle')
    }
  }

  // 기본 데이터 자동 로딩. 파일이 없으면 조용히 파일 선택 화면으로 넘어간다.
  const loadedOnce = useRef(false)
  useEffect(() => {
    if (loadedOnce.current) return // StrictMode 이중 실행 방지
    loadedOnce.current = true
    load(DEFAULT_FILE, () => parseUrl(`${import.meta.env.BASE_URL}${DEFAULT_FILE}`)).catch(() => {
      setError(null)
      setFileName('')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const abnormalBranches = branches.filter(isAbnormal)
  const unlocated = branches.filter((b) => b.geoError)
  const busy = status !== 'idle'

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
        <h1 className="text-base font-semibold tracking-tight">지점 장비 현황 지도</h1>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xlsm,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = '' // 같은 파일을 다시 골라도 동작하도록
            if (file) void load(file.name, () => parseFile(file)).catch(() => {})
          }}
        />
        <Button
          size="sm"
          variant={branches.length > 0 ? 'outline' : 'default'}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload /> {branches.length > 0 ? '다른 엑셀 파일 선택' : '엑셀 파일 선택'}
        </Button>

        {fileName && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <FileSpreadsheet className="size-3.5" />
            {fileName}
          </span>
        )}

        {branches.length > 0 && (
          <div className="ml-auto flex items-center gap-2 text-sm">
            <Badge variant="outline">전체 {branches.length}지점</Badge>
            {abnormalBranches.length > 0 ? (
              <Badge variant="destructive">
                <CircleAlert /> 이상 {abnormalBranches.length}지점
              </Badge>
            ) : (
              <Badge variant="secondary">이상 없음</Badge>
            )}
          </div>
        )}
      </header>

      {status === 'geocoding' && progress.total > 0 && (
        <div className="border-b bg-muted/40 px-5 py-2">
          <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
            <span>
              주소를 지도 위치로 바꾸는 중… ({progress.done}/{progress.total})
            </span>
            <span className="hidden sm:inline">OpenStreetMap 정책상 1초에 1건씩 조회합니다</span>
          </div>
          <Progress value={(progress.done / progress.total) * 100} className="h-1.5" />
        </div>
      )}

      {error && (
        <div className="px-5 pt-4">
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>엑셀을 읽지 못했습니다</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <main className="grid min-h-0 flex-1 lg:grid-cols-[1fr_400px]">
        <div className="relative min-h-[320px]">
          <MapView branches={branches} selected={selected} onSelect={setSelected} />
          {branches.length === 0 && busy && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/85 backdrop-blur-sm">
              <p className="text-sm text-muted-foreground">기본 데이터를 불러오는 중…</p>
            </div>
          )}
          {branches.length === 0 && !busy && (
            <EmptyOverlay onPick={() => inputRef.current?.click()} />
          )}
        </div>

        <aside className="flex min-h-0 flex-col border-t bg-card lg:border-t-0 lg:border-l">
          <ScrollArea className="min-h-0 flex-1">
            {branches.length > 0 ? (
              <BranchTable branches={branches} selected={selected} onSelect={setSelected} />
            ) : (
              <p className="p-5 text-sm text-muted-foreground">
                엑셀 파일을 선택하면 지점 목록이 여기에 표시됩니다.
              </p>
            )}
          </ScrollArea>

          {unlocated.length > 0 && (
            <div className="border-t p-4">
              <Alert>
                <MapPinOff />
                <AlertTitle>좌표를 찾지 못한 지점 {unlocated.length}곳</AlertTitle>
                <AlertDescription>
                  <span className="text-xs">
                    지도에는 표시되지 않지만 위 목록에는 그대로 있습니다. 엑셀의 주소를 도로명 주소로
                    수정하면 대부분 해결됩니다.
                  </span>
                  <ul className="mt-1.5 space-y-0.5 text-xs">
                    {unlocated.map((b) => (
                      <li key={b.id}>
                        · <span className="font-medium">{b.name}</span> — {b.address}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </aside>
      </main>

      <BranchDetailDialog branch={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function EmptyOverlay({ onPick }: { onPick: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/85 p-6 backdrop-blur-sm">
      <div className="max-w-md space-y-4 text-center">
        <FileSpreadsheet className="mx-auto size-10 text-muted-foreground" />
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">엑셀 파일을 선택해 주세요</h2>
          <p className="text-sm text-muted-foreground">
            첫 행에 <b>지점명, 주소, 장비명, 보유수량, 정상수량, 비정상수량</b> 열이 있으면 됩니다. 열
            순서는 달라도 이름으로 알아서 찾습니다.
          </p>
        </div>
        <Button onClick={onPick}>
          <Upload /> 엑셀 파일 선택
        </Button>
        <p className="text-xs text-muted-foreground">
          파일은 서버로 전송되지 않고 브라우저 안에서만 처리됩니다.
        </p>
      </div>
    </div>
  )
}
