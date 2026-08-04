import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Branch } from '@/lib/parse'
import { isAbnormal, MARKER_COLOR } from '@/lib/status'

const SEOUL: [number, number] = [37.5665, 126.978]

type Located = Branch & { lat: number; lng: number }
const located = (branches: Branch[]) =>
  branches.filter((b): b is Located => typeof b.lat === 'number' && typeof b.lng === 'number')

/** 지점이 새로 들어오면 전체가 보이도록 지도 범위를 맞춘다. */
function FitBounds({ branches }: { branches: Located[] }) {
  const map = useMap()
  const key = branches.map((b) => b.id).join('|')

  useEffect(() => {
    if (branches.length === 0) return
    if (branches.length === 1) {
      map.setView([branches[0].lat, branches[0].lng], 15)
      return
    }
    map.fitBounds(
      branches.map((b) => [b.lat, b.lng] as [number, number]),
      { padding: [50, 50], maxZoom: 15 },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return null
}

/** 목록에서 지점을 고르면 해당 위치로 이동한다. */
function FlyToSelected({ branch }: { branch: Branch | null }) {
  const map = useMap()
  useEffect(() => {
    if (branch && typeof branch.lat === 'number' && typeof branch.lng === 'number') {
      map.flyTo([branch.lat, branch.lng], Math.max(map.getZoom(), 15), { duration: 0.6 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch?.id])
  return null
}

export function MapView({
  branches,
  selected,
  onSelect,
}: {
  branches: Branch[]
  selected: Branch | null
  onSelect: (b: Branch) => void
}) {
  const pins = located(branches)

  return (
    <MapContainer center={SEOUL} zoom={11} scrollWheelZoom className="h-full w-full z-0">
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <FitBounds branches={pins} />
      <FlyToSelected branch={selected} />

      {pins.map((b) => {
        const bad = isAbnormal(b)
        const color = MARKER_COLOR[bad ? 'abnormal' : 'ok']
        const active = selected?.id === b.id
        return (
          <CircleMarker
            key={b.id}
            center={[b.lat, b.lng]}
            radius={active ? 14 : 10}
            pathOptions={{
              color: '#ffffff',
              weight: active ? 4 : 2,
              fillColor: color,
              fillOpacity: 0.95,
            }}
            eventHandlers={{ click: () => onSelect(b) }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <span className="font-semibold">{b.name}</span>
              {bad && <span className="text-red-600"> · 비정상 {b.abnormal}</span>}
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
