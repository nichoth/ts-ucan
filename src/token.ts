import * as did from "./did"
import * as uint8arrays from "uint8arrays"

import * as util from "./util"
import { handleCompatibility } from "./compatibility"
import { verifySignatureUtf8 } from "./did/validation"
import { Capability } from "./capability"
import { Fact, Keypair, KeyType } from "./types"
import { Ucan, UcanHeader, UcanPayload } from "./types"


// CONSTANTS


const TYPE = "JWT"
const VERSION = "0.8.1"



// COMPOSING


/**
 * Create a UCAN, User Controlled Authorization Networks, JWT.
 *
 * ### Header
 *
 * `alg`, Algorithm, the type of signature.
 * `typ`, Type, the type of this data structure, JWT.
 * `ucv`, UCAN version.
 *
 * ### Payload
 *
 * `att`, Attenuation, a list of resources and capabilities that the ucan grants.
 * `aud`, Audience, the ID of who it's intended for.
 * `exp`, Expiry, unix timestamp of when the jwt is no longer valid.
 * `fct`, Facts, an array of extra facts or information to attach to the jwt.
 * `iss`, Issuer, the ID of who sent this.
 * `nbf`, Not Before, unix timestamp of when the jwt becomes valid.
 * `nnc`, Nonce, a randomly generated string, used to ensure the uniqueness of the jwt.
 * `prf`, Proofs, nested tokens with equal or greater privileges.
 *
 */
export async function build(params: {
  // from/to
  issuer: Keypair
  audience: string

  // capabilities
  capabilities?: Array<Capability>

  // time bounds
  lifetimeInSeconds?: number // expiration overrides lifetimeInSeconds
  expiration?: number
  notBefore?: number

  // proofs / other info
  facts?: Array<Fact>
  proofs?: Array<string>
  addNonce?: boolean
}): Promise<Ucan> {
  const keypair = params.issuer
  const didStr = did.publicKeyBytesToDid(keypair.publicKey, keypair.keyType)
  const payload = buildPayload({ ...params, issuer: didStr })
  return signWithKeypair(payload, keypair)
}

/**
 * Construct the payload for a UCAN.
 */
export function buildPayload(params: {
  // from/to
  issuer: string
  audience: string

  // capabilities
  capabilities?: Array<Capability>

  // time bounds
  lifetimeInSeconds?: number // expiration overrides lifetimeInSeconds
  expiration?: number
  notBefore?: number

  // proofs / other info
  facts?: Array<Fact>
  proofs?: Array<string>
  addNonce?: boolean
}): UcanPayload {
  const {
    issuer,
    audience,
    capabilities = [],
    lifetimeInSeconds = 30,
    expiration,
    notBefore,
    facts,
    proofs = [],
    addNonce = false
  } = params

  // Validate
  if (!issuer.startsWith("did:")) throw new Error("The issuer must be a DID")
  if (!audience.startsWith("did:")) throw new Error("The audience must be a DID")

  // Timestamps
  const currentTimeInSeconds = Math.floor(Date.now() / 1000)
  const exp = expiration || (currentTimeInSeconds + lifetimeInSeconds)

  // 📦
  return {
    aud: audience,
    att: capabilities,
    exp,
    fct: facts,
    iss: issuer,
    nbf: notBefore,
    nnc: addNonce ? util.generateNonce() : undefined,
    prf: proofs,
  }
}

/**
 * Encloses a UCAN payload as to form a finalised UCAN.
 */
export async function sign(
  payload: UcanPayload,
  keyType: KeyType,
  signFn: (data: Uint8Array) => Promise<Uint8Array>
): Promise<Ucan> {
  const header: UcanHeader = {
    alg: jwtAlgorithm(keyType),
    typ: TYPE,
    ucv: VERSION,
  }

  // Issuer key type must match UCAN algorithm
  if (did.didToPublicKey(payload.iss).type !== keyType) {
    throw new Error("The issuer's key type must match the given key type.")
  }

  // Encode parts
  const encodedHeader = encodeHeader(header)
  const encodedPayload = encodePayload(payload)

  // Sign
  const toSign = uint8arrays.fromString(`${encodedHeader}.${encodedPayload}`, "utf8")
  const sig = await signFn(toSign)

  // 📦
  return {
    header,
    payload,
    signature: uint8arrays.toString(sig, "base64url")
  }
}

/**
 * `sign` with a `Keypair`.
 */
export async function signWithKeypair(
  payload: UcanPayload,
  keypair: Keypair
): Promise<Ucan> {
  return sign(
    payload,
    keypair.keyType,
    data => keypair.sign(data)
  )
}



// ENCODING


/**
 * Encode a UCAN.
 *
 * @param ucan The UCAN to encode
 */
export function encode(ucan: Ucan): string {
  const encodedHeader = encodeHeader(ucan.header)
  const encodedPayload = encodePayload(ucan.payload)

  return encodedHeader + "." +
    encodedPayload + "." +
    ucan.signature
}

/**
 * Encode the header of a UCAN.
 *
 * @param header The UcanHeader to encode
 * @returns The header of a UCAN encoded as url-safe base64 JSON
 */
export function encodeHeader(header: UcanHeader): string {
  return uint8arrays.toString(uint8arrays.fromString(JSON.stringify(header), "utf8"), "base64url")
}

