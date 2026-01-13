/**
 * Script para inspeccionar el WebSocket de RaceFacer
 *
 * USO:
 * 1. Abre https://live.racefacer.com/KM42Paine en Chrome
 * 2. Abre DevTools (F12)
 * 3. Ve a Console
 * 4. Copia y pega este script completo
 * 5. Espera a que haya una carrera activa
 *
 * El script capturará automáticamente:
 * - URL del WebSocket
 * - Mensajes enviados/recibidos
 * - Estructura de datos
 * - Frecuencia de actualizaciones
 */

(function() {
  console.log('🔍 RaceFacer WebSocket Inspector v1.0');
  console.log('📡 Buscando conexiones WebSocket...\n');

  // Estado del inspector
  const inspector = {
    websockets: [],
    messages: [],
    startTime: Date.now(),
    messageCount: 0,
    sampleMessages: []
  };

  // Interceptar el constructor de WebSocket nativo
  const OriginalWebSocket = window.WebSocket;

  window.WebSocket = function(url, protocols) {
    console.log('✅ WebSocket detectado!');
    console.log('📍 URL:', url);
    console.log('🔧 Protocols:', protocols || 'none');
    console.log('');

    // Crear el WebSocket real
    const ws = new OriginalWebSocket(url, protocols);

    // Guardar información
    const wsInfo = {
      url: url,
      protocols: protocols,
      connectedAt: new Date().toISOString(),
      messages: []
    };
    inspector.websockets.push(wsInfo);

    // Interceptar eventos
    const originalOnMessage = ws.onmessage;
    const originalOnOpen = ws.onopen;
    const originalOnClose = ws.onclose;
    const originalOnError = ws.onerror;
    const originalSend = ws.send;

    // Override onopen
    ws.addEventListener('open', function(event) {
      console.log('🟢 WebSocket CONECTADO');
      console.log('⏰ Tiempo:', new Date().toISOString());
      console.log('');
    });

    // Override onmessage
    ws.addEventListener('message', function(event) {
      inspector.messageCount++;

      const message = {
        timestamp: new Date().toISOString(),
        type: 'received',
        data: event.data,
        size: event.data.length
      };

      wsInfo.messages.push(message);
      inspector.messages.push(message);

      // Guardar primeros 10 mensajes como muestra
      if (inspector.sampleMessages.length < 10) {
        inspector.sampleMessages.push(message);
      }

      // Parsear si es JSON
      let parsed = null;
      try {
        parsed = JSON.parse(event.data);
      } catch (e) {
        // No es JSON
      }

      // Log cada 10 mensajes para no saturar la consola
      if (inspector.messageCount % 10 === 0) {
        console.log(`📨 Mensajes recibidos: ${inspector.messageCount}`);
      }

      // Mostrar primeros 5 mensajes completos
      if (inspector.messageCount <= 5) {
        console.log('📥 Mensaje #' + inspector.messageCount);
        console.log('⏰ Timestamp:', message.timestamp);
        console.log('📦 Tamaño:', message.size, 'bytes');
        if (parsed) {
          console.log('📄 Datos (JSON):');
          console.log(JSON.stringify(parsed, null, 2));
        } else {
          console.log('📄 Datos (raw):', event.data.substring(0, 200));
        }
        console.log('');
      }
    });

    // Override send
    ws.send = function(data) {
      const message = {
        timestamp: new Date().toISOString(),
        type: 'sent',
        data: data,
        size: data.length
      };

      wsInfo.messages.push(message);

      console.log('📤 Mensaje ENVIADO:');
      console.log('⏰ Timestamp:', message.timestamp);
      console.log('📦 Datos:', data);
      console.log('');

      return originalSend.call(this, data);
    };

    // Override onclose
    ws.addEventListener('close', function(event) {
      console.log('🔴 WebSocket CERRADO');
      console.log('🔢 Código:', event.code);
      console.log('📝 Razón:', event.reason || 'Sin razón específica');
      console.log('');
    });

    // Override onerror
    ws.addEventListener('error', function(event) {
      console.log('❌ WebSocket ERROR');
      console.error(event);
      console.log('');
    });

    return ws;
  };

  // Preservar propiedades del WebSocket original
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;

  console.log('✅ Inspector instalado correctamente');
  console.log('⏳ Esperando conexiones WebSocket...');
  console.log('');
  console.log('💡 TIP: Ejecuta window.inspectorReport() en cualquier momento para ver estadísticas');
  console.log('');

  // Función global para generar reporte
  window.inspectorReport = function() {
    console.clear();
    console.log('📊 REPORTE DEL INSPECTOR\n');
    console.log('═══════════════════════════════════════\n');

    if (inspector.websockets.length === 0) {
      console.log('❌ No se han detectado conexiones WebSocket\n');
      console.log('💡 Asegúrate de que:');
      console.log('   1. Hay una carrera activa en la página');
      console.log('   2. El script se ejecutó ANTES de cargar la página');
      console.log('   3. La página está completamente cargada');
      return;
    }

    inspector.websockets.forEach((ws, index) => {
      console.log(`\n🌐 WEBSOCKET #${index + 1}`);
      console.log('─────────────────────────────────────');
      console.log('📍 URL:', ws.url);
      console.log('🔧 Protocols:', ws.protocols || 'none');
      console.log('⏰ Conectado:', ws.connectedAt);
      console.log('📨 Mensajes:', ws.messages.length);
      console.log('');
    });

    console.log('\n📈 ESTADÍSTICAS GENERALES');
    console.log('─────────────────────────────────────');
    console.log('📨 Total mensajes:', inspector.messageCount);
    console.log('⏱️  Tiempo activo:', Math.floor((Date.now() - inspector.startTime) / 1000), 'segundos');
    console.log('📊 Frecuencia:', (inspector.messageCount / ((Date.now() - inspector.startTime) / 1000)).toFixed(2), 'msg/seg');
    console.log('');

    if (inspector.sampleMessages.length > 0) {
      console.log('\n📦 MUESTRA DE MENSAJES (primeros 10)');
      console.log('─────────────────────────────────────');
      inspector.sampleMessages.forEach((msg, i) => {
        console.log(`\nMensaje #${i + 1} (${msg.timestamp})`);
        console.log('Tamaño:', msg.size, 'bytes');

        try {
          const parsed = JSON.parse(msg.data);
          console.log('JSON:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('Raw:', msg.data.substring(0, 300));
        }
      });
    }

    console.log('\n\n💾 DATOS PARA COPIAR');
    console.log('─────────────────────────────────────');
    console.log('Para usar estos datos en tu código, copia esto:\n');
    console.log(JSON.stringify({
      websockets: inspector.websockets.map(ws => ({
        url: ws.url,
        protocols: ws.protocols,
        connectedAt: ws.connectedAt,
        messageCount: ws.messages.length
      })),
      totalMessages: inspector.messageCount,
      sampleMessages: inspector.sampleMessages.slice(0, 5).map(m => {
        try {
          return {
            timestamp: m.timestamp,
            parsed: JSON.parse(m.data)
          };
        } catch (e) {
          return {
            timestamp: m.timestamp,
            raw: m.data.substring(0, 200)
          };
        }
      })
    }, null, 2));

    console.log('\n\n═══════════════════════════════════════\n');
  };

  // Auto-reporte cada 30 segundos
  setInterval(() => {
    if (inspector.messageCount > 0 && inspector.messageCount % 50 === 0) {
      console.log(`\n⏱️  Update: ${inspector.messageCount} mensajes recibidos...`);
    }
  }, 30000);

  // Reporte final al cerrar la página
  window.addEventListener('beforeunload', () => {
    console.log('\n\n🏁 Sesión finalizada');
    window.inspectorReport();
  });

})();

console.log('\n💡 INSTRUCCIONES:');
console.log('1. Espera a que haya una carrera activa');
console.log('2. Observa la consola - verás los mensajes en tiempo real');
console.log('3. Ejecuta window.inspectorReport() para ver estadísticas');
console.log('4. Copia el JSON resultante y pégalo en un archivo\n');
