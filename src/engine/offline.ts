import type { GameState } from './types'
import { CATCHUP_STEP_SECONDS, OFFLINE_CAP_SECONDS } from './curves'
import { stepAll, type TickReport } from './tick'

/**
 * Offline catch-up (ballot II-A).
 *
 * There is no separate "offline formula" to keep in sync with the live game —
 * this runs the same engine with a longer stride and asks it to settle
 * expectations rather than roll (see grantYields in tick.ts). A twelve-hour
 * absence therefore pays exactly what twelve hours of watching would have
 * averaged, which is the only version of this that stays fair in both directions.
 */

export interface OfflineResult {
  /** Real seconds the player was away. */
  away: number
  /** Seconds actually simulated, after the cap. */
  credited: number
  cappedBy: number
  report: TickReport
}

export function catchUp(state: GameState, now = Date.now(), cap = OFFLINE_CAP_SECONDS): OfflineResult | null {
  const away = Math.max(0, (now - state.lastSeen) / 1000)
  state.lastSeen = now

  // Below a minute is not an absence, it is a page reload.
  if (away < 60) return null

  const credited = Math.min(away, cap)
  const report = stepAll(state, credited, 'offline', CATCHUP_STEP_SECONDS)

  return {
    away,
    credited,
    cappedBy: Math.max(0, away - credited),
    report,
  }
}

export function formatDuration(seconds: number): string {
  const s = Math.floor(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h >= 1) return `${h}h ${m}m`
  if (m >= 1) return `${m}m`
  return `${s}s`
}
