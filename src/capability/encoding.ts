import * as uint8arrays from "uint8arrays"
import { Capability } from "./types";


/**
 * Encode a capability.
 *
 * @param cap The capability to encode
 * @returns The capability encoded as url-safe base64 JSON
 */
export function encode(cap: Capability): string {
  return uint8arrays.toString(uint8arrays.fromString(JSON.stringify(cap), "utf8"), "base64url")
}
