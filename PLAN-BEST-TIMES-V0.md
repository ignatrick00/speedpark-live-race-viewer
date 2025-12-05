# Plan: Mejores Tiempos con Datos V0

## 🎯 Objetivo

Crear 8 tablas de rankings en `/ranking`:

### 👤 Pilotos - Mejores Tiempos
1. **Mejor del Día** - Mejores tiempos de hoy
2. **Mejor de la Semana** - Mejores tiempos últimos 7 días
3. **Mejor del Mes** - Mejores tiempos últimos 30 días
4. **Mejor de Todos los Tiempos** - Mejores tiempos históricos

### 🏎️ Karts - Mejores Tiempos
5. **Mejor del Día** - Mejores tiempos por kart hoy
6. **Mejor de la Semana** - Mejores tiempos por kart últimos 7 días
7. **Mejor del Mes** - Mejores tiempos por kart últimos 30 días
8. **Mejor de Todos los Tiempos** - Mejores tiempos por kart históricos

---

## 📊 Estructura de Datos V0

```javascript
// Colección: race_sessions_v0
{
  sessionId: "HEAT 84...",
  sessionDate: ISODate("2025-12-05"),
  drivers: [
    {
      driverName: "kitt",
      kartNumber: 11,
      bestTime: 38842,  // ← Mejor tiempo de esta carrera
      laps: [
        { lapNumber: 1, time: 41000 },
        { lapNumber: 2, time: 38842 },  // ← Este es el mejor
        { lapNumber: 3, time: 40500 }
      ]
    }
  ]
}
```

---

## 🔧 Implementación

### PASO 1: API para Mejores Tiempos de Pilotos

**Archivo:** `src/app/api/best-times-v0/drivers/route.ts`

**Endpoint:** `GET /api/best-times-v0/drivers?period=day|week|month|all`

**Query MongoDB:**
```javascript
// Filtro por período
let dateFilter = {};
if (period === 'day') {
  dateFilter = { sessionDate: { $gte: startOfToday } };
} else if (period === 'week') {
  dateFilter = { sessionDate: { $gte: last7Days } };
} else if (period === 'month') {
  dateFilter = { sessionDate: { $gte: last30Days } };
}

// Aggregate para obtener mejores tiempos
const bestTimes = await RaceSessionV0.aggregate([
  { $match: dateFilter },
  { $unwind: "$drivers" },
  { $match: { "drivers.bestTime": { $gt: 0 } } },
  {
    $group: {
      _id: "$drivers.driverName",
      bestTime: { $min: "$drivers.bestTime" },
      sessionName: { $first: "$sessionName" },
      sessionDate: { $first: "$sessionDate" },
      kartNumber: { $first: "$drivers.kartNumber" }
    }
  },
  { $sort: { bestTime: 1 } },
  { $limit: 10 }
]);
```

**Respuesta:**
```json
{
  "success": true,
  "period": "day",
  "bestTimes": [
    {
      "position": 1,
      "driverName": "kitt",
      "bestTime": 38842,
      "sessionName": "[HEAT] 84 - Carrera",
      "sessionDate": "2025-12-05",
      "kartNumber": 11
    }
  ]
}
```

---

### PASO 2: API para Mejores Tiempos de Karts

**Archivo:** `src/app/api/best-times-v0/karts/route.ts`

**Endpoint:** `GET /api/best-times-v0/karts?period=day|week|month|all`

**Query MongoDB:**
```javascript
const bestKartTimes = await RaceSessionV0.aggregate([
  { $match: dateFilter },
  { $unwind: "$drivers" },
  { $match: { "drivers.bestTime": { $gt: 0 } } },
  {
    $group: {
      _id: "$drivers.kartNumber",
      bestTime: { $min: "$drivers.bestTime" },
      driverName: { $first: "$drivers.driverName" },
      sessionName: { $first: "$sessionName" },
      sessionDate: { $first: "$sessionDate" }
    }
  },
  { $sort: { bestTime: 1 } },
  { $limit: 10 }
]);
```

