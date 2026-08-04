import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Branch } from '@/lib/parse'
import { isAbnormal } from '@/lib/status'

/** 비정상은 빨강, 정상은 초록 — 0 이면 강조하지 않는다. */
const abnormalCell = (n: number) => (n > 0 ? 'font-bold text-red-600' : 'text-muted-foreground')
const normalCell = (n: number) => (n > 0 ? 'font-bold text-green-600' : 'text-muted-foreground')

export function BranchDetailDialog({
  branch,
  onClose,
}: {
  branch: Branch | null
  onClose: () => void
}) {
  return (
    <Dialog open={branch !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {branch && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                {branch.name}
                {isAbnormal(branch) ? (
                  <Badge variant="destructive">비정상 {branch.abnormal}대</Badge>
                ) : (
                  <Badge variant="secondary">정상</Badge>
                )}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 pt-1">
                <MapPin className="size-3.5 shrink-0" />
                {branch.address}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3">
              <Summary label="보유수량" value={branch.total} />
              <Summary label="정상수량" value={branch.normal} className="text-green-600" />
              <Summary label="비정상수량" value={branch.abnormal} className="text-red-600" />
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>장비명</TableHead>
                    <TableHead className="text-right">보유수량</TableHead>
                    <TableHead className="text-right">정상수량</TableHead>
                    <TableHead className="text-right">비정상수량</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branch.equipment.map((e, i) => (
                    <TableRow key={`${e.name}-${i}`}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{e.total}</TableCell>
                      <TableCell className={`text-right tabular-nums ${normalCell(e.normal)}`}>
                        {e.normal}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${abnormalCell(e.abnormal)}`}>
                        {e.abnormal}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {branch.geoError && (
              <p className="text-sm text-amber-600">지도 위치를 찾지 못했습니다 — {branch.geoError}</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Summary({
  label,
  value,
  className = '',
}: {
  label: string
  value: number
  className?: string
}) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${className}`}>{value}</div>
    </div>
  )
}
