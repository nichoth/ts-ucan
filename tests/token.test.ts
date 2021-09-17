import * as token from '../src/token'
import * as Key from '../src/keypair'
import { Keypair, KeyType, Ucan } from '../src'

describe('token', () => {
  let issuer: Keypair
  let audience: Keypair
  let ucan: Ucan

  it('builds a ucan', async () => {
    issuer = await Key.create(KeyType.Edwards)
    audience = await Key.create(KeyType.Edwards)
    ucan = await token.build({
      audience: audience.did(),
      issuer,
      capabilities: [
        {
          "wnfs": "boris.fission.name/public/photos/",
          "cap": "OVERWRITE"
        },
        {
          "wnfs": "boris.fission.name/private/4tZA6S61BSXygmJGGW885odfQwpnR2UgmCaS5CfCuWtEKQdtkRnvKVdZ4q6wBXYTjhewomJWPL2ui3hJqaSodFnKyWiPZWLwzp1h7wLtaVBQqSW4ZFgyYaJScVkBs32BThn6BZBJTmayeoA9hm8XrhTX4CGX5CVCwqvEUvHTSzAwdaR",
          "cap": "APPEND"
        },
        {
          "email": "boris@fission.codes",
          "cap": "SEND"
        }
      ]
    })
  })

  it('validates a ucan', async () => {
    const isValid = await token.isValid(ucan)
    expect(isValid).toBe(true)
  })

  it('does not validate a bad ucan', async () => {
    const badUcan = {
      ...ucan,
      payload: {
        ...ucan.payload,
        audience: "fakeaudience"
      }
    }
    const isValid = await token.isValid(badUcan)
    expect(isValid).toBe(false)
  })

  it('encodes and decodes ucans', () => {
    const encoded = token.encode(ucan)
    const decoded = token.decode(encoded)
    expect(decoded).toEqual(ucan)
  })

  it('attenuates valid children', async () => {
    const childUcan = await token.build({
      audience: "did:key:z6MkgYGF3thn8k1Fv4p4dWXKtsXCnLH7q9yw4QgNPULDmDKB",
      issuer: audience,
      capabilities: [
        {
          "wnfs": "boris.fission.name/public/photos/",
          "cap": "OVERWRITE"
        },
      ],
      proof: token.encode(ucan)
    })

    const isValid = await token.isValid(childUcan)
    expect(isValid).toBe(true)
  })

  it('identifies invalid attenuation', async () => {
    const childUcan = await token.build({
      audience: "did:key:z6MkgYGF3thn8k1Fv4p4dWXKtsXCnLH7q9yw4QgNPULDmDKB",
      issuer: audience,
      capabilities: [
        {
          "wnfs": "boris.fission.name/public/photos/",
          "cap": "SUPER"
        },
      ],
      proof: token.encode(ucan)
    })

    const isValid = await token.isValid(childUcan)
    expect(isValid).toBe(false)
  })
})