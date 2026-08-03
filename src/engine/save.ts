import type { GameState } from './types'
import { SAVE_VERSION } from './createState'

/**
 * Persistence. IndexedDB rather than localStorage because the save is a
 * structured object that will only grow, and because a synchronous 5 MB ceiling
 * on the main thread is not somewhere to be in five years' time.
 *
 * Migrations are explicit and ordered. A save is never silently discarded; if it
 * cannot be migrated the caller is told so and can offer an export.
 */

const DB_NAME = 'ashcombe'
const STORE = 'saves'
const SLOT = 'main'

type Migration = (save: Record<string, unknown>) => Record<string, unknown>

/** Index N migrates a version-N save to version N+1. */
const MIGRATIONS: Migration[] = [
  // v0 -> v1: nothing shipped before v1; placeholder that keeps the shape honest.
  (save) => save,
]

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveGame(state: GameState): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(structuredClone(state), SLOT)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function loadGame(): Promise<GameState | null> {
  const db = await openDb()
  const raw = await new Promise<unknown>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(SLOT)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  db.close()
  if (!raw) return null
  return migrate(raw as Record<string, unknown>)
}

export async function clearGame(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(SLOT)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export function migrate(save: Record<string, unknown>): GameState {
  let version = typeof save['version'] === 'number' ? (save['version'] as number) : 0
  let current = save

  while (version < SAVE_VERSION) {
    const migration = MIGRATIONS[version]
    if (!migration) throw new Error(`No migration from save version ${version}`)
    current = migration(current)
    version += 1
    current['version'] = version
  }

  if (version > SAVE_VERSION) {
    throw new Error(`Save is from a newer version (${version}) than this build supports (${SAVE_VERSION}).`)
  }

  return current as unknown as GameState
}

// ---------------------------------------------------------- export / import

/** The save is the player's. Export produces something they can keep. */
export function exportSave(state: GameState): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))))
}

export function importSave(encoded: string): GameState {
  const json = decodeURIComponent(escape(atob(encoded.trim())))
  return migrate(JSON.parse(json) as Record<string, unknown>)
}
