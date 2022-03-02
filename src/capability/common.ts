import { Ability, SUPERUSER } from "./types"


// ABILITIES


export function isSameAbility(a: Ability, b: Ability): boolean {
  if (a === SUPERUSER && b === SUPERUSER) return true
  if (a === SUPERUSER || b === SUPERUSER) return false

  return (
    a.namespace.toLowerCase() ===
    b.namespace.toLowerCase()
  ) &&
    (
      joinAbilitySegments(a.segments).toLowerCase() ===
      joinAbilitySegments(b.segments).toLowerCase()
    )
}


export function joinAbilitySegments(segments: string[]): string {
  return segments.join("/")
}