/**
 * Encode the payload of a UCAN.
 *
 * @param payload The UcanPayload to encode
 */
export function encodePayload(payload: UcanPayload): string {
  return uint8arrays.toString(uint8arrays.fromString(JSON.stringify(payload), "utf8"), "base64url")
}

/**
 * Parse an encoded UCAN header.
 *
 * @param encodedUcanHeader The encoded UCAN header.
 */
export function parseHeader(encodedUcanHeader: string): unknown {
  let decodedUcanHeader: string
  try {
    decodedUcanHeader = uint8arrays.toString(
      uint8arrays.fromString(encodedUcanHeader, "base64url"),
      "utf8"
    )
  } catch {
    throw new Error(`Can't parse UCAN header: ${encodedUcanHeader}: Can't parse as base64url.`)
  }

  try {
    return JSON.parse(decodedUcanHeader)
  } catch {
    throw new Error(`Can't parse UCAN header: ${encodedUcanHeader}: Can't parse base64url encoded JSON inside.`)
  }
}

/**
 * Parse an encoded UCAN payload.
 *
 * @param encodedUcanPayload The encoded UCAN payload.
 */
export function parsePayload(encodedUcanPayload: string): unknown {
  let decodedUcanPayload: string
  try {
    decodedUcanPayload = uint8arrays.toString(
      uint8arrays.fromString(encodedUcanPayload, "base64url"),
      "utf8"
    )
  } catch {
    throw new Error(`Can't parse UCAN payload: ${encodedUcanPayload}: Can't parse as base64url.`)
  }

  try {
    return JSON.parse(decodedUcanPayload)
  } catch {
    throw new Error(`Can't parse UCAN payload: ${encodedUcanPayload}: Can't parse base64url encoded JSON inside.`)
  }
}



// VALIDATION


/**
 * Validation options
 */
export interface ValidateOptions {
  checkIssuer?: boolean
  checkIsExpired?: boolean
  checkIsTooEarly?: boolean
  checkSignature?: boolean
}

/**
 * Parse & Validate **one layer** of a UCAN.
 * This doesn't validate attenutations and doesn't validate the whole UCAN chain.
 *
 * By default, this will check the signature and time bounds.
 *
 * @param encodedUcan the JWT-encoded UCAN to validate
 * @param options an optional parameter to configure turning off some validation options
 * @returns the parsed & validated UCAN (one layer)
 * @throws Error if the UCAN is invalid
 */
export async function validate(encodedUcan: string, options?: ValidateOptions): Promise<Ucan> {
  const checkIssuer = options?.checkIssuer ?? true
  const checkIsExpired = options?.checkIsExpired ?? true
  const checkIsTooEarly = options?.checkIsTooEarly ?? true
  const checkSignature = options?.checkSignature ?? true

  const [ encodedHeader, encodedPayload, signature ] = encodedUcan.split(".")
  if (encodedHeader == null || encodedPayload == null || signature == null) {
    throw new Error(`Can't parse UCAN: ${encodedUcan}: Expected JWT format: 3 dot-separated base64url-encoded values.`)
  }

  const headerDecoded = parseHeader(encodedHeader)
  const payloadDecoded = parsePayload(encodedPayload)

  const { header, payload } = handleCompatibility(headerDecoded, payloadDecoded)

  if (checkIssuer) {
    const issuerKeyType = did.didToPublicKey(payload.iss).type
    if (jwtAlgorithm(issuerKeyType) !== header.alg) {
      throw new Error(`Invalid UCAN: ${encodedUcan}: Issuer key type does not match UCAN's \`alg\` property.`)
    }
  }

  if (checkSignature) {
    if (!await verifySignatureUtf8(`${encodedHeader}.${encodedPayload}`, signature, payload.iss)) {
      throw new Error(`Invalid UCAN: ${encodedUcan}: Signature invalid.`)
    }
  }

  const ucan: Ucan = { header, payload, signature }

  if (checkIsExpired && isExpired(ucan)) {
    throw new Error(`Invalid UCAN: ${encodedUcan}: Expired.`)
  }

  if (checkIsTooEarly && isTooEarly(ucan)) {
    throw new Error(`Invalid UCAN: ${encodedUcan}: Not active yet (too early).`)
  }

  // TODO:
  // Check capabilities?
  // 5.3 Witness Chaining
  // 5.4 Rights Amplification

  return ucan
}

/**
 * Check if a UCAN is expired.
 *
 * @param ucan The UCAN to validate
 */
export function isExpired(ucan: Ucan): boolean {
  return ucan.payload.exp <= Math.floor(Date.now() / 1000)
}

/**
 * Check if a UCAN is not active yet.
 *
 * @param ucan The UCAN to validate
 */
export const isTooEarly = (ucan: Ucan): boolean => {
  if (ucan.payload.nbf == null) return false
  return ucan.payload.nbf > Math.floor(Date.now() / 1000)
}



// ㊙️


/**
 * JWT algorithm to be used in a JWT header.
 */
function jwtAlgorithm(keyType: KeyType): string {
  switch (keyType) {
    case "bls12-381": throw new Error(`Unknown KeyType "${keyType}"`)
    case "ed25519": return "EdDSA"
    case "rsa": return "RS256"
    default: throw new Error(`Unknown KeyType "${keyType}"`)
  }
}
