import { deepStrictEqual, match } from 'node:assert'
import { test } from 'node:test'
import fastify, {
  type FastifyInstance,
  type FastifyPluginOptions,
  type FastifyReply,
  type FastifyRequest
} from 'fastify'
import {
  BAD_GATEWAY,
  BAD_REQUEST,
  BadGatewayError,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  UNPROCESSABLE_ENTITY,
  UNSUPPORTED_MEDIA_TYPE,
  createError
} from 'http-errors-enhanced'
import { plugin as fastifyHttpErrorsEnhanced, handleErrors } from '../src/index.ts'

type Callback = () => void

function routes(instance: FastifyInstance, _options: unknown, done: Callback): void {
  instance.get('/bad-gateway', {
    handler() {
      return Promise.reject(new BadGatewayError('This was the error message.'))
    }
  })

  instance.post('/bad-gateway', {
    handler() {
      return Promise.reject(new BadGatewayError('This was the error message.'))
    }
  })

  instance.get('/headers', {
    handler() {
      const error = createError(NOT_FOUND, 'This was the error message.', {
        headers: { 'X-Custom-Header': 'Custom-Value' }
      })

      return Promise.reject(error)
    }
  })

  instance.get('/properties', {
    handler() {
      const error = createError(BAD_GATEWAY, 'This was the error message.', { id: 1 })

      return Promise.reject(error)
    }
  })

  instance.get('/error', {
    handler() {
      const error = new Error('This was a generic message.')
      Object.assign(error, { id: 1, headers: { 'X-Custom-Header': 'Custom-Value' } })

      return Promise.reject(error)
    }
  })

  instance.get('/error-with-code', {
    handler() {
      const error = createError(BAD_GATEWAY, 'This was the error message.', { code: 'CODE' })

      return Promise.reject(error)
    }
  })

  instance.get('/weird-code', {
    handler() {
      const error = new BadGatewayError('This was the error message.')
      error.statusCode = 10

      return Promise.reject(error)
    }
  })

  instance.get('/weird-error', {
    handler() {
      const error = new Error('This was the error message.')
      delete error.stack

      return Promise.reject(error)
    }
  })

  instance.get('/duck-error', {
    handler() {
      const error = {
        statusCode: INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'This was a generic duck message.',
        stack: ''
      }

      Object.defineProperty(error, 'stack', { enumerable: false })
      return Promise.reject(error)
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
    handler() {
      return Promise.resolve('OK')
    }
  })

  done()
}

async function buildServer(options: FastifyPluginOptions = {}): Promise<FastifyInstance> {
  const server = fastify({
    ajv: {
      customOptions: {
        removeAdditional: false,
        useDefaults: true,
        coerceTypes: true,
        allErrors: true
      }
    }
  })

  await server.register(fastifyHttpErrorsEnhanced, options)
  await server.register(routes)

  return server
}

function buildStandaloneServer(): FastifyInstance {
  const standaloneServer = fastify()

  standaloneServer.setErrorHandler(handleErrors)

  standaloneServer.get('/error/code', {
    handler() {
      const error = new Error('This was a generic message.')
      Object.assign(error, { code: 'CODE' })

      return Promise.reject(error)
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
    handler() {
      return Promise.reject(new Error('This was a generic message.'))
    }
  })

  return standaloneServer
}

test('Plugin', async () => {
  await test('Handling http-errors', async () => {
    await test('should correctly return client errors', async () => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/not-found' })

      deepStrictEqual(response.statusCode, NOT_FOUND)
      match(response.headers['content-type'] as string, /^application\/json/)
      deepStrictEqual(JSON.parse(response.payload), {
        error: 'Not Found',
        message: 'Not found.',
        statusCode: NOT_FOUND
      })
    })

    await test('should correctly return server errors', async () => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/bad-gateway' })

      deepStrictEqual(response.statusCode, BAD_GATEWAY)
      deepStrictEqual(JSON.parse(response.payload), {
        error: 'Bad Gateway',
        message: 'This was the error message.',
        statusCode: BAD_GATEWAY
      })
    })

    await test('should correctly return error codes when not starting with the prefix', async () => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/error-with-code' })

      deepStrictEqual(response.statusCode, BAD_GATEWAY)
      deepStrictEqual(JSON.parse(response.payload), {
        error: 'Bad Gateway',
        message: 'This was the error message.',
        statusCode: BAD_GATEWAY,
        code: 'CODE'
      })
    })

    await test('should correctly return server duck-typed errors', async () => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/duck-error' })

      deepStrictEqual(response.statusCode, INTERNAL_SERVER_ERROR)
      deepStrictEqual(JSON.parse(response.payload), {
        error: 'Internal Server Error',
        message: 'This was a generic duck message.',
        statusCode: INTERNAL_SERVER_ERROR
      })
    })

    await test('should correctly return additional headers', async () => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/headers' })

      deepStrictEqual(response.statusCode, NOT_FOUND)
      deepStrictEqual(response.headers['x-custom-header'], 'Custom-Value')
      deepStrictEqual(JSON.parse(response.payload), {
        error: 'Not Found',
        message: 'This was the error message.',
        statusCode: NOT_FOUND
      })
    })

    await test('should correctly return additional properties', async () => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/properties' })

      deepStrictEqual(response.statusCode, BAD_GATEWAY)
      deepStrictEqual(JSON.parse(response.payload), {
        error: 'Bad Gateway',
        message: 'This was the error message.',
        statusCode: BAD_GATEWAY,
        id: 1
      })
    })

    await test('should default status code to 500 if outside HTTP range', async () => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/weird-code' })

      deepStrictEqual(response.statusCode, INTERNAL_SERVER_ERROR)
      deepStrictEqual(JSON.parse(response.payload), {
        error: 'Internal Server Error',
        message: 'This was the error message.',
        statusCode: INTERNAL_SERVER_ERROR
      })
    })

    await test('should have good defaults if the error is weirdly manipulated', async () => {
      const server = await buildServer({ hideUnhandledErrors: false })

      const response = await server.inject({ method: 'GET', url: '/weird-error' })

      deepStrictEqual(response.statusCode, INTERNAL_SERVER_ERROR)
      deepStrictEqual(JSON.parse(response.payload), {
        error: 'Internal Server Error',
        message: '[Error] This was the error message.',
        statusCode: INTERNAL_SERVER_ERROR,
        stack: []
      })
    })
  })

  await test('Handling generic errors', async () => {
    await test('should correctly return generic errors by wrapping them in a 500 http-error, including headers and properties', async () => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/error' })

      deepStrictEqual(response.statusCode, INTERNAL_SERVER_ERROR)
      deepStrictEqual(response.headers['x-custom-header'], 'Custom-Value')

      const payload = JSON.parse(response.payload)
      match(payload.stack[0] as string, /^Object\.handler \((?:file:\/\/)?\$ROOT\/test\/index\.test\.ts:\d+:\d+\)$/)
      delete payload.stack

      deepStrictEqual(payload, {
        error: 'Internal Server Error',
        message: '[Error] This was a generic message.',
        statusCode: INTERNAL_SERVER_ERROR,
        id: 1
      })
    })

    await test('should correctly install a not found error handler', async () => {
      const server = await buildServer()

      const response = await server.inject({
        method: 'POST',
        url: '/not-found',
        headers: { 'content-type': 'image/png' }
      })

      deepStrictEqual(response.statusCode, NOT_FOUND)
      deepStrictEqual(JSON.parse(response.payload), {
        statusCode: 404,
        error: 'Not Found',
        message: 'Not found.'
      })
    })

    await test('should correctly skip installing a not found error handler', async () => {
      const server = await buildServer({ handle404Errors: false })

      server.setNotFoundHandler((_: FastifyRequest, reply: FastifyReply) => {
        reply.code(444).send('NOT FOUND')
      })

      const response = await server.inject({
        method: 'POST',
        url: '/not-found',
        headers: { 'content-type': 'image/png' }
      })

      deepStrictEqual(response.statusCode, 444)
      deepStrictEqual(response.payload, 'NOT FOUND')
    })

    await test('should correctly parse invalid content type errors', async () => {
      const server = await buildServer()

      const response = await server.inject({
        method: 'POST',
        url: '/bad-gateway',
        headers: { 'content-type': 'image/png' }
      })

      deepStrictEqual(response.statusCode, UNSUPPORTED_MEDIA_TYPE)
      deepStrictEqual(JSON.parse(response.payload), {
        error: 'Unsupported Media Type',
        message:
          'Only JSON payloads are accepted. Please set the "Content-Type" header to start with "application/json"',
        statusCode: UNSUPPORTED_MEDIA_TYPE
      })
    })

    await test('should correctly parse missing body errors', async () => {
      const server = await buildServer()

      const response = await server.inject({
        method: 'POST',
        url: '/bad-gateway',
        headers: { 'content-type': 'application/json' }
      })

      deepStrictEqual(response.statusCode, BAD_REQUEST)
      deepStrictEqual(JSON.parse(response.payload), {
        error: 'Bad Request',
        message: 'The JSON body payload cannot be empty if the "Content-Type" header is set',
        statusCode: BAD_REQUEST
      })
    })

    await test('should correctly parse malformed body errors', async () => {
      const server = await buildServer()

      const response = await server.inject({
        method: 'POST',
        url: '/bad-gateway',
        headers: { 'content-type': 'application/json' },
        payload: '{a'
      })

      deepStrictEqual(response.statusCode, BAD_REQUEST)
      deepStrictEqual(JSON.parse(response.payload), {
        error: 'Bad Request',
        message: 'The body payload is not a valid JSON',
        statusCode: BAD_REQUEST
      })
    })

    await test('should correctly return server errors with masking explicitily enabled', async () => {
      const server = await buildServer({ hideUnhandledErrors: true })

      const response = await server.inject({ method: 'GET', url: '/error' })

      deepStrictEqual(response.statusCode, INTERNAL_SERVER_ERROR)
      deepStrictEqual(JSON.parse(response.payload), {
        error: 'Internal Server Error',
        message: 'An error occurred trying to process your request.',
        statusCode: INTERNAL_SERVER_ERROR
      })
    })

    await test('should correctly return server errors with masking explicitily disabled', async () => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/error' })

      deepStrictEqual(response.statusCode, INTERNAL_SERVER_ERROR)
      deepStrictEqual(response.headers['x-custom-header'], 'Custom-Value')

      const payload = JSON.parse(response.payload)
      match(payload.stack[0] as string, /^Object\.handler \((?:file:\/\/)?\$ROOT\/test\/index\.test\.ts:\d+:\d+\)$/)
      delete payload.stack

      deepStrictEqual(payload, {
        error: 'Internal Server Error',
        message: '[Error] This was a generic message.',
        statusCode: INTERNAL_SERVER_ERROR,
        id: 1
      })
    })
  })

  await test('Handling validation errors', async () => {
    await test('should validate params', async () => {
      const server = await buildServer()

      const response = await server.inject({
        method: 'POST',
        url: '/validated/abc',
        headers: { 'x-header': '123' },
        payload: []
      })

      deepStrictEqual(response.statusCode, BAD_REQUEST)
      deepStrictEqual(JSON.parse(response.payload), {
        statusCode: BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { params: { id: 'must be a valid number' } }
      })
    })

    await test('should use 422 if requested to', async () => {
      const server = await buildServer({ use422ForValidationErrors: true })

      const response = await server.inject({
        method: 'POST',
        url: '/validated/abc',
        headers: { 'x-header': '123' },
        payload: []
      })

      deepStrictEqual(response.statusCode, UNPROCESSABLE_ENTITY)
      deepStrictEqual(JSON.parse(response.payload), {
        statusCode: UNPROCESSABLE_ENTITY,
        error: 'Unprocessable Entity',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { params: { id: 'must be a valid number' } }
      })
    })

    await test('should validate querystring', async () => {
      const server = await buildServer()

      const response = await server.inject({
        method: 'POST',
        url: '/validated/123',
        query: { val: '13', val2: 'asd' },
        payload: []
      })

      deepStrictEqual(response.statusCode, BAD_REQUEST)
      deepStrictEqual(JSON.parse(response.payload), {
        statusCode: BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { query: { val: 'must match pattern "ab{2}c"', val2: 'is not a valid property' } }
      })
    })

    await test('should validate headers', async () => {
      const server = await buildServer()

      const response = await server.inject({ method: 'POST', url: '/validated/123', payload: [] })

      deepStrictEqual(response.statusCode, BAD_REQUEST)
      deepStrictEqual(JSON.parse(response.payload), {
        statusCode: BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { headers: { 'x-header': 'must be present' } }
      })
    })

    await test('should validate body', async () => {
      const server = await buildServer()

      const response = await server.inject({ method: 'POST', url: '/validated/123' })

      deepStrictEqual(response.statusCode, BAD_REQUEST)
      deepStrictEqual(JSON.parse(response.payload), {
        statusCode: BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { body: { $root: 'must be an array' } }
      })
    })

    await test('should not convert validation if option is disabled', async () => {
      const server = await buildServer({ convertValidationErrors: false })

      const response = await server.inject({
        method: 'POST',
        url: '/validated/abc',
        headers: { 'x-header': '123' },
        payload: []
      })

      deepStrictEqual(response.statusCode, INTERNAL_SERVER_ERROR)

      const payload = JSON.parse(response.payload)
      match(payload.stack[1] as string, /wrapValidationError \(\$ROOT\/node_modules.*\/fastify.*\/.+:\d+:\d+\)/)
      delete payload.stack

      deepStrictEqual(payload, {
        error: 'Internal Server Error',
        message: '[FST_ERR_VALIDATION] params/id must be number',
        code: 'FST_ERR_VALIDATION',
        statusCode: INTERNAL_SERVER_ERROR,
        validation: [
          {
            instancePath: '/id',
            keyword: 'type',
            message: 'must be number',
            params: {
              type: 'number'
            },
            schemaPath: '#/properties/id/type'
          }
        ],
        validationContext: 'params'
      })
    })
  })

  await test('Using standalone error handling', async () => {
    await test("should not return the error's properties by masking server side errors", async () => {
      const server = buildStandaloneServer()

      const response = await server.inject({ method: 'GET', url: '/error/123' })

      deepStrictEqual(response.statusCode, INTERNAL_SERVER_ERROR)

      const payload = JSON.parse(response.payload)
      match(payload.stack[0] as string, /^Object\.handler \((?:file:\/\/)?\$ROOT\/test\/index\.test\.ts:\d+:\d+\)$/)
      delete payload.stack

      deepStrictEqual(payload, {
        error: 'Internal Server Error',
        message: '[Error] This was a generic message.',
        statusCode: INTERNAL_SERVER_ERROR
      })
    })

    await test('should return error codes', async () => {
      const server = buildStandaloneServer()

      const response = await server.inject({ method: 'GET', url: '/error/code' })

      deepStrictEqual(response.statusCode, INTERNAL_SERVER_ERROR)

      const payload = JSON.parse(response.payload)
      match(payload.stack[0] as string, /^Object\.handler \((?:file:\/\/)?\$ROOT\/test\/index\.test\.ts:\d+:\d+\)$/)
      delete payload.stack

      deepStrictEqual(payload, {
        error: 'Internal Server Error',
        message: '[CODE] This was a generic message.',
        statusCode: INTERNAL_SERVER_ERROR,
        code: 'CODE'
      })
    })

    await test('should not convert validation errors', async () => {
      const server = buildStandaloneServer()

      const response = await server.inject({ method: 'GET', url: '/error/abc' })

      deepStrictEqual(response.statusCode, INTERNAL_SERVER_ERROR)

      const payload = JSON.parse(response.payload)
      match(payload.stack[1] as string, /wrapValidationError \(\$ROOT\/node_modules.*\/fastify.*\/.+:\d+:\d+\)/)
      delete payload.stack

      deepStrictEqual(payload, {
        error: 'Internal Server Error',
        message: '[FST_ERR_VALIDATION] params/id must be number',
        code: 'FST_ERR_VALIDATION',
        statusCode: INTERNAL_SERVER_ERROR,
        validation: [
          {
            instancePath: '/id',
            keyword: 'type',
            message: 'must be number',
            params: {
              type: 'number'
            },
            schemaPath: '#/properties/id/type'
          }
        ],
        validationContext: 'params'
      })
    })
  })
})
