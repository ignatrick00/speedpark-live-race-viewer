const https = require('https');
const fs = require('fs');

const BASE_URL = 'https://mobile-api22.sms-timing.com/api';

// IDs conocidos
const YOUR_ID = '32617264';
const DIEGO_ID = '32670842';
const CONSTANZA_ID = '32670841';

function downloadPhoto(personId, filename, width = 100, height = 100) {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}/person/picture/speedpark?personId=${personId}&width=${width}&height=${height}`;
        console.log(`📸 Descargando foto: ${url}`);
        
        const req = https.get(url, (res) => {
            console.log(`📋 Status: ${res.statusCode}`);
            console.log(`📋 Content-Type: ${res.headers['content-type']}`);
            console.log(`📋 Content-Length: ${res.headers['content-length']}`);
            
            if (res.statusCode === 200) {
                const file = fs.createWriteStream(filename);
                
                res.on('data', (chunk) => {
                    file.write(chunk);
                });
                
                res.on('end', () => {
                    file.end();
                    console.log(`✅ Foto guardada: ${filename}`);
                    resolve({
                        success: true,
                        filename: filename,
                        contentType: res.headers['content-type'],
                        size: res.headers['content-length']
                    });
                });
                
                res.on('error', (error) => {
                    file.destroy();
                    fs.unlink(filename, () => {});
                    reject(error);
                });
                
            } else {
                let errorData = '';
                res.on('data', (chunk) => {
                    errorData += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        success: false,
                        statusCode: res.statusCode,
                        error: errorData.substring(0, 200)
                    });
                });
            }
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function testPhotoEndpoint() {
    console.log('📸 PROBANDO ENDPOINT DE FOTOS');
    console.log('=' .repeat(50));
    
    // Crear carpeta para fotos
    fs.mkdirSync('photos', { recursive: true });
    
    const testCases = [
        {
            name: 'Tu foto',
            id: YOUR_ID,
            filename: 'photos/tu_foto.jpg'
        },
        {
            name: 'Diego',
            id: DIEGO_ID,
            filename: 'photos/diego.jpg'
        },
        {
            name: 'Constanza',
            id: CONSTANZA_ID,
            filename: 'photos/constanza.jpg'
        },
        {
            name: 'ID del ejemplo',
            id: '63000000004176685',
            filename: 'photos/ejemplo.jpg'
        }
    ];
    
    for (const test of testCases) {
        try {
            console.log(`\n🔍 Probando: ${test.name} (ID: ${test.id})`);
            
            const result = await downloadPhoto(test.id, test.filename);
            
            if (result.success) {
                console.log(`🎉 ¡ÉXITO! Foto descargada`);
                console.log(`   📁 Archivo: ${result.filename}`);
                console.log(`   📏 Tipo: ${result.contentType}`);
                console.log(`   📊 Tamaño: ${result.size} bytes`);
                
                // Verificar que el archivo existe y tiene contenido
                const stats = fs.statSync(result.filename);
                if (stats.size > 0) {
                    console.log(`   ✅ Archivo válido: ${stats.size} bytes`);
                } else {
                    console.log(`   ⚠️  Archivo vacío`);
                }
                
            } else {
                console.log(`❌ Error ${result.statusCode}`);
                console.log(`   📄 Respuesta: ${result.error}`);
            }
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.log(`💥 Error: ${error.message}`);
        }
    }
    
    // Probar diferentes tamaños de foto para tu ID
    console.log(`\n🖼️  PROBANDO DIFERENTES TAMAÑOS PARA TU ID`);
    const sizes = [
        { w: 50, h: 50, name: 'pequeña' },
        { w: 200, h: 200, name: 'mediana' },
        { w: 400, h: 400, name: 'grande' }
    ];
    
    for (const size of sizes) {
        try {
            const filename = `photos/tu_foto_${size.w}x${size.h}.jpg`;
            console.log(`\n📐 Probando tamaño ${size.name} (${size.w}x${size.h})...`);
            
            const result = await downloadPhoto(YOUR_ID, filename, size.w, size.h);
            
            if (result.success) {
                console.log(`✅ Descargada: ${result.size} bytes`);
            } else {
                console.log(`❌ Error: ${result.statusCode}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.log(`💥 Error: ${error.message}`);
        }
    }
    
    console.log('\n🏁 ¡Prueba completada!');
    console.log('📁 Revisa la carpeta ./photos/ para ver las fotos descargadas');
}

// Función para probar un ID específico
async function testSingleId(personId) {
    const filename = `photos/persona_${personId}.jpg`;
    
    try {
        const result = await downloadPhoto(personId, filename);
        
        if (result.success) {
            console.log(`✅ Foto descargada: ${filename}`);
            return true;
        } else {
            console.log(`❌ No se pudo descargar foto para ID ${personId}`);
            return false;
        }
    } catch (error) {
        console.log(`💥 Error: ${error.message}`);
        return false;
    }
}

// Usar desde línea de comandos
if (process.argv.length > 2) {
    const personId = process.argv[2];
    console.log(`📸 Descargando foto para ID: ${personId}`);
    
    testSingleId(personId).then(success => {
        if (success) {
            console.log('🎉 ¡Foto descargada exitosamente!');
        }
        process.exit(success ? 0 : 1);
    });
} else {
    testPhotoEndpoint().catch(console.error);
}

console.log('\n💡 TIP: También puedes usar: node photo-downloader.js 32617264');