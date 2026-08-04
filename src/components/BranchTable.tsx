import { CircleAlert, MapPinOff } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Branch } from '@/lib/parse'
import { isAbnormal, MARKER_COLOR } from '@/lib/status'

export function BranchTable({
  branches,
  selected,
  onSelect,
}: {
  branches: Branch[]
  selected: Branch | null
  onSelect: (b: Branch) => void
}) {
  // 이상 지점을 위로, 그 다음 비정상 수량이 많은 순
  const sorted = [...branches].sort(
    (a, b) => Number(isAbnormal(b)) - Number(isAbnormal(a)) || b.abnormal - a.abnormal,
  )

  return (
    <Table>
      <TableHeader className="sticky top-0 bg-card z-10">
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>지점명</TableHead>
          <TableHead className="text-right">보유</TableHead>
          <TableHead className="text-right">정상</TableHead>
          <TableHead className="text-right">비정상</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((b) => {
          const bad = isAbnormal(b)
          return (
            <TableRow
              key={b.id}
              onClick={() => onSelect(b)}
              aria-selected={selected?.id === b.id}
              className="cursor-pointer aria-selected:bg-muted"
            >
              <TableCell>
                {b.geoError ? (
                  <MapPinOff className="size-3.5 text-amber-500" aria-label="좌표 미확인" />
                ) : (
                  <span
                    aria-hidden
                    className="inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: MARKER_COLOR[bad ? 'abnormal' : 'ok'] }}
                  />
                )}
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-1.5">
                  {bad && <CircleAlert className="size-3.5 shrink-0 text-red-600" />}
                  <span className="truncate">{b.name}</span>
                </div>
                <div className="truncate text-xs text-muted-foreground">{b.address}</div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{b.total}</TableCell>
              <TableCell className="text-right tabular-nums text-green-600">{b.normal}</TableCell>
              <TableCell
                className={`text-right tabular-nums ${bad ? 'font-bold text-red-600' : 'text-muted-foreground'}`}
              >
                {b.abnormal}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
