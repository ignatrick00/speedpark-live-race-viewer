'use client'

import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface TopDriverData {
  driverName: string
  classificationsCount: number
  totalSpent: number
}

interface TopDriversChartProps {
  topDrivers: TopDriverData[]
}

export default function TopDriversChart({ topDrivers }: TopDriversChartProps) {
  if (!topDrivers || topDrivers.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-blue-300">
        📊 Sin datos de corredores este mes
      </div>
    )
  }

  const data = {
    labels: topDrivers.map(driver => driver.driverName),
    datasets: [
      {
        label: 'Gasto Mensual ($)',
        data: topDrivers.map(driver => driver.totalSpent),
        backgroundColor: topDrivers.map((_, index) => {
          if (index === 0) return 'rgba(255, 215, 0, 0.8)' // Gold
          if (index === 1) return 'rgba(192, 192, 192, 0.8)' // Silver
          if (index === 2) return 'rgba(205, 127, 50, 0.8)' // Bronze
          return 'rgba(0, 212, 255, 0.6)' // Cyan
        }),
        borderColor: topDrivers.map((_, index) => {
          if (index === 0) return 'rgba(255, 215, 0, 1)'
          if (index === 1) return 'rgba(192, 192, 192, 1)'
          if (index === 2) return 'rgba(205, 127, 50, 1)'
          return 'rgba(0, 212, 255, 1)'
        }),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y' as const, // Horizontal bars
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#00D4FF',
        bodyColor: '#FFFFFF',
        borderColor: '#00D4FF',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context) => {
            const driver = topDrivers[context[0].dataIndex]
            return `🏁 ${driver.driverName}`
          },
          label: (context) => {
            const driver = topDrivers[context.dataIndex]
            return [
              `💰 Gastado: $${driver.totalSpent.toLocaleString('es-CL')}`,
              `🏎️ Clasificaciones: ${driver.classificationsCount}`,
              `📊 Promedio: $${(driver.totalSpent / driver.classificationsCount).toLocaleString('es-CL')}/sesión`
            ]
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 212, 255, 0.1)',
          display: true
        },
        border: {
          display: false
        },
        ticks: {
          color: '#60A5FA',
          font: {
            family: 'monospace',
            weight: 'bold'
          },
          callback: function(value) {
            return '$' + Number(value).toLocaleString('es-CL')
          }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: '#FFFFFF',
          font: {
            family: 'monospace',
            weight: 'bold',
            size: 12
          },
          callback: function(value, index) {
            const driver = topDrivers[index]
            if (!driver) return ''
            
            // Add position indicator
            const position = index + 1
            let medal = ''
            if (position === 1) medal = '🥇'
            else if (position === 2) medal = '🥈'
            else if (position === 3) medal = '🥉'
            else medal = `${position}.`
            
            return `${medal} ${driver.driverName}`
          }
        },
        border: {
          display: false
        }
      }
    },
    layout: {
      padding: {
        left: 10,
        right: 10,
        top: 10,
        bottom: 10
      }
    }
  }

  return (
    <div className="h-80">
      <Bar data={data} options={options} />
    </div>
  )
}