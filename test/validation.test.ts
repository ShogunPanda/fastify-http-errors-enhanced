import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import fastify, {
  type FastifyInstance,
  type FastifyPluginOptions,
  type FastifyReply,
  type FastifyRequest
} from 'fastify'
import { ACCEPTED, INTERNAL_SERVER_ERROR, OK } from 'http-errors-enhanced'
import { deepStrictEqual, match, ok } from 'node:assert'
import { test } from 'node:test'
import { convertValidationErrors, plugin as fastifyErrorProperties, niceJoin } from '../src/index.ts'
import { type ValidationResult } from '../src/validation.ts'

async function buildServer(options: FastifyPluginOptions = {}): Promise<FastifyInstance> {
  const server = fastify({
    ajv: {
      plugins: [addFormats],
      customOptions: {
        formats: {
          sequence(data: string): boolean {
            return data === '123'
          }
        }
      }
    }
  })

  await server.register(fastifyErrorProperties, options)

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
    handler(_: FastifyRequest, reply: FastifyReply) {
      reply.send({ a: '1' })
    }
  })

  server.get('/formats', {
    schema: {
      response: {
        [OK]: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email'
            },
            sequence: {
              type: 'string',
              format: 'sequence'
            }
          }
        }
      }
    },
    handler(_: FastifyRequest, reply: FastifyReply) {
      reply.send({ email: 'test@example.com', sequence: '123' })
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
    handler(_: FastifyRequest, reply: FastifyReply) {
      reply.code(ACCEPTED)
      reply.send({ a: 1 })
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
    handler(_: FastifyRequest, reply: FastifyReply) {
      reply.send({ a: 1, c: 2 })
    }
  })

  server.get('/undeclared-response', {
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
    handler(_: FastifyRequest, reply: FastifyReply) {
      reply.code(ACCEPTED)
      reply.send({ a: 1 })
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
    handler(_: FastifyRequest, reply: FastifyReply) {
      reply.code(ACCEPTED)
      reply.send('ACCEPTED')
    }
  })

  server.get('/no-schema', {
    handler(_: FastifyRequest, reply: FastifyReply) {
      reply.send({ a: 1, c: 2 })
    }
  })

  return server
}

test('Validation', async () => {
  await test('niceJoin utility method', t => {
    deepStrictEqual(niceJoin([]), '')
    deepStrictEqual(niceJoin(['a']), 'a')
    deepStrictEqual(niceJoin(['b', 'c'], '@'), 'b@c')
    deepStrictEqual(niceJoin(['b', 'c', 'd']), 'b, c and d')
  })

  await test('should correctly parse validation errors', t => {
    const ajv = new Ajv({
      removeAdditional: false,
      useDefaults: true,
      coerceTypes: true,
      allErrors: true,
      formats: {
        invalidResponseCode: {
          validate(raw: number): boolean {
            return raw < 100 && raw > 599
          }
        },
        invalidResponse: {
          validate(raw: number): boolean {
            return raw < 100 && raw > 599
          }
        },
        noMessage: {
          validate(): boolean {
            return false
          }
        }
      }
    })

    addFormats(ajv)

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
          pattern: '\\d+\\{a\\}abc'
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
        uri: {
          type: 'string',
          format: 'uri'
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
      uri: 'whatever',
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
        'arrayPath/0': 'must be a valid number',
        'objectPath/x-abc': 'must be a valid number',
        'objectPath/cde': 'must be a valid number',
        minimum: 'must be a number greater than or equal to 5',
        maximum: 'must be a number less than or equal to 5',
        integer: 'must be a valid integer number',
        object: 'must be a object',
        number: 'must be a valid number',
        enum: 'must be one of the following values: "a", "b" or "c"',
        presentString: 'must be a non empty string',
        pattern: 'must match pattern "\\d+\\{a\\}abc"',
        uuid: 'must be a valid GUID (UUID v4)',
        hostname: 'must be a valid hostname',
        ipv4: 'must be a valid IPv4',
        ipv6: 'must be a valid IPv6',
        date: 'must be a valid ISO 8601 / RFC 3339 date (example: 2018-07-06)',
        time: 'must be a valid ISO 8601 / RFC 3339 time (example: 12:34:56)',
        dateTime: 'must be a valid ISO 8601 / RFC 3339 timestamp (example: 2018-07-06T12:34:56Z)',
        uri: 'must be a valid URI',
        noMessage: 'must match format "noMessage" (format)',
        'needs-quotes': 'must be a valid number',
        uniqueItems: 'must NOT have duplicate items (items ## 0 and 1 are identical) (uniqueItems)'
      }
    }

    const validate = ajv.compile(schema)

    ok(!validate(data))
    deepStrictEqual(convertValidationErrors('body', data, validate.errors as ValidationResult[]), expected)
  })
})

test('Response Validation', async () => {
  await test('should allow valid endpoints', async t => {
    const server = await buildServer()

    const response = await server.inject({ method: 'GET', url: '/correct' })

    deepStrictEqual(response.statusCode, OK)
    deepStrictEqual(JSON.parse(response.payload), { a: '1' })
  })

  await test('should allow custom formats', async t => {
    const server = await buildServer()

    const response = await server.inject({ method: 'GET', url: '/formats' })

    deepStrictEqual(response.statusCode, OK)
    deepStrictEqual(JSON.parse(response.payload), { email: 'test@example.com', sequence: '123' })
  })

  await test('should validate the response code', async t => {
    const server = await buildServer()

    const response = await server.inject({ method: 'GET', url: '/bad-code' })

    deepStrictEqual(response.statusCode, INTERNAL_SERVER_ERROR)
    deepStrictEqual(JSON.parse(response.payload), {
      error: 'Internal Server Error',
      message: 'This endpoint cannot respond with HTTP status 202.',
      statusCode: INTERNAL_SERVER_ERROR
    })
  })

  await test('should validate the response body', async t => {
    const server = await buildServer()

    const response = await server.inject({ method: 'GET', url: '/bad-body' })

    deepStrictEqual(response.statusCode, INTERNAL_SERVER_ERROR)
    deepStrictEqual(JSON.parse(response.payload), {
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

  await test('should support shared schema', async t => {
    const sharedServer = fastify()

    await sharedServer.register(fastifyErrorProperties, { convertResponsesValidationErrors: true })

    sharedServer.addSchema({
      $id: 'ok',
      type: 'object',
      properties: {
        a: {
          type: 'string'
        }
      }
    })

    sharedServer.get('/bad-code', {
      schema: {
        response: {
          [OK]: { $ref: 'ok#' }
        }
      },
      handler(_r: FastifyRequest, reply: FastifyReply) {
        reply.code(ACCEPTED)
        reply.send({ a: 1 })
      }
    })

    const response = await sharedServer.inject({ method: 'GET', url: '/bad-code' })

    deepStrictEqual(response.statusCode, INTERNAL_SERVER_ERROR)
    deepStrictEqual(JSON.parse(response.payload), {
      error: 'Internal Server Error',
      message: 'This endpoint cannot respond with HTTP status 202.',
      statusCode: INTERNAL_SERVER_ERROR
    })
  })

  await test('should allow everything no response schema is defined', async t => {
    const server = await buildServer()

    const response = await server.inject({ method: 'GET', url: '/no-schema' })

    deepStrictEqual(response.statusCode, OK)
    deepStrictEqual(JSON.parse(response.payload), { a: 1, c: 2 })
  })

  await test('should allow responses which are missing in the schema if explicitily enabled', async t => {
    const server = await buildServer({ allowUndeclaredResponses: true })

    const response = await server.inject({ method: 'GET', url: '/undeclared-response' })

    deepStrictEqual(response.statusCode, ACCEPTED)
    deepStrictEqual(JSON.parse(response.payload), { a: 1 })
  })

  await test('should allow everything if the payload is not JSON', async t => {
    const server = await buildServer()

    const response = await server.inject({ method: 'GET', url: '/no-json' })

    deepStrictEqual(response.statusCode, ACCEPTED)
    match(response.headers['content-type'] as string, /^text\/plain/)
    deepStrictEqual(response.payload, 'ACCEPTED')
  })

  await test('should allow everything if explicitily disabled', async t => {
    const server = await buildServer({ convertResponsesValidationErrors: false })

    const response = await server.inject({ method: 'GET', url: '/bad-code' })

    deepStrictEqual(response.statusCode, ACCEPTED)
    deepStrictEqual(JSON.parse(response.payload), { a: 1 })
  })

  await test('should allow everything if explicitily enabled', async t => {
    const server = await buildServer({ convertResponsesValidationErrors: true })

    const response = await server.inject({ method: 'GET', url: '/bad-code' })

    deepStrictEqual(response.statusCode, INTERNAL_SERVER_ERROR)
    deepStrictEqual(JSON.parse(response.payload), {
      error: 'Internal Server Error',
      message: 'This endpoint cannot respond with HTTP status 202.',
      statusCode: INTERNAL_SERVER_ERROR
    })
  })

  await test('should support the customization of the response validator', async t => {
    const server = fastify()

    let compiler: Ajv | undefined

    await server.register(fastifyErrorProperties, {
      convertResponsesValidationErrors: true,
      responseValidatorCustomizer(actual: Ajv) {
        compiler = actual
      }
    })

    server.get('/bad-code', {
      schema: {
        response: {
          [OK]: {
            $id: '#ok',
            type: 'object',
            properties: {
              a: {
                type: 'string'
              }
            }
          }
        }
      },
      handler(_r: FastifyRequest, reply: FastifyReply) {
        reply.code(ACCEPTED)
        reply.send({ a: 1 })
      }
    })

    await server.inject({ method: 'GET', url: '/bad-code' })

    ok(compiler instanceof Ajv)
  })
})
