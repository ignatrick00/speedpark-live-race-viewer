'use client'

interface HeatmapCell {
  sessions: number
  drivers: number
  revenue: number
}

interface UsageHeatmapProps {
  heatmap: HeatmapCell[][]
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function UsageHeatmap({ heatmap }: UsageHeatmapProps) {
  if (!heatmap || heatmap.length === 0) {
    return (
      <div className="text-center text-blue-300 py-8">
        📊 No hay datos suficientes para generar el mapa de calor
      </div>
    )
  }

  // Encontrar el máximo número de pilotos para normalizar colores
  const maxDrivers = Math.max(
    ...heatmap.flat().map(cell => cell.drivers)
  )

  // Función para obtener el color según intensidad de pilotos
  const getColor = (drivers: number) => {
    if (drivers === 0) return 'rgba(30, 41, 59, 0.4)' // Muy oscuro (sin datos)

    const intensity = drivers / maxDrivers

    if (intensity < 0.2) return 'rgba(59, 130, 246, 0.3)' // 0-20% → Azul muy claro
    if (intensity < 0.4) return 'rgba(59, 130, 246, 0.5)' // 20-40% → Azul claro
    if (intensity < 0.6) return 'rgba(34, 211, 238, 0.6)' // 40-60% → Cyan
    if (intensity < 0.8) return 'rgba(34, 211, 238, 0.8)' // 60-80% → Cyan intenso
    return 'rgba(22, 189, 202, 1)' // 80-100% → Cyan muy intenso (PICO)
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Indicador de pico máximo */}
        <div className="text-xs text-blue-300 mb-3 text-center">
          🔥 Pico máximo: <span className="font-bold text-cyan-400">{maxDrivers} pilotos</span>
        </div>

        {/* Header - Horas */}
        <div className="flex mb-1">
          <div className="w-16 flex-shrink-0"></div>
          <div className="flex gap-1">
            {HOURS.map(hour => (
              <div
                key={hour}
                className="w-8 text-center text-xs text-cyan-400 font-digital"
              >
                {hour}
              </div>
            ))}
          </div>
        </div>

        {/* Grid - Días x Horas */}
        {heatmap.map((dayData, dayIndex) => (
          <div key={dayIndex} className="flex gap-1 mb-1">
            {/* Etiqueta día */}
            <div className="w-16 flex-shrink-0 text-right pr-2 text-sm text-blue-300 font-racing flex items-center justify-end">
              {DAYS[dayIndex]}
            </div>

            {/* Celdas de hora */}
            <div className="flex gap-1">
              {dayData.map((cell, hourIndex) => (
                <div
                  key={hourIndex}
                  className="w-8 h-8 rounded relative group cursor-pointer transition-all hover:scale-110 hover:z-10"
                  style={{
                    backgroundColor: getColor(cell.drivers),
                    border: cell.drivers > 0 ? '1px solid rgba(34, 211, 238, 0.3)' : '1px solid rgba(71, 85, 105, 0.2)'
                  }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                    <div className="bg-black border-2 border-cyan-400 rounded-lg p-3 text-xs whitespace-nowrap shadow-xl">
                      <div className="text-cyan-400 font-bold mb-1">
                        {DAYS[dayIndex]} {hourIndex}:00
                      </div>
                      {cell.drivers > 0 ? (
                        <>
                          <div className="text-white font-bold">👥 Pilotos: {cell.drivers}</div>
                          <div className="text-white text-xs">🏁 Sesiones: {cell.sessions}</div>
                          <div className="text-green-400">💰 ${cell.revenue.toLocaleString('es-CL')}</div>
                        </>
                      ) : (
                        <div className="text-gray-400">Sin actividad</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Leyenda */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs">
          <div className="text-blue-300 font-digital">Cantidad de Pilotos:</div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)' }}></div>
            <span className="text-blue-300">Sin datos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)' }}></div>
            <span className="text-blue-300">Bajo (0-20%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgba(34, 211, 238, 0.6)' }}></div>
            <span className="text-blue-300">Medio (40-60%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgba(22, 189, 202, 1)' }}></div>
            <span className="text-blue-300">Alto (80-100%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
