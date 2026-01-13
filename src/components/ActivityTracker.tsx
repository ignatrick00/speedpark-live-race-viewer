'use client';

import { useActivityTracker } from '@/hooks/useActivityTracker';

/**
 * Component that enables automatic activity tracking
 * Should be included once in the root layout
 */
export default function ActivityTracker() {
  useActivityTracker();
  return null; // This component doesn't render anything
}