**Respuesta:**
```json
{
  "success": true,
  "period": "day",
  "bestTimes": [
    {
      "position": 1,
      "kartNumber": 11,
      "bestTime": 38842,
      "driverName": "kitt",
      "sessionName": "[HEAT] 84 - Carrera",
      "sessionDate": "2025-12-05"
    }
  ]
}
```

---

### PASO 3: Componente BestTimesV0

**Archivo:** `src/components/BestTimesV0.tsx`

**Estructura:**
```tsx
export default function BestTimesV0() {
  const [driverTimes, setDriverTimes] = useState({
    day: [],
    week: [],
    month: [],
    all: []
  });

  const [kartTimes, setKartTimes] = useState({
    day: [],
    week: [],
    month: [],
    all: []
  });

  useEffect(() => {
    fetchAllBestTimes();
  }, []);

  const fetchAllBestTimes = async () => {
    // Fetch en paralelo
    const [dayD, weekD, monthD, allD, dayK, weekK, monthK, allK] =
      await Promise.all([
        fetch('/api/best-times-v0/drivers?period=day'),
        fetch('/api/best-times-v0/drivers?period=week'),
        fetch('/api/best-times-v0/drivers?period=month'),
        fetch('/api/best-times-v0/drivers?period=all'),
        fetch('/api/best-times-v0/karts?period=day'),
        fetch('/api/best-times-v0/karts?period=week'),
        fetch('/api/best-times-v0/karts?period=month'),
        fetch('/api/best-times-v0/karts?period=all')
      ]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sección Pilotos */}
      <div>
        <h2>🏆 Mejores Tiempos - Pilotos</h2>

        <BestTimeTable
          title="📅 Hoy"
          data={driverTimes.day}
          type="driver"
        />

        <BestTimeTable
          title="📊 Semana"
          data={driverTimes.week}
          type="driver"
        />

        <BestTimeTable
          title="📈 Mes"
          data={driverTimes.month}
          type="driver"
        />

        <BestTimeTable
          title="⭐ All-Time"
          data={driverTimes.all}
          type="driver"
        />
      </div>

      {/* Sección Karts */}
      <div>
        <h2>🏎️ Mejores Tiempos - Karts</h2>

        <BestTimeTable
          title="📅 Hoy"
          data={kartTimes.day}
          type="kart"
        />

        <BestTimeTable
          title="📊 Semana"
          data={kartTimes.week}
          type="kart"
        />

        <BestTimeTable
          title="📈 Mes"
          data={kartTimes.month}
          type="kart"
        />

        <BestTimeTable
          title="⭐ All-Time"
          data={kartTimes.all}
          type="kart"
        />
      </div>
    </div>
  );
}
```

---

### PASO 4: Componente BestTimeTable (reutilizable)

```tsx
interface BestTimeTableProps {
  title: string;
  data: BestTime[];
  type: 'driver' | 'kart';
}

function BestTimeTable({ title, data, type }: BestTimeTableProps) {
  return (
    <div className="bg-racing-black/80 border border-electric-blue/20 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-bold text-electric-blue mb-3">{title}</h3>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-sky-blue/20">
            <th className="text-left p-2">#</th>
            <th className="text-left p-2">
              {type === 'driver' ? 'Piloto' : 'Kart'}
            </th>
            <th className="text-right p-2">Tiempo</th>
            <th className="text-right p-2">Sesión</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx} className="border-b border-sky-blue/10">
              <td className="p-2 text-gold font-bold">
                {getMedalEmoji(idx + 1) || `#${idx + 1}`}
              </td>
              <td className="p-2 text-white">
                {type === 'driver' ? (
                  <div>
                    <div>{item.driverName}</div>
                    <div className="text-xs text-sky-blue/60">
                      Kart #{item.kartNumber}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div>Kart #{item.kartNumber}</div>
                    <div className="text-xs text-sky-blue/60">
                      {item.driverName}
                    </div>
                  </div>
                )}
              </td>
              <td className="p-2 text-right text-electric-blue font-mono">
                {formatTime(item.bestTime)}
              </td>
              <td className="p-2 text-right text-xs text-gray-400">
                {item.sessionName}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          No hay datos disponibles
        </div>
      )}
    </div>
  );
}
```

---

### PASO 5: Integrar en /ranking

**Archivo:** `src/app/ranking/page.tsx`

```tsx
import BestTimesV0 from '@/components/BestTimesV0';
import RaceBrowserV0 from '@/components/RaceBrowserV0';

