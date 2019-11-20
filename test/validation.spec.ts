import Ajv from 'ajv'
import { ValidationResult } from 'fastify'
import { convertValidationErrors, niceJoin } from '../src'

describe('Validation', function(): void {
  it('should correctly parse validation errors', function(): void {
    const ajv = new Ajv({
      removeAdditional: false,
      useDefaults: true,
      coerceTypes: true,
      allErrors: true,
      nullable: true,
      formats: {
        invalidResponseCode(raw: number): boolean {
          return raw < 100 && raw > 599
        },
        invalidResponse(raw: number): boolean {
          return raw < 100 && raw > 599
        },
        noMessage(): boolean {
          return false
        }
      }
    })

    const schema = {
      type: 'object',
      properties: {
        type: {
          type: 'boolean'
        },
        nonEmptyObject: {
          type: 'object',
          minProperties: 1
        },
        emptyObject: {
          type: 'object',
          maxProperties: 0
        },
        minProperties: {
          type: 'object',
          minProperties: 2
        },
        maxProperties: {
          type: 'object',
          maxProperties: 2
        },
        nonEmptyArray: {
          type: 'array',
          minItems: 1
        },
        emptyArray: {
          type: 'array',
          maxItems: 0
        },
        minItems: {
          type: 'array',
          minItems: 2
        },
        maxItems: {
          type: 'array',
          maxItems: 2
        },
        minimum: {
          type: 'number',
          minimum: 5
        },
        maximum: {
          type: 'number',
          maximum: 5
        },
        number: {
          type: 'number'
        },
        enum: {
          type: 'string',
          enum: ['a', 'b', 'c']
        },
        presentString: {
          type: 'string',
          pattern: '.+'
        },
        pattern: {
          type: 'string',
          pattern: '\\d+{a}abc'
        },
        ipv4: {
          type: 'string',
          format: 'ipv4'
        },
        ipv6: {
          type: 'string',
          format: 'ipv6'
        },
        date: {
          type: 'string',
          format: 'date'
        },
        time: {
          type: 'string',
          format: 'time'
        },
        dateTime: {
          type: 'string',
          format: 'date-time'
        },
        response: {
          type: 'string',
          format: 'invalidResponse'
        },
        responseCode: {
          type: 'string',
          format: 'invalidResponseCode'
        },
        noMessage: {
          type: 'string',
          format: 'noMessage'
        },
        arrayPath: {
          type: 'array',
          items: {
            type: 'number'
          }
        },
        objectPath: {
          type: 'object',
          properties: {
            'x-abc': {
              type: 'number'
            },
            cde: {
              type: 'number'
            }
          }
        },
        'needs-quotes': {
          type: 'number'
        }
      },
      additionalProperties: false,
      required: ['required']
    }

    const data = {
      unknown: 'unknown',
      type: 'whatever',
      nonEmptyObject: {},
      emptyObject: { a: 1 },
      minProperties: { a: 1 },
      maxProperties: { a: 1, b: 2, c: 3 },
      nonEmptyArray: [],
      emptyArray: [1],
      minItems: [1],
      maxItems: [1, 2, 3],
      minimum: 1,
      maximum: 10,
      number: 'string',
      enum: 'invalid',
      presentString: '',
      pattern: '123',
      ipv4: 'abc',
      ipv6: 'cde',
      date: 'whatever',
      time: 'whatever',
      dateTime: 'whatever',
      response: 1,
      responseCode: 2,
      noMessage: true,
      arrayPath: ['abc'],
      objectPath: {
        'x-abc': 'abc',
        cde: 'cde'
      },
      'needs-quotes': 'nq'
    }

    const expected = {
      body: {
        required: 'must be present',
        unknown: 'is not a valid property',
        type: 'must be a valid boolean (true or false)',
        nonEmptyObject: 'cannot be a empty object',
        emptyObject: 'must be a empty object',
        minProperties: 'must be a object with at least 2 properties',
        maxProperties: 'must be a object with at most 2 properties',
        nonEmptyArray: 'cannot be a empty array',
        emptyArray: 'must be a empty array',
        minItems: 'must be an array with at least 2 items',
        maxItems: 'must be an array with at most 2 items',
        'arrayPath.0': 'must be a valid number',
        "objectPath.'x-abc'": 'must be a valid number',
        'objectPath.cde': 'must be a valid number',
        minimum: 'must be a number greater than or equal to 5',
        maximum: 'must be a number less than or equal to 5',
        number: 'must be a valid number',
        enum: 'must be one of the following values: "a", "b" or "c"',
        presentString: 'must be a non empty string',
        pattern: 'must match pattern "\\d+{a}abc"',
        ipv4: 'must be a valid IPv4',
        ipv6: 'must be a valid IPv6',
        date: 'must be a valid ISO 8601 / RFC 3339 date (example: 2018-07-06)',
        time: 'must be a valid ISO 8601 / RFC 3339 time (example: 12:34:56)',
        dateTime: 'must be a valid ISO 8601 / RFC 3339 timestamp (example: 2018-07-06T12:34:56Z)',
        response:
          'The response returned from the endpoint violates its specification for the HTTP status invalidResponse.',
        responseCode: 'This endpoint cannot respond with HTTP status invalidResponseCode.',
        noMessage: 'must match format "noMessage" (format)',
        'needs-quotes': 'must be a valid number'
      }
    }

    const validate = ajv.compile(schema)

    expect(validate(data)).toBeFalsy()
    expect(convertValidationErrors('body', data, validate.errors as Array<ValidationResult>)).toEqual(expected)
  })

  it('niceJoin utility method', function(): void {
    expect(niceJoin([])).toEqual('')
    expect(niceJoin(['a'])).toEqual('a')
    expect(niceJoin(['b', 'c'], '@')).toEqual('b@c')
    expect(niceJoin(['b', 'c', 'd'])).toEqual('b, c and d')
  })
})
