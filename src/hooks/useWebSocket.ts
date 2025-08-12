'use client'
import { useState, useEffect, useRef } from 'react'
import { parseSMSTimingData, ParsedSMSData } from '@/lib/sms-timing-parser'

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [raceData, setRaceData] = useState<ParsedSMSData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = () => {
    try {
      // Usar variable de entorno para WebSocket URL
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://rom3v84xzg.execute-api.us-east-1.amazonaws.com/production'
      
      console.log('🔗 Conectando a:', wsUrl)
      wsRef.current = new WebSocket(wsUrl)
      
      wsRef.current.onopen = () => {
        console.log('✅ WebSocket conectado')
        setIsConnected(true)
        setError(null)
        setRetryCount(0)
        
        // Pequeño delay para asegurar que el WebSocket esté completamente listo
        setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              action: 'join_race'
            }))
          }
        }, 100)
      }
      
      wsRef.current.onmessage = async (event) => {
        try {
          const parsedData = parseSMSTimingData(event.data)
          if (parsedData) {
            setRaceData(parsedData)
            setError(null)
            console.log('🏆 Datos actualizados:', parsedData.activeDrivers, 'pilotos')
            
            // 🆕 GUARDAR EN BASE DE DATOS - Enviar al API lap-capture
            try {
              console.log('💾 Enviando datos al API lap-capture para guardar...')
              const response = await fetch('/api/lap-capture', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  action: 'process_lap_data',
                  sessionData: {
                    N: parsedData.sessionName || 'Live Session',
                    D: parsedData.drivers?.map(driver => ({
                      N: driver.name,
                      P: driver.pos,
                      K: driver.kart,
                      L: driver.lap,
                      B: parseFloat(driver.bestTime.replace(':', '').replace('.', '')) || 0,
                      T: parseFloat(driver.lastTime.replace(':', '').replace('.', '')) || 0,
                      A: parseFloat(driver.avgTime.replace(':', '').replace('.', '')) || 0,
                      G: driver.gap
                    })) || []
                  }
                })
              })
              
              if (response.ok) {
                console.log('✅ Datos guardados en base de datos exitosamente')
              } else {
                console.warn('⚠️ Error guardando datos en BD:', response.status)
              }
            } catch (dbError) {
              console.error('❌ Error enviando datos al API lap-capture:', dbError)
            }
          }
        } catch (parseError) {
          console.warn('⚠️ Error parseando datos:', parseError)
        }
      }
      
      wsRef.current.onclose = () => {
        console.log('❌ WebSocket desconectado')
        setIsConnected(false)
        
        // Limpiar conexión anterior
        if (wsRef.current) {
          wsRef.current = null
        }
        
        // Reconexión exponencial (máximo 30s)
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)
        console.log(`🔄 Reintentando WebSocket en ${delay}ms...`)
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1)
          connect()
        }, delay)
      }
      
      wsRef.current.onerror = (error) => {
        console.error('💥 Error WebSocket:', error)
        setError('Error de conexión WebSocket')
        setIsConnected(false)
      }
      
    } catch (error) {
      console.error('❌ Error creando WebSocket:', error)
      setError('No se pudo crear la conexión WebSocket')
    }
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }

  useEffect(() => {
    console.log('🚀 Iniciando conexión WebSocket...')
    connect()
    
    return () => {
      disconnect()
    }
  }, [])

  return {
    isConnected,
    raceData,
    error,
    retryCount,
    reconnect: connect,
    disconnect
  }
}