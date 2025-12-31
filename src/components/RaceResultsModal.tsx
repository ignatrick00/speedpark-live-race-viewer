'use client';

import { useState, useEffect } from 'react';
import RaceResultsView from './RaceResultsView';

interface RaceResultsModalProps {
  sessionId: string;
  friendlyRaceParticipants?: Array<{ name: string; kartNumber: number; userId?: string }>;
  onClose: () => void;
}

export default function RaceResultsModal({
  sessionId,
  friendlyRaceParticipants = [],
  onClose
}: RaceResultsModalProps) {
  const [raceDetails, setRaceDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRaceResults();
  }, [sessionId]);

  const fetchRaceResults = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/race-results-v0?sessionId=${encodeURIComponent(sessionId)}`);
      const data = await response.json();

      if (data.success) {
        setRaceDetails(data.race);
      }
    } catch (error) {
      console.error('Error fetching race results:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-racing-black/95 to-racing-black/90 border-2 border-electric-blue/30 rounded-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && (
          <div className="p-12 text-center">
            <div className="animate-spin text-6xl mb-4">🏁</div>
            <p className="text-sky-blue/70">Cargando resultados...</p>
          </div>
        )}

        {!loading && raceDetails && (
          <RaceResultsView
            raceDetails={raceDetails}
            highlightedParticipants={friendlyRaceParticipants}
            onBack={onClose}
            showBackButton={true}
          />
        )}
      </div>
    </div>
  );
}
