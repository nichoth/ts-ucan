import { Ability, SUPERUSER } from "./types"


// 🛠


export function isEqual(a: Ability, b: Ability): boolean {
  if (a === SUPERUSER && b === SUPERUSER) return true
  if (a === SUPERUSER || b === SUPERUSER) return false

  return (
    a.namespace.toLowerCase() ===
    b.namespace.toLowerCase()
  ) &&
    (
      joinSegments(a.segments).toLowerCase() ===
      joinSegments(b.segments).toLowerCase()
    )
}


export function joinSegments(segments: string[]): string {
  return segments.join("/")
}