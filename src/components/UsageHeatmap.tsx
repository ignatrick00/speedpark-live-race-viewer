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

  // Encontrar el valor máximo para normalizar colores
  const maxSessions = Math.max(
    ...heatmap.flat().map(cell => cell.sessions)
  )

  // Función para obtener el color según intensidad
  const getColor = (sessions: number) => {
    if (sessions === 0) return 'rgba(30, 41, 59, 0.4)' // Muy oscuro (sin datos)

    const intensity = sessions / maxSessions

    if (intensity < 0.2) return 'rgba(59, 130, 246, 0.3)' // Azul muy claro
    if (intensity < 0.4) return 'rgba(59, 130, 246, 0.5)' // Azul claro
    if (intensity < 0.6) return 'rgba(34, 211, 238, 0.6)' // Cyan
    if (intensity < 0.8) return 'rgba(34, 211, 238, 0.8)' // Cyan intenso
    return 'rgba(22, 189, 202, 1)' // Cyan muy intenso (pico)
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
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
                    backgroundColor: getColor(cell.sessions),
                    border: cell.sessions > 0 ? '1px solid rgba(34, 211, 238, 0.3)' : '1px solid rgba(71, 85, 105, 0.2)'
                  }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                    <div className="bg-black border-2 border-cyan-400 rounded-lg p-3 text-xs whitespace-nowrap shadow-xl">
                      <div className="text-cyan-400 font-bold mb-1">
                        {DAYS[dayIndex]} {hourIndex}:00
                      </div>
                      {cell.sessions > 0 ? (
                        <>
                          <div className="text-white">🏁 Sesiones: {cell.sessions}</div>
                          <div className="text-white">👥 Pilotos: {cell.drivers}</div>
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
          <div className="text-blue-300 font-digital">Intensidad:</div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)' }}></div>
            <span className="text-blue-300">Sin datos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)' }}></div>
            <span className="text-blue-300">Bajo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgba(34, 211, 238, 0.6)' }}></div>
            <span className="text-blue-300">Medio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgba(22, 189, 202, 1)' }}></div>
            <span className="text-blue-300">Alto</span>
          </div>
        </div>
      </div>
    </div>
  )
}
