/**
 * Analizador automatizado del WebSocket de RaceFacer
 *
 * USO:
 * npm install puppeteer
 * node scripts/racefacer-websocket-analyzer.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const RACEFACER_URL = 'https://live.racefacer.com/KM42Paine';
const OUTPUT_FILE = path.join(__dirname, 'racefacer-analysis.json');
const CAPTURE_DURATION = 120000; // 2 minutos

async function analyzeRaceFacerWebSocket() {
  console.log('🔍 RaceFacer WebSocket Analyzer');
  console.log('═══════════════════════════════════════\n');

  const analysis = {
    url: RACEFACER_URL,
    analyzedAt: new Date().toISOString(),
    websockets: [],
    httpRequests: [],
    messages: [],
    metadata: {}
  };

  let browser;

  try {
    console.log('🚀 Iniciando navegador...');
    browser = await puppeteer.launch({
      headless: false, // Ver lo que pasa
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Interceptar WebSockets
    const cdpSession = await page.target().createCDPSession();
    await cdpSession.send('Network.enable');

    console.log('📡 Escuchando conexiones de red...\n');

    // Capturar requests HTTP/HTTPS
    page.on('request', request => {
      const url = request.url();

      // Filtrar solo requests relevantes
      if (
        url.includes('racefacer') ||
        url.includes('timing') ||
        url.includes('api') ||
        url.includes('websocket') ||
        url.includes('ws')
      ) {
        analysis.httpRequests.push({
          timestamp: new Date().toISOString(),
          method: request.method(),
          url: url,
          headers: request.headers(),
          resourceType: request.resourceType()
        });

        console.log('🌐 HTTP Request:', request.method(), url);
      }
    });

    // Capturar responses
    page.on('response', async response => {
      const url = response.url();

      if (
        url.includes('racefacer') ||
        url.includes('timing') ||
        url.includes('api')
      ) {
        try {
          const contentType = response.headers()['content-type'] || '';

          if (contentType.includes('json')) {
            const data = await response.json();
            console.log('📥 JSON Response from:', url);
            console.log('Data preview:', JSON.stringify(data).substring(0, 100));
          }
        } catch (e) {
          // No es JSON o error parseando
        }
      }
    });

    // Interceptar WebSocket frames usando CDP
    cdpSession.on('Network.webSocketCreated', ({ requestId, url }) => {
      console.log('\n✅ WebSocket DETECTADO!');
      console.log('📍 URL:', url);
      console.log('🆔 Request ID:', requestId);
      console.log('');

      analysis.websockets.push({
        requestId,
        url,
        createdAt: new Date().toISOString(),
        frames: []
      });
    });

    cdpSession.on('Network.webSocketFrameSent', ({ requestId, timestamp, response }) => {
      const ws = analysis.websockets.find(w => w.requestId === requestId);
      if (ws) {
        const frame = {
          timestamp: new Date(timestamp * 1000).toISOString(),
          direction: 'sent',
          data: response.payloadData,
          opcode: response.opcode,
          mask: response.mask
        };

        ws.frames.push(frame);
        analysis.messages.push(frame);

        console.log('📤 WS Sent:', response.payloadData.substring(0, 100));
      }
    });

    cdpSession.on('Network.webSocketFrameReceived', ({ requestId, timestamp, response }) => {
      const ws = analysis.websockets.find(w => w.requestId === requestId);
      if (ws) {
        const frame = {
          timestamp: new Date(timestamp * 1000).toISOString(),
          direction: 'received',
          data: response.payloadData,
          opcode: response.opcode,
          mask: response.mask
        };

        ws.frames.push(frame);
        analysis.messages.push(frame);

        // Parsear JSON si es posible
        let parsed = null;
        try {
          parsed = JSON.parse(response.payloadData);
          console.log('📥 WS Received (JSON):', JSON.stringify(parsed).substring(0, 150));
        } catch (e) {
          console.log('📥 WS Received:', response.payloadData.substring(0, 100));
        }
      }
    });

    cdpSession.on('Network.webSocketClosed', ({ requestId, timestamp }) => {
      console.log('\n🔴 WebSocket CERRADO');
      console.log('⏰ Timestamp:', new Date(timestamp * 1000).toISOString());
      console.log('');
    });

    // Navegar a la página
    console.log('🌐 Navegando a:', RACEFACER_URL, '\n');
    await page.goto(RACEFACER_URL, { waitUntil: 'networkidle2' });

    // Obtener metadata de la página
    const pageMetadata = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        scripts: Array.from(document.scripts).map(s => s.src).filter(Boolean),
        metas: Array.from(document.querySelectorAll('meta')).map(m => ({
          name: m.getAttribute('name'),
          content: m.getAttribute('content'),
          property: m.getAttribute('property')
        }))
      };
    });

    analysis.metadata = pageMetadata;
    console.log('📄 Página cargada:', pageMetadata.title, '\n');

    // Inyectar script inspector
    await page.evaluate(() => {
      console.log('🔧 Inspector inyectado en la página');

      // Ver si hay WebSockets ya creados
      window.__wsDebug = [];

      const OriginalWebSocket = window.WebSocket;
      window.WebSocket = function(url, protocols) {
        console.log('🔌 WebSocket constructor llamado:', url);
        window.__wsDebug.push({ url, protocols, timestamp: new Date().toISOString() });
        return new OriginalWebSocket(url, protocols);
      };
      window.WebSocket.prototype = OriginalWebSocket.prototype;
    });

    // Esperar y capturar datos
    console.log(`⏳ Capturando datos por ${CAPTURE_DURATION / 1000} segundos...`);
    console.log('💡 Si hay una carrera activa, verás mensajes en tiempo real\n');

    await new Promise(resolve => setTimeout(resolve, CAPTURE_DURATION));

    // Obtener debug info de la página
    const wsDebug = await page.evaluate(() => window.__wsDebug || []);
    if (wsDebug.length > 0) {
      console.log('\n🔍 WebSockets detectados desde la página:', wsDebug);
    }

    // Generar reporte
    console.log('\n\n📊 REPORTE FINAL');
    console.log('═══════════════════════════════════════');
    console.log('WebSockets detectados:', analysis.websockets.length);
    console.log('HTTP Requests capturados:', analysis.httpRequests.length);
    console.log('Mensajes WebSocket:', analysis.messages.length);
    console.log('');

    if (analysis.websockets.length > 0) {
      analysis.websockets.forEach((ws, i) => {
        console.log(`\n🌐 WebSocket #${i + 1}`);
        console.log('URL:', ws.url);
        console.log('Frames:', ws.frames.length);
        console.log('Creado:', ws.createdAt);
      });
    } else {
      console.log('⚠️  NO se detectaron WebSockets');
      console.log('\nPosibles razones:');
      console.log('1. No hay una carrera activa en este momento');
      console.log('2. RaceFacer usa polling HTTP en lugar de WebSocket');
      console.log('3. El WebSocket se crea solo durante carreras en vivo');
      console.log('\n💡 Revisa los HTTP Requests capturados - puede que usen API REST');
    }

    // Guardar análisis
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(analysis, null, 2));
    console.log('\n💾 Análisis guardado en:', OUTPUT_FILE);

    // Análisis de requests HTTP para buscar API endpoints
    if (analysis.httpRequests.length > 0) {
      console.log('\n\n🔍 ANÁLISIS DE API ENDPOINTS');
      console.log('═══════════════════════════════════════');

      const apiRequests = analysis.httpRequests.filter(r =>
        r.url.includes('/api/') || r.resourceType === 'xhr' || r.resourceType === 'fetch'
      );

      if (apiRequests.length > 0) {
        console.log('\n✅ Endpoints API encontrados:');
        apiRequests.forEach(req => {
          console.log(`\n${req.method} ${req.url}`);
        });
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      console.log('\n🔒 Cerrando navegador...');
      await browser.close();
    }
  }

  return analysis;
}

// Ejecutar
if (require.main === module) {
  analyzeRaceFacerWebSocket()
    .then(() => {
      console.log('\n✅ Análisis completado\n');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Error fatal:', err);
      process.exit(1);
    });
}

module.exports = { analyzeRaceFacerWebSocket };
