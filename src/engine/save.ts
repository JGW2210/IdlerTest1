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

  // v1 -> v2: the map gained rings 3-5, sites gained depth layers, and
  // Archaeology gained lore and map fragments.
  (save) => {
    save['lore'] ??= []
    save['mapFragments'] ??= []
    save['uidCounter'] ??= 0

    // Region ids are unchanged, but every RegionState needs the new survey
    // field, and the regions added in this version need entries at all.
    const regions = (save['regions'] ?? {}) as Record<string, Record<string, unknown>>
    for (const rs of Object.values(regions)) {
      rs['surveyed'] ??= rs['discovered'] ? 0.45 : 0
    }
    save['regions'] = regions

    // Site layer ids replaced the old flat node ids wholesale, so any focus or
    // retinue assignment pointing at one is now dangling. Clear it rather than
    // leaving the player staring at a slot that silently does nothing.
    const clearNode = (a: Record<string, unknown> | undefined) => {
      if (a && a['kind'] === 'node') {
        a['kind'] = 'idle'
        delete a['node']
        a['progress'] = 0
      }
    }
    clearNode(save['focus'] as Record<string, unknown> | undefined)
    for (const m of (save['retinue'] ?? []) as Record<string, unknown>[]) {
      clearNode(m['assignment'] as Record<string, unknown> | undefined)
    }
    return save
  },

  // v2 -> v3: rings 3-5 gained foreign holds, so regions carry standing.
  (save) => {
    const regions = (save['regions'] ?? {}) as Record<string, Record<string, unknown>>
    for (const rs of Object.values(regions)) rs['standing'] ??= 0
    save['regions'] = regions
    return save
  },

  // v3 -> v4: war. An existing save has no companies and no plan; the plan is
  // filled in on load rather than here, since it needs uids off the save.
  (save) => {
    save['companies'] ??= []
    save['battlePlan'] ??= []
    save['battle'] ??= null
    save['threats'] ??= []
    save['atWarWith'] ??= []
    save['musterTimer'] ??= 0
    save['pendingSuccession'] ??= false
    return save
  },
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
