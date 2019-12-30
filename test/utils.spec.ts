import { get, upperFirst } from '../src/utils'

describe('Utils', function(): void {
  describe('.upperFirst', function(): void {
    it('should correctly convert strings', function(): void {
      expect(upperFirst('abc')).toEqual('Abc')
      expect(upperFirst('aBC')).toEqual('ABC')
      expect(upperFirst('')).toEqual('')
      expect(upperFirst(3)).toEqual(3)
    })
  })

  describe('.get', function(): void {
    it('should correctly return paths', function(): void {
      const target = {
        a: [{ b: { c: 1 } }],
        b: null
      }

      expect(get(target, 'a')).toEqual([{ b: { c: 1 } }])
      expect(get(target, 'b.c')).toBeUndefined()
      expect(get(target, 'a.0.b')).toEqual({ c: 1 })
      expect(get(target, 'a.0.b.c')).toEqual(1)
      expect(get(target, 'a.[0].b')).toEqual({ c: 1 })
      expect(get(target, 'a.[2].b')).toBeUndefined()
      expect(get(target, 'a.[2]a.b')).toBeUndefined()
      expect(get(target, 'a.0.c.e.f')).toBeUndefined()
    })
  })
})
