'use client'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface DailyData {
  date: string
  revenue: number
  sessions: number
  drivers: number
}

interface DailyRevenueChartProps {
  dailyData: DailyData[]
}

export default function DailyRevenueChart({ dailyData }: DailyRevenueChartProps) {
  // Formatear fechas para etiquetas (DD/MM)
  const labels = dailyData.map(data => {
    const date = new Date(data.date)
    return `${date.getDate()}/${date.getMonth() + 1}`
  })

  const revenues = dailyData.map(data => data.revenue)
  const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Ingresos Diarios',
        data: revenues,
        borderColor: 'rgba(34, 211, 238, 1)', // Cyan
        backgroundColor: 'rgba(34, 211, 238, 0.2)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: 'rgba(34, 211, 238, 1)',
        pointBorderColor: '#000',
        pointBorderWidth: 2,
      },
      {
        label: 'Promedio',
        data: new Array(revenues.length).fill(avgRevenue),
        borderColor: 'rgba(251, 191, 36, 0.8)', // Yellow/Amber
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [10, 5],
        pointRadius: 0,
        fill: false,
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#7DD3FC',
          font: {
            family: 'Orbitron, monospace',
            size: 12,
          },
          usePointStyle: true,
          padding: 15,
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#22D3EE',
        bodyColor: '#ffffff',
        borderColor: '#22D3EE',
        borderWidth: 2,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: function(context: any) {
            const dataIndex = context[0].dataIndex
            return dailyData[dataIndex].date
          },
          label: function(context: any) {
            const dataIndex = context.dataIndex
            const data = dailyData[dataIndex]
            return [
              `💰 Ingresos: $${data.revenue.toLocaleString('es-CL')}`,
              `🏁 Sesiones: ${data.sessions}`,
              `👥 Pilotos: ${data.drivers}`
            ]
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(34, 211, 238, 0.1)',
          borderColor: 'rgba(34, 211, 238, 0.3)',
        },
        ticks: {
          color: '#7DD3FC',
          font: {
            family: 'Orbitron, monospace',
            size: 11,
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(34, 211, 238, 0.1)',
          borderColor: 'rgba(34, 211, 238, 0.3)',
        },
        ticks: {
          color: '#7DD3FC',
          font: {
            family: 'Orbitron, monospace',
            size: 11,
          },
          callback: function(value: any) {
            return '$' + (value / 1000).toFixed(0) + 'K'
          }
        }
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutQuart' as const
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    }
  }

  return (
    <div className="h-80 w-full">
      <Line data={chartData} options={options} />
    </div>
  )
}
