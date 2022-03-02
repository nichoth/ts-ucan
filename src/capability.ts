import * as abilities from "./capability/ability"
import * as resources from "./capability/resource"
import { Ability, Capability, Superuser, SUPERUSER } from "./capability/types"


export { abilities, resources }
export * from "./capability/encoding"
export * from "./capability/types"


// 🌸


export function as(identifier: string): Capability {
  return {
    with: resources.as(identifier),
    can: SUPERUSER
  }
}


export function my(resource: Superuser | string): Capability {
  return {
    with: resources.my(resource),
    can: SUPERUSER
  }
}


export function prf(selector: Superuser | number, ability: Ability): Capability {
  return {
    with: resources.prf(selector),
    can: ability
  }
}