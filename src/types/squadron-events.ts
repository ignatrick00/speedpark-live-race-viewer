// Categorías de eventos
export enum EventCategory {
  LE_MANS = 'le_mans',
  GRAND_PRIX_ELITE = 'grand_prix_elite',
  RACING_MASTERS = 'racing_masters',
  PRO_CHAMPIONSHIP = 'pro_championship',
  OPEN_SERIES = 'open_series',
}

// Configuración de categorías
export const EventCategoryConfig = {
  [EventCategory.LE_MANS]: {
    name: 'Le Mans',
    description: 'Carrera de Resistencia - 2 horas',
    points: 5000,
    requiredRank: 10, // Top 10 escuderías
    frequencyPerYear: 2,
    mandatoryForTop: 5, // Obligatorio para Top 5
    color: 'from-red-600 to-orange-600',
  },
  [EventCategory.GRAND_PRIX_ELITE]: {
    name: 'Grand Prix Élite',
    description: 'División Máxima',
    points: 2500,
    requiredRank: 20, // Top 20 escuderías
    frequencyPerYear: 4,
    mandatoryForTop: 10, // Obligatorio para Top 10
    color: 'from-yellow-500 to-amber-600',
  },
  [EventCategory.RACING_MASTERS]: {
    name: 'Racing Masters',
    description: 'División Alta',
    points: 1500,
    requiredRank: 50, // Top 50 escuderías
    frequencyPerYear: 8,
    mandatoryForTop: 25, // Obligatorio para Top 25
    color: 'from-blue-500 to-indigo-600',
  },
  [EventCategory.PRO_CHAMPIONSHIP]: {
    name: 'Pro Championship',
    description: 'División Media',
    points: 800,
    requiredRank: 100, // Top 100 escuderías
    frequencyPerYear: 12,
    mandatoryForTop: null, // No obligatorio
    color: 'from-green-500 to-emerald-600',
  },
  [EventCategory.OPEN_SERIES]: {
    name: 'Open Series',
    description: 'División Básica',
    points: 400,
    requiredRank: null, // Sin restricciones
    frequencyPerYear: 20,
    mandatoryForTop: null,
    color: 'from-purple-500 to-pink-600',
  },
};
