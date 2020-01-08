import Ajv from 'ajv'
import fastify, { FastifyInstance, FastifyReply, FastifyRequest, RegisterOptions, ValidationResult } from 'fastify'
import { IncomingMessage, Server, ServerResponse } from 'http'
import { ACCEPTED, INTERNAL_SERVER_ERROR, OK } from 'http-status-codes'
import 'jest-additional-expectations'
import { convertValidationErrors, niceJoin, plugin as fastifyErrorProperties } from '../src'

let server: FastifyInstance | null

async function buildServer(
  options: RegisterOptions<Server, IncomingMessage, ServerResponse> = {}
): Promise<FastifyInstance> {
  if (server) {
    await server.close()
    server = null
  }

  server = fastify()

  server.register(fastifyErrorProperties, options)

  server.get('/correct', {
    schema: {
      response: {
        [OK]: {
          type: 'object',
          properties: {
            a: {
              type: 'string'
            }
          }
        }
      }
    },
    async handler(): Promise<object> {
      return { a: '1' }
    }
  })

  server.get('/bad-code', {
    schema: {
      response: {
        [OK]: {
          type: 'object',
          properties: {
            a: {
              type: 'string'
            }
          }
        }
      }
    },
    async handler(_r: FastifyRequest, reply: FastifyReply<ServerResponse>): Promise<object> {
      reply.code(ACCEPTED)
      return { a: 1 }
    }
  })

  server.get('/bad-body', {
    schema: {
      response: {
        [OK]: {
          type: 'object',
          properties: {
            a: {
              type: 'string'
            },
            b: {
              type: 'string'
            }
          },
          required: ['b'],
          additionalProperties: false
        }
      }
    },
    async handler(): Promise<object> {
      return { a: 1, c: 2 }
    }
  })

  server.get('/no-json', {
    schema: {
      response: {
        [OK]: {
          type: 'object',
          properties: {
            a: {
              type: 'string'
            },
            b: {
              type: 'string'
            }
          },
          required: ['b'],
          additionalProperties: false
        }
      }
    },
    async handler(_r: FastifyRequest, reply: FastifyReply<ServerResponse>): Promise<string> {
      reply.code(ACCEPTED)
      return 'OK'
    }
  })

  server.get('/no-schema', {
    async handler(): Promise<object> {
      return { a: 1, c: 2 }
    }
  })

  await server.listen(0)

  return server
}

describe('Validation', function(): void {
  it('niceJoin utility method', function(): void {
    expect(niceJoin([])).toEqual('')
    expect(niceJoin(['a'])).toEqual('a')
    expect(niceJoin(['b', 'c'], '@')).toEqual('b@c')
    expect(niceJoin(['b', 'c', 'd'])).toEqual('b, c and d')
  })

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
        integer: {
          type: 'integer'
        },
        object: {
          type: 'object'
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
        uuid: {
          type: 'string',
          format: 'uuid'
        },
        hostname: {
          type: 'string',
          format: 'hostname'
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
        },
        uniqueItems: {
          type: 'array',
          uniqueItems: true
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
      integer: 'string',
      object: 'string',
      number: 'string',
      enum: 'invalid',
      presentString: '',
      pattern: '123',
      uuid: 'whatever',
      hostname: '...',
      ipv4: 'abc',
      ipv6: 'cde',
      date: 'whatever',
      time: 'whatever',
      dateTime: 'whatever',
      noMessage: true,
      arrayPath: ['abc'],
      objectPath: {
        'x-abc': 'abc',
        cde: 'cde'
      },
      'needs-quotes': 'nq',
      uniqueItems: [1, 1]
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
        integer: 'must be a valid integer number',
        object: 'must be a object',
        number: 'must be a valid number',
        enum: 'must be one of the following values: "a", "b" or "c"',
        presentString: 'must be a non empty string',
        pattern: 'must match pattern "\\d+{a}abc"',
        uuid: 'must be a valid GUID (UUID v4)',
        hostname: 'must be a valid hostname',
        ipv4: 'must be a valid IPv4',
        ipv6: 'must be a valid IPv6',
        date: 'must be a valid ISO 8601 / RFC 3339 date (example: 2018-07-06)',
        time: 'must be a valid ISO 8601 / RFC 3339 time (example: 12:34:56)',
        dateTime: 'must be a valid ISO 8601 / RFC 3339 timestamp (example: 2018-07-06T12:34:56Z)',
        noMessage: 'must match format "noMessage" (format)',
        'needs-quotes': 'must be a valid number',
        uniqueItems: 'must NOT have duplicate items (items ## 0 and 1 are identical) (uniqueItems)'
      }
    }

    const validate = ajv.compile(schema)

    expect(validate(data)).toBeFalsy()
    expect(convertValidationErrors('body', data, validate.errors as Array<ValidationResult>)).toEqual(expected)
  })
})

