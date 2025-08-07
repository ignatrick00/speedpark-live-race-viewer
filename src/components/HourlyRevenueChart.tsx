'use client'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface HourlyData {
  hour: number
  revenue: number
  sessions: number
}

interface HourlyRevenueChartProps {
  hourlyData: HourlyData[]
}

export default function HourlyRevenueChart({ hourlyData }: HourlyRevenueChartProps) {
  const labels = hourlyData.map(data => `${data.hour}:00`)
  const revenues = hourlyData.map(data => data.revenue)
  
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Ganancias ($)',
        data: revenues,
        backgroundColor: 'rgba(59, 130, 246, 0.8)', // Blue
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // No mostrar leyenda para un solo dataset
      },
      title: {
        display: false, // Título manejado por componente padre
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#00D4FF',
        bodyColor: '#ffffff',
        borderColor: '#00D4FF',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const hourData = hourlyData[context.dataIndex]
            return [
              `Ganancias: $${context.parsed.y.toLocaleString('es-CL')}`,
              `Sesiones: ${hourData.sessions}`
            ]
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(59, 130, 246, 0.3)',
        },
        ticks: {
          color: '#7DD3FC', // Sky blue
          font: {
            family: 'Orbitron, monospace',
            size: 12,
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(59, 130, 246, 0.3)',
        },
        ticks: {
          color: '#7DD3FC', // Sky blue
          font: {
            family: 'Orbitron, monospace',
            size: 12,
          },
          callback: function(value: any) {
            return '$' + value.toLocaleString('es-CL')
          }
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart' as const
    }
  }

  return (
    <div className="h-80 w-full">
      <Bar data={chartData} options={options} />
    </div>
  )
}