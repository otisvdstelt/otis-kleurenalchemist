// De plank op dit apparaat. Alleen in localStorage, met try/catch eromheen: opslag kan geweigerd of leeg zijn

import type { Bottle } from './alchemy/bottle'
import { decodeShelf, encodeShelf } from './alchemy/share'

const SHELF_KEY = 'kleurenalchemist-plank'

/** De plank zoals hij hier bewaard is, of leeg */
export function readShelf(): Bottle[] {
  try {
    const kept = window.localStorage.getItem(SHELF_KEY)
    return kept ? (decodeShelf(kept) ?? []) : []
  } catch {
    return []
  }
}

/** Bewaar de plank. Lukt dat niet, dan blijft hij staan zolang de pagina open is */
export function keepShelf(bottles: readonly Bottle[]): boolean {
  try {
    if (bottles.length === 0) window.localStorage.removeItem(SHELF_KEY)
    else window.localStorage.setItem(SHELF_KEY, encodeShelf(bottles))
    return true
  } catch {
    return false
  }
}
