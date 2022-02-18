import * as util from "../util"


// 💎


export type Capability = {
  with: ResourcePointer
  can: Ability
}



// TYPES


export type Ability
  = Superuser
  | { namespace: string, segments: string[] }

export type ResourcePointer = {
  scheme: string,
  hierPart: Superuser | string
}

export const SUPERUSER: Superuser = "*"
export type Superuser = "*" // maximum ability



// TYPE CHECKS


export function isAbility(obj: unknown): obj is Ability {
  return obj === SUPERUSER
    || (
      util.isRecord(obj)
      && util.hasProp(obj, "namespace") && typeof obj.namespace === "string"
      && util.hasProp(obj, "segments") && Array.isArray(obj.segments)
    )
}

export function isCapability(obj: unknown): obj is Capability {
  return util.isRecord(obj)
    && util.hasProp(obj, "with") && isResourcePointer(obj.with)
    && util.hasProp(obj, "can") && isAbility(obj.can)
}

export function isResourcePointer(obj: unknown): obj is ResourcePointer {
  return util.isRecord(obj)
    && util.hasProp(obj, "scheme") && typeof obj.scheme === "string"
    && util.hasProp(obj, "hierPart") && (obj.hierPart === SUPERUSER || typeof obj.hierPart === "string")
}

export function isSuperuser(obj: unknown): obj is Superuser {
  return obj === SUPERUSER
}