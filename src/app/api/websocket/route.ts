import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Verificar si el WebSocket server está corriendo en puerto 8080
    const response = await fetch('http://localhost:8080', {
      method: 'HEAD',
      signal: AbortSignal.timeout(1000)
    })
    
    return Response.json({ 
      status: 'WebSocket server running',
      port: 8080,
      message: 'Conectar a ws://localhost:8080 para datos en tiempo real'
    })
  } catch (error) {
    return Response.json({ 
      status: 'WebSocket server not running',
      port: 8080,
      error: 'Ejecutar: npm run websocket'
    }, { status: 503 })
  }
}