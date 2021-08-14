/* eslint-disable @typescript-eslint/no-floating-promises */

import t from 'tap'
import { get, upperFirst } from '../src/utils'

type Test = typeof t

t.test('Utils', (t: Test) => {
  t.test('.upperFirst should correctly convert strings', (t: Test) => {
    t.equal(upperFirst('abc'), 'Abc')
    t.equal(upperFirst('aBC'), 'ABC')
    t.equal(upperFirst(''), '')
    t.equal(upperFirst(3), 3)

    t.end()
  })

  t.test('.get should correctly return paths', (t: Test) => {
    const target = {
      a: [{ b: { c: 1 } }],
      b: null
    }

    t.same(get(target, 'a'), [{ b: { c: 1 } }])
    t.type(get(target, 'b.c'), 'undefined')
    t.same(get(target, 'a.0.b'), { c: 1 })
    t.equal(get(target, 'a.0.b.c'), 1)
    t.same(get(target, 'a.[0].b'), { c: 1 })
    t.type(get(target, 'a.[2].b'), 'undefined')
    t.type(get(target, 'a.[2]a.b'), 'undefined')
    t.type(get(target, 'a.0.c.e.f'), 'undefined')

    t.end()
  })

  t.end()
})