describe('Response Validation', function(): void {
  beforeEach(buildServer)
  afterEach(() => server!.close())

  it('should allow valid endpoints', async function(): Promise<void> {
    const response = await server!.inject({ method: 'GET', url: '/correct' })

    expect(response).toHaveHTTPStatus(OK)
    expect(JSON.parse(response.payload)).toEqual({ a: '1' })
  })

  it('should validate the response code', async function(): Promise<void> {
    const response = await server!.inject({ method: 'GET', url: '/bad-code' })

    expect(response).toHaveHTTPStatus(INTERNAL_SERVER_ERROR)
    expect(JSON.parse(response.payload)).toEqual({
      error: 'Internal Server Error',
      message: 'This endpoint cannot respond with HTTP status 202.',
      statusCode: INTERNAL_SERVER_ERROR
    })
  })

  it('should validate the response body', async function(): Promise<void> {
    const response = await server!.inject({ method: 'GET', url: '/bad-body' })

    expect(response).toHaveHTTPStatus(INTERNAL_SERVER_ERROR)
    expect(JSON.parse(response.payload)).toEqual({
      error: 'Internal Server Error',
      message: 'The response returned from the endpoint violates its specification for the HTTP status 200.',
      statusCode: INTERNAL_SERVER_ERROR,
      failedValidations: {
        response: {
          a: 'must be a string',
          b: 'must be present',
          c: 'is not a valid property'
        }
      }
    })
  })

  it('should allow everything no response schema is defined', async function(): Promise<void> {
    const response = await server!.inject({ method: 'GET', url: '/no-schema' })

    expect(response).toHaveHTTPStatus(OK)
    expect(JSON.parse(response.payload)).toEqual({ a: 1, c: 2 })
  })

  it('should allow everything if the payload is not JSON', async function(): Promise<void> {
    const response = await server!.inject({ method: 'GET', url: '/no-json' })

    expect(response).toHaveHTTPStatus(ACCEPTED)
    expect(response).toBeText()
    expect(response.payload).toEqual('OK')
  })

  it('should allow everything if explicitily disabled', async function(): Promise<void> {
    await buildServer({ convertResponsesValidationErrors: false })
    const response = await server!.inject({ method: 'GET', url: '/bad-code' })

    expect(response).toHaveHTTPStatus(ACCEPTED)
    expect(JSON.parse(response.payload)).toEqual({ a: 1 })
  })

  it('should allow everything if explicitily enabled', async function(): Promise<void> {
    await buildServer({ convertResponsesValidationErrors: true })

    const response = await server!.inject({ method: 'GET', url: '/bad-code' })

    expect(response).toHaveHTTPStatus(INTERNAL_SERVER_ERROR)
    expect(JSON.parse(response.payload)).toEqual({
      error: 'Internal Server Error',
      message: 'This endpoint cannot respond with HTTP status 202.',
      statusCode: INTERNAL_SERVER_ERROR
    })
  })
})