export default function RankingPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-racing text-gold mb-2">
            🏁 RANKING & CARRERAS V0
          </h1>

          {/* Control de guardado */}
          <LapCaptureToggle />

          {/* NUEVO: Mejores Tiempos */}
          <BestTimesV0 />

          {/* Navegador de carreras */}
          <RaceBrowserV0 />
        </div>
      </div>
    </>
  );
}
```

---

## 🎨 Diseño Visual

```
┌─────────────────────────────────────────────────────────────┐
│ 🏁 RANKING & CARRERAS V0                                    │
├─────────────────────────────────────────────────────────────┤
│ [Toggle de Guardado]                                        │
├──────────────────────────┬──────────────────────────────────┤
│ 🏆 Mejores Tiempos       │ 🏎️ Mejores Tiempos              │
│    PILOTOS               │    KARTS                         │
├──────────────────────────┼──────────────────────────────────┤
│ 📅 HOY                   │ 📅 HOY                           │
│ 🥇 kitt    38.842s      │ 🥇 #11     38.842s (kitt)       │
│ 🥈 Rosa    39.100s      │ 🥈 #8      39.500s (Rosa)       │
│ 🥉 Juan    40.200s      │ 🥉 #5      40.100s (Juan)       │
├──────────────────────────┼──────────────────────────────────┤
│ 📊 SEMANA                │ 📊 SEMANA                        │
│ 🥇 kitt    38.500s      │ 🥇 #11     38.500s (kitt)       │
│ ...                      │ ...                              │
├──────────────────────────┼──────────────────────────────────┤
│ 📈 MES                   │ 📈 MES                           │
│ ...                      │ ...                              │
├──────────────────────────┼──────────────────────────────────┤
│ ⭐ ALL-TIME              │ ⭐ ALL-TIME                      │
│ ...                      │ ...                              │
└──────────────────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🏁 Navegador de Carreras V0                                 │
│ [Selector de fecha] [Lista de carreras]                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Checklist de Implementación

- [ ] Crear API `/api/best-times-v0/drivers/route.ts`
- [ ] Crear API `/api/best-times-v0/karts/route.ts`
- [ ] Crear componente `BestTimesV0.tsx`
- [ ] Crear componente `BestTimeTable.tsx` (reutilizable)
- [ ] Integrar en `/ranking/page.tsx`
- [ ] Probar con datos reales
- [ ] Hacer commit

---

## 🔍 Queries MongoDB

### Pilotos - Día
```javascript
db.race_sessions_v0.aggregate([
  { $match: { sessionDate: { $gte: today } } },
  { $unwind: "$drivers" },
  { $match: { "drivers.bestTime": { $gt: 0 } } },
  { $group: {
      _id: "$drivers.driverName",
      bestTime: { $min: "$drivers.bestTime" }
  }},
  { $sort: { bestTime: 1 } },
  { $limit: 10 }
])
```

### Karts - All Time
```javascript
db.race_sessions_v0.aggregate([
  { $unwind: "$drivers" },
  { $match: { "drivers.bestTime": { $gt: 0 } } },
  { $group: {
      _id: "$drivers.kartNumber",
      bestTime: { $min: "$drivers.bestTime" },
      driverName: { $first: "$drivers.driverName" }
  }},
  { $sort: { bestTime: 1 } },
  { $limit: 10 }
])
```

---

¿Aprobado para implementar? 🚀
