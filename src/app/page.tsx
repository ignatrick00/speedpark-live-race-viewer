export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-blue-800/30 bg-black/40 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">🏁</span>
              </div>
              <h1 className="font-racing text-3xl text-white tracking-wider">
                KARTEANDO<span className="text-cyan-400">.CL</span>
              </h1>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 text-cyan-400 hover:text-white transition-colors border border-cyan-400/30 rounded-lg hover:bg-cyan-400/10">
                Login
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-lg hover:from-cyan-500 hover:to-blue-600 transition-all shadow-lg hover:shadow-cyan-400/25">
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-12">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="font-racing text-6xl md:text-8xl text-white mb-6 tracking-wider">
            LIVE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">RACING</span>
          </h2>
          <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
            Plataforma completa de karting competitivo con sistema de rankings, 
            inscripciones a carreras y seguimiento en tiempo real
          </p>
          
          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-black/30 backdrop-blur-sm border border-blue-800/30 rounded-xl p-6 hover:border-cyan-400/50 transition-all">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="font-racing text-xl text-cyan-400 mb-2">RANKINGS</h3>
              <p className="text-blue-200 text-sm">Sistema dual de habilidad y limpieza con algoritmos avanzados</p>
            </div>
            
            <div className="bg-black/30 backdrop-blur-sm border border-blue-800/30 rounded-xl p-6 hover:border-cyan-400/50 transition-all">
              <div className="text-3xl mb-4">🏁</div>
              <h3 className="font-racing text-xl text-cyan-400 mb-2">CARRERAS</h3>
              <p className="text-blue-200 text-sm">Inscripciones, calendario y gestión completa de eventos</p>
            </div>
            
            <div className="bg-black/30 backdrop-blur-sm border border-blue-800/30 rounded-xl p-6 hover:border-cyan-400/50 transition-all">
              <div className="text-3xl mb-4">📺</div>
              <h3 className="font-racing text-xl text-cyan-400 mb-2">LIVE VIEW</h3>
              <p className="text-blue-200 text-sm">Seguimiento en tiempo real de todas las sesiones activas</p>
            </div>
          </div>

          {/* Live Race Preview */}
          <div className="mt-16 bg-black/40 backdrop-blur-sm border border-blue-800/30 rounded-2xl p-8">
            <h3 className="font-racing text-2xl text-cyan-400 mb-6">LIVE RACE VIEWER</h3>
            <div className="bg-slate-900/50 rounded-lg p-6 border border-blue-700/30">
              <div className="text-center">
                <div className="inline-flex items-center space-x-2 text-green-400 mb-4">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="font-digital text-sm">SESIÓN ACTIVA</span>
                </div>
                <p className="text-blue-200">
                  El live viewer se implementará en la próxima fase con integración WebSocket SMS-Timing
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-blue-800/30 bg-black/40 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <p className="text-blue-300 text-sm">
              © 2025 Karteando.cl - Plataforma de Karting Competitivo
            </p>
            <p className="text-blue-400 text-xs mt-2">
              Fase 1: Setup Inicial Completado ✅
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}