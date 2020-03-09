// @ts-ignore
import t from 'tap'
import { get, upperFirst } from '../src/utils'

t.test('Utils', (t: any) => {
  t.test('.upperFirst should correctly convert strings', (t: any) => {
    t.equal(upperFirst('abc'), 'Abc')
    t.equal(upperFirst('aBC'), 'ABC')
    t.equal(upperFirst(''), '')
    t.equal(upperFirst(3), 3)

    t.end()
  })

  t.test('.get should correctly return paths', (t: any) => {
    const target = {
      a: [{ b: { c: 1 } }],
      b: null
    }

    t.deepEqual(get(target, 'a'), [{ b: { c: 1 } }])
    t.type(get(target, 'b.c'), 'undefined')
    t.deepEqual(get(target, 'a.0.b'), { c: 1 })
    t.equal(get(target, 'a.0.b.c'), 1)
    t.deepEqual(get(target, 'a.[0].b'), { c: 1 })
    t.type(get(target, 'a.[2].b'), 'undefined')
    t.type(get(target, 'a.[2]a.b'), 'undefined')
    t.type(get(target, 'a.0.c.e.f'), 'undefined')

    t.end()
  })

  t.end()
})
