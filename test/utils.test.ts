import { deepStrictEqual, ifError } from 'node:assert'
import { test } from 'node:test'
import { get, upperFirst } from '../src/utils.js'

test('Utils', async () => {
  await test('.upperFirst should correctly convert strings', () => {
    deepStrictEqual(upperFirst('abc'), 'Abc')
    deepStrictEqual(upperFirst('aBC'), 'ABC')
    deepStrictEqual(upperFirst(''), '')
    deepStrictEqual(upperFirst(3), 3)
  })

  await test('.get should correctly return paths', () => {
    const target = {
      a: [{ b: { c: 1 } }],
      b: null
    }

    deepStrictEqual(get(target, 'a'), [{ b: { c: 1 } }])
    ifError(get(target, 'b.c'))
    deepStrictEqual(get(target, 'a.0.b'), { c: 1 })
    deepStrictEqual(get(target, 'a.0.b.c'), 1)
    deepStrictEqual(get(target, 'a.[0].b'), { c: 1 })
    ifError(get(target, 'a.[2].b'))
    ifError(get(target, 'a.[2]a.b'))
    ifError(get(target, 'a.0.c.e.f'))
  })
})
