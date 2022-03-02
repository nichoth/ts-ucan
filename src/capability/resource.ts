import { ResourcePointer, Superuser } from "./types"


// 🌸


export function as(identifier: string): ResourcePointer {
  return {
    scheme: "as",
    hierPart: identifier
  }
}


export function my(resource: Superuser | string): ResourcePointer {
  return {
    scheme: "my",
    hierPart: resource
  }
}


export function prf(selector: Superuser | number): ResourcePointer {
  return {
    scheme: "prf",
    hierPart: selector.toString()
  }
}