/* eslint-disable @typescript-eslint/no-floating-promises */

import fastify, { FastifyInstance, FastifyPluginOptions } from 'fastify'
import {
  BadGatewayError,
  BAD_GATEWAY,
  BAD_REQUEST,
  createError,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  UNSUPPORTED_MEDIA_TYPE
} from 'http-errors-enhanced'
import t from 'tap'
import { handleErrors, plugin as fastifyErrorProperties } from '../src'

type Test = typeof t
type Callback = () => void

let server: FastifyInstance | null
let standaloneServer: FastifyInstance | null

function routes(instance: FastifyInstance, _options: unknown, done: Callback): void {
  instance.get('/bad-gateway', {
    async handler(): Promise<void> {
      throw new BadGatewayError('This was the error message.')
    }
  })

  instance.get('/headers', {
    async handler(): Promise<void> {
      const error = createError(NOT_FOUND, 'This was the error message.', {
        headers: { 'X-Custom-Header': 'Custom-Value' }
      })

      throw error
    }
  })

  instance.get('/properties', {
    async handler(): Promise<void> {
      const error = createError(BAD_GATEWAY, 'This was the error message.', { id: 1 })

      throw error
    }
  })

  instance.get('/error', {
    async handler(): Promise<void> {
      const error = new Error('This was a generic message.')
      Object.assign(error, { id: 1, headers: { 'X-Custom-Header': 'Custom-Value' } })

      throw error
    }
  })

  instance.get('/weird-code', {
    async handler(): Promise<void> {
      const error = new BadGatewayError('This was the error message.')
      error.statusCode = 10

      throw error
    }
  })

  instance.get('/weird-error', {
    async handler(): Promise<void> {
      const error = new Error('This was the error message.')
      delete error.stack

      throw error
    }
  })

  instance.get('/duck-error', {
    async handler(): Promise<void> {
      const error = {
        statusCode: INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'This was a generic duck message.',
        stack: ''
      }

      Object.defineProperty(error, 'stack', { enumerable: false })

      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw error
    }
  })

  instance.post('/validated/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: {
            type: 'number'
          }
        },
        additionalProperties: false
      },
      querystring: {
        type: 'object',
        properties: {
          val: {
            type: 'string',
            pattern: 'ab{2}c'
          }
        },
        additionalProperties: false
      },
      headers: {
        type: 'object',
        properties: {
          'x-header': {
            type: 'string',
            pattern: '\\d+'
          }
        },
        additionalProperties: true,
        required: ['x-header']
      },
      body: {
        type: 'array',
        items: {
          type: 'number',
          minimum: 12
        }
      }
    },
    async handler(): Promise<string> {
      return 'OK'
    }
  })

  done()
}

async function buildServer(options: FastifyPluginOptions = {}): Promise<FastifyInstance> {
  if (server) {
    await server.close()
    server = null
  }

  server = fastify({
    ajv: {
      customOptions: {
        removeAdditional: false,
        useDefaults: true,
        coerceTypes: true,
        allErrors: true,
        nullable: true
      }
    }
  })

  server.register(fastifyErrorProperties, options)
  server.register(routes)
  await server.listen(0)

  return server
}

async function buildStandaloneServer(): Promise<FastifyInstance> {
  if (standaloneServer) {
    await standaloneServer.close()
    standaloneServer = null
  }

  standaloneServer = fastify()

  standaloneServer.setErrorHandler(handleErrors)

  standaloneServer.get('/error/code', {
    async handler(): Promise<void> {
      const error = new Error('This was a generic message.')
      Object.assign(error, { code: 'CODE' })

      throw error
    }
  })

  standaloneServer.get('/error/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: {
            type: 'number'
          }
        }
      }
    },
    async handler(): Promise<void> {
      throw new Error('This was a generic message.')
    }
  })

  await standaloneServer.listen(0)

  return standaloneServer
}

t.test('Plugin', (t: Test) => {
  t.test('Handling http-errors', (t: Test) => {
    t.afterEach(async () => {
      await server!.close()
    })

    t.test('should correctly return client errors', async (t: Test) => {
      await buildServer()

      const response = await server!.inject({ method: 'GET', url: '/not-found' })

      t.equal(response.statusCode, NOT_FOUND)
      t.match(response.headers['content-type'], /^application\/json/)
      t.deepEqual(JSON.parse(response.payload), {
        error: 'Not Found',
        message: 'Not found.',
        statusCode: NOT_FOUND
      })
    })

    t.test('should correctly return server errors', async (t: Test) => {
      await buildServer()

      const response = await server!.inject({ method: 'GET', url: '/bad-gateway' })

      t.equal(response.statusCode, BAD_GATEWAY)
      t.deepEqual(JSON.parse(response.payload), {
        error: 'Bad Gateway',
        message: 'This was the error message.',
        statusCode: BAD_GATEWAY
      })
    })

    t.test('should correctly return server duck-typed errors', async (t: Test) => {
      await buildServer()

      const response = await server!.inject({ method: 'GET', url: '/duck-error' })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)
      t.deepEqual(JSON.parse(response.payload), {
        error: 'Internal Server Error',
        message: 'This was a generic duck message.',
        statusCode: INTERNAL_SERVER_ERROR
      })
    })

    t.test('should correctly return additional headers', async (t: Test) => {
      await buildServer()

      const response = await server!.inject({ method: 'GET', url: '/headers' })

      t.equal(response.statusCode, NOT_FOUND)
      t.equal(response.headers['x-custom-header'], 'Custom-Value')
      t.deepEqual(JSON.parse(response.payload), {
        error: 'Not Found',
        message: 'This was the error message.',
        statusCode: NOT_FOUND
      })
    })

    t.test('should correctly return additional properties', async (t: Test) => {
      await buildServer()

      const response = await server!.inject({ method: 'GET', url: '/properties' })

      t.equal(response.statusCode, BAD_GATEWAY)
      t.deepEqual(JSON.parse(response.payload), {
        error: 'Bad Gateway',
        message: 'This was the error message.',
        statusCode: BAD_GATEWAY,
        id: 1
      })
    })

    t.test('should default status code to 500 if outside HTTP range', async (t: Test) => {
      await buildServer()

      const response = await server!.inject({ method: 'GET', url: '/weird-code' })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)
      t.deepEqual(JSON.parse(response.payload), {
        error: 'Internal Server Error',
        message: 'This was the error message.',
        statusCode: INTERNAL_SERVER_ERROR
      })
    })

    t.test('should have good defaults if the error is weirdly manipulated', async (t: Test) => {
      await buildServer({ hideUnhandledErrors: false })

      const response = await server!.inject({ method: 'GET', url: '/weird-error' })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)
      t.deepEqual(JSON.parse(response.payload), {
        error: 'Internal Server Error',
        message: '[Error] This was the error message.',
        statusCode: INTERNAL_SERVER_ERROR,
        stack: []
      })
    })

    t.end()
  })

  t.test('Handling generic errors', (t: Test) => {
    t.afterEach(async () => {
      await server!.close()
    })

    t.test(
      'should correctly return generic errors by wrapping them in a 500 http-error, including headers and properties',
      async (t: Test) => {
        await buildServer()

        const response = await server!.inject({ method: 'GET', url: '/error' })

        t.equal(response.statusCode, INTERNAL_SERVER_ERROR)
        t.equal(response.headers['x-custom-header'], 'Custom-Value')

        const payload = JSON.parse(response.payload)
        t.match(payload.stack[0], /Object\.handler \(\$ROOT\/test\/index\.test\.ts:\d+:\d+\)/)
        delete payload.stack

        t.deepEqual(payload, {
          error: 'Internal Server Error',
          message: '[Error] This was a generic message.',
          statusCode: INTERNAL_SERVER_ERROR,
          id: 1
        })
      }
    )

    t.test('should correctly parse invalid content type errors', async (t: Test) => {
      await buildServer()

      const response = await server!.inject({
        method: 'POST',
        url: '/bad-gateway',
        headers: { 'content-type': 'image/png' }
      })

      t.equal(response.statusCode, UNSUPPORTED_MEDIA_TYPE)
      t.deepEqual(JSON.parse(response.payload), {
        error: 'Unsupported Media Type',
        message:
          'Only JSON payloads are accepted. Please set the "Content-Type" header to start with "application/json"',
        statusCode: UNSUPPORTED_MEDIA_TYPE
      })
    })

    t.test('should correctly parse missing body errors', async (t: Test) => {
      await buildServer()

      const response = await server!.inject({
        method: 'POST',
        url: '/bad-gateway',
        headers: { 'content-type': 'application/json' }
      })

      t.equal(response.statusCode, BAD_REQUEST)
      t.deepEqual(JSON.parse(response.payload), {
        error: 'Bad Request',
        message: 'The JSON body payload cannot be empty if the "Content-Type" header is set',
        statusCode: BAD_REQUEST
      })
    })

    t.test('should correctly parse malformed body errors', async (t: Test) => {
      await buildServer()

      const response = await server!.inject({
        method: 'POST',
        url: '/bad-gateway',
        headers: { 'content-type': 'application/json' },
        payload: '{a'
      })

      t.equal(response.statusCode, BAD_REQUEST)
      t.deepEqual(JSON.parse(response.payload), {
        error: 'Bad Request',
        message: 'The body payload is not a valid JSON',
        statusCode: BAD_REQUEST
      })
    })

    t.test('should correctly return server errors with masking explicitily enabled', async (t: Test) => {
      await buildServer()

      await buildServer({ hideUnhandledErrors: true })

      const response = await server!.inject({ method: 'GET', url: '/error' })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)
      t.deepEqual(JSON.parse(response.payload), {
        error: 'Internal Server Error',
        message: 'An error occurred trying to process your request.',
        statusCode: INTERNAL_SERVER_ERROR
      })
    })

    t.test('should correctly return server errors with masking explicitily disabled', async (t: Test) => {
      await buildServer()

      const response = await server!.inject({ method: 'GET', url: '/error' })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)
      t.equal(response.headers['x-custom-header'], 'Custom-Value')

      const payload = JSON.parse(response.payload)
      t.match(payload.stack[0], /Object\.handler \(\$ROOT\/test\/index\.test\.ts:\d+:\d+\)/)
      delete payload.stack

      t.deepEqual(payload, {
        error: 'Internal Server Error',
        message: '[Error] This was a generic message.',
        statusCode: INTERNAL_SERVER_ERROR,
        id: 1
      })
    })

    t.end()
  })

  t.test('Handling validation errors', (t: Test) => {
    t.afterEach(async () => {
      await server!.close()
    })

    t.test('should validate params', async (t: Test) => {
      await buildServer()

      const response = await server!.inject({
        method: 'POST',
        url: '/validated/abc',
        headers: { 'x-header': '123' },
        payload: []
      })

      t.equal(response.statusCode, BAD_REQUEST)
      t.deepEqual(JSON.parse(response.payload), {
        statusCode: BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { params: { id: 'must be a valid number' } }
      })
    })

    t.test('should validate querystring', async (t: Test) => {
      await buildServer()

      const response = await server!.inject({
        method: 'POST',
        url: '/validated/123',
        query: { val: '13', val2: 'asd' },
        payload: []
      })

      t.equal(response.statusCode, BAD_REQUEST)
      t.deepEqual(JSON.parse(response.payload), {
        statusCode: BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { query: { val: 'must match pattern "ab{2}c"', val2: 'is not a valid property' } }
      })
    })

    t.test('should validate headers', async (t: Test) => {
      await buildServer()

      const response = await server!.inject({ method: 'POST', url: '/validated/123', payload: [] })

      t.equal(response.statusCode, BAD_REQUEST)
      t.deepEqual(JSON.parse(response.payload), {
        statusCode: BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { headers: { 'x-header': 'must be present' } }
      })
    })

    t.test('should validate body', async (t: Test) => {
      await buildServer()

      const response = await server!.inject({ method: 'POST', url: '/validated/123' })

      t.equal(response.statusCode, BAD_REQUEST)
      t.deepEqual(JSON.parse(response.payload), {
        statusCode: BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { body: { $root: 'must be an array' } }
      })
    })

    t.test('should not convert validation if option is disabled', async (t: Test) => {
      await buildServer({ convertValidationErrors: false })

      const response = await server!.inject({
        method: 'POST',
        url: '/validated/abc',
        headers: { 'x-header': '123' },
        payload: []
      })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)

      const payload = JSON.parse(response.payload)
      t.match(payload.stack[1], /wrapValidationError \(\$ROOT\/node_modules\/fastify\/.+:\d+:\d+\)/)
      delete payload.stack

      t.deepEqual(payload, {
        error: 'Internal Server Error',
        message: '[Error] params.id should be number',
        statusCode: INTERNAL_SERVER_ERROR,
        validation: [
          {
            dataPath: '.id',
            keyword: 'type',
            message: 'should be number',
            params: {
              type: 'number'
            },
            schemaPath: '#/properties/id/type'
          }
        ],
        validationContext: 'params'
      })
    })

    t.end()
  })

  t.test('Using standalone error handling', (t: Test) => {
    t.afterEach(async () => {
      await standaloneServer!.close()
    })

    t.test('should not return the errorProperties by never masking server side errors', async (t: Test) => {
      await buildStandaloneServer()

      const response = await standaloneServer!.inject({ method: 'GET', url: '/error/123' })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)

      const payload = JSON.parse(response.payload)
      t.match(payload.stack[0], /Object\.handler \(\$ROOT\/test\/index\.test\.ts:\d+:\d+\)/)
      delete payload.stack

      t.deepEqual(payload, {
        error: 'Internal Server Error',
        message: '[Error] This was a generic message.',
        statusCode: INTERNAL_SERVER_ERROR
      })
    })

    t.test('should return error codes', async (t: Test) => {
      await buildStandaloneServer()

      const response = await standaloneServer!.inject({ method: 'GET', url: '/error/code' })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)

      const payload = JSON.parse(response.payload)
      t.match(payload.stack[0], /Object\.handler \(\$ROOT\/test\/index\.test\.ts:\d+:\d+\)/)
      delete payload.stack

      t.deepEqual(payload, {
        error: 'Internal Server Error',
        message: '[CODE] This was a generic message.',
        statusCode: INTERNAL_SERVER_ERROR
      })
    })

    t.test('should not convert validation errors', async (t: Test) => {
      await buildStandaloneServer()

      const response = await standaloneServer!.inject({ method: 'GET', url: '/error/abc' })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)

      const payload = JSON.parse(response.payload)
      console.log(JSON.stringify(payload, null, 2))
      t.match(payload.stack[1], /wrapValidationError \(\$ROOT\/node_modules\/fastify\/.+:\d+:\d+\)/)
      delete payload.stack

      t.deepEqual(payload, {
        error: 'Internal Server Error',
        message: '[Error] params.id should be number',
        statusCode: INTERNAL_SERVER_ERROR,
        validation: [
          {
            dataPath: '.id',
            keyword: 'type',
            message: 'should be number',
            params: {
              type: 'number'
            },
            schemaPath: '#/properties/id/type'
          }
        ],
        validationContext: 'params'
      })
    })

    t.end()
  })

  t.end()
})
