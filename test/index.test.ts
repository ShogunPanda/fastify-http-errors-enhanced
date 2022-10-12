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
import { handleErrors, plugin as fastifyHttpErrorsEnhanced } from '../src/index.js'

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

t.test('Plugin', t => {
  t.test('Handling http-errors', t => {
    t.test('should correctly return client errors', async t => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/not-found' })

      t.equal(response.statusCode, NOT_FOUND)
      t.match(response.headers['content-type'], /^application\/json/)
      t.same(JSON.parse(response.payload), {
        error: 'Not Found',
        message: 'Not found.',
        statusCode: NOT_FOUND
      })
    })

    t.test('should correctly return server errors', async t => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/bad-gateway' })

      t.equal(response.statusCode, BAD_GATEWAY)
      t.same(JSON.parse(response.payload), {
        error: 'Bad Gateway',
        message: 'This was the error message.',
        statusCode: BAD_GATEWAY
      })
    })

    t.test('should correctly return error codes when not starting with the prefix', async t => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/error-with-code' })

      t.equal(response.statusCode, BAD_GATEWAY)
      t.same(JSON.parse(response.payload), {
        error: 'Bad Gateway',
        message: 'This was the error message.',
        statusCode: BAD_GATEWAY,
        code: 'CODE'
      })
    })

    t.test('should correctly return server duck-typed errors', async t => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/duck-error' })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)
      t.same(JSON.parse(response.payload), {
        error: 'Internal Server Error',
        message: 'This was a generic duck message.',
        statusCode: INTERNAL_SERVER_ERROR
      })
    })

    t.test('should correctly return additional headers', async t => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/headers' })

      t.equal(response.statusCode, NOT_FOUND)
      t.equal(response.headers['x-custom-header'], 'Custom-Value')
      t.same(JSON.parse(response.payload), {
        error: 'Not Found',
        message: 'This was the error message.',
        statusCode: NOT_FOUND
      })
    })

    t.test('should correctly return additional properties', async t => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/properties' })

      t.equal(response.statusCode, BAD_GATEWAY)
      t.same(JSON.parse(response.payload), {
        error: 'Bad Gateway',
        message: 'This was the error message.',
        statusCode: BAD_GATEWAY,
        id: 1
      })
    })

    t.test('should default status code to 500 if outside HTTP range', async t => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/weird-code' })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)
      t.same(JSON.parse(response.payload), {
        error: 'Internal Server Error',
        message: 'This was the error message.',
        statusCode: INTERNAL_SERVER_ERROR
      })
    })

    t.test('should have good defaults if the error is weirdly manipulated', async t => {
      const server = await buildServer({ hideUnhandledErrors: false })

      const response = await server.inject({ method: 'GET', url: '/weird-error' })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)
      t.same(JSON.parse(response.payload), {
        error: 'Internal Server Error',
        message: '[Error] This was the error message.',
        statusCode: INTERNAL_SERVER_ERROR,
        stack: []
      })
    })

    t.end()
  })

  t.test('Handling generic errors', t => {
    t.test(
      'should correctly return generic errors by wrapping them in a 500 http-error, including headers and properties',
      async t => {
        const server = await buildServer()

        const response = await server.inject({ method: 'GET', url: '/error' })

        t.equal(response.statusCode, INTERNAL_SERVER_ERROR)
        t.equal(response.headers['x-custom-header'], 'Custom-Value')

        const payload = JSON.parse(response.payload)
        t.match(payload.stack[0], /^Object\.handler \((?:file:\/\/)?\$ROOT\/test\/index\.test\.ts:\d+:\d+\)$/)
        delete payload.stack

        t.same(payload, {
          error: 'Internal Server Error',
          message: '[Error] This was a generic message.',
          statusCode: INTERNAL_SERVER_ERROR,
          id: 1
        })
      }
    )

    t.test('should correctly parse invalid content type errors', async t => {
      const server = await buildServer()

      const response = await server.inject({
        method: 'POST',
        url: '/bad-gateway',
        headers: { 'content-type': 'image/png' }
      })

      t.equal(response.statusCode, UNSUPPORTED_MEDIA_TYPE)
      t.same(JSON.parse(response.payload), {
        error: 'Unsupported Media Type',
        message:
          'Only JSON payloads are accepted. Please set the "Content-Type" header to start with "application/json"',
        statusCode: UNSUPPORTED_MEDIA_TYPE
      })
    })

    t.test('should correctly parse missing body errors', async t => {
      const server = await buildServer()

      const response = await server.inject({
        method: 'POST',
        url: '/bad-gateway',
        headers: { 'content-type': 'application/json' }
      })

      t.equal(response.statusCode, BAD_REQUEST)
      t.same(JSON.parse(response.payload), {
        error: 'Bad Request',
        message: 'The JSON body payload cannot be empty if the "Content-Type" header is set',
        statusCode: BAD_REQUEST
      })
    })

    t.test('should correctly parse malformed body errors', async t => {
      const server = await buildServer()

      const response = await server.inject({
        method: 'POST',
        url: '/bad-gateway',
        headers: { 'content-type': 'application/json' },
        payload: '{a'
      })

      t.equal(response.statusCode, BAD_REQUEST)
      t.same(JSON.parse(response.payload), {
        error: 'Bad Request',
        message: 'The body payload is not a valid JSON',
        statusCode: BAD_REQUEST
      })
    })

    t.test('should correctly return server errors with masking explicitily enabled', async t => {
      const server = await buildServer({ hideUnhandledErrors: true })

      const response = await server.inject({ method: 'GET', url: '/error' })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)
      t.same(JSON.parse(response.payload), {
        error: 'Internal Server Error',
        message: 'An error occurred trying to process your request.',
        statusCode: INTERNAL_SERVER_ERROR
      })
    })

    t.test('should correctly return server errors with masking explicitily disabled', async t => {
      const server = await buildServer()

      const response = await server.inject({ method: 'GET', url: '/error' })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)
      t.equal(response.headers['x-custom-header'], 'Custom-Value')

      const payload = JSON.parse(response.payload)
      t.match(payload.stack[0], /^Object\.handler \((?:file:\/\/)?\$ROOT\/test\/index\.test\.ts:\d+:\d+\)$/)
      delete payload.stack

      t.same(payload, {
        error: 'Internal Server Error',
        message: '[Error] This was a generic message.',
        statusCode: INTERNAL_SERVER_ERROR,
        id: 1
      })
    })

    t.end()
  })

  t.test('Handling validation errors', t => {
    t.test('should validate params', async t => {
      const server = await buildServer()

      const response = await server.inject({
        method: 'POST',
        url: '/validated/abc',
        headers: { 'x-header': '123' },
        payload: []
      })

      t.equal(response.statusCode, BAD_REQUEST)
      t.same(JSON.parse(response.payload), {
        statusCode: BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { params: { id: 'must be a valid number' } }
      })
    })

    t.test('should validate querystring', async t => {
      const server = await buildServer()

      const response = await server.inject({
        method: 'POST',
        url: '/validated/123',
        query: { val: '13', val2: 'asd' },
        payload: []
      })

      t.equal(response.statusCode, BAD_REQUEST)
      t.same(JSON.parse(response.payload), {
        statusCode: BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { query: { val: 'must match pattern "ab{2}c"', val2: 'is not a valid property' } }
      })
    })

    t.test('should validate headers', async t => {
      const server = await buildServer()

      const response = await server.inject({ method: 'POST', url: '/validated/123', payload: [] })

      t.equal(response.statusCode, BAD_REQUEST)
      t.same(JSON.parse(response.payload), {
        statusCode: BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { headers: { 'x-header': 'must be present' } }
      })
    })

    t.test('should validate body', async t => {
      const server = await buildServer()

      const response = await server.inject({ method: 'POST', url: '/validated/123' })

      t.equal(response.statusCode, BAD_REQUEST)
      t.same(JSON.parse(response.payload), {
        statusCode: BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { body: { $root: 'must be an array' } }
      })
    })

    t.test('should not convert validation if option is disabled', async t => {
      const server = await buildServer({ convertValidationErrors: false })

      const response = await server.inject({
        method: 'POST',
        url: '/validated/abc',
        headers: { 'x-header': '123' },
        payload: []
      })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)

      const payload = JSON.parse(response.payload)
      t.match(payload.stack[1], /wrapValidationError \(\$ROOT\/node_modules.*\/fastify.*\/.+:\d+:\d+\)/)
      delete payload.stack

      t.same(payload, {
        error: 'Internal Server Error',
        message: '[Error] params/id must be number',
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

    t.end()
  })

  t.test('Using standalone error handling', t => {
    t.test("should not return the error's properties by masking server side errors", async t => {
      const server = buildStandaloneServer()

      const response = await server.inject({ method: 'GET', url: '/error/123' })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)

      const payload = JSON.parse(response.payload)
      t.match(payload.stack[0], /^Object\.handler \((?:file:\/\/)?\$ROOT\/test\/index\.test\.ts:\d+:\d+\)$/)
      delete payload.stack

      t.same(payload, {
        error: 'Internal Server Error',
        message: '[Error] This was a generic message.',
        statusCode: INTERNAL_SERVER_ERROR
      })
    })

    t.test('should return error codes', async t => {
      const server = buildStandaloneServer()

      const response = await server.inject({ method: 'GET', url: '/error/code' })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)

      const payload = JSON.parse(response.payload)
      t.match(payload.stack[0], /^Object\.handler \((?:file:\/\/)?\$ROOT\/test\/index\.test\.ts:\d+:\d+\)$/)
      delete payload.stack

      t.same(payload, {
        error: 'Internal Server Error',
        message: '[CODE] This was a generic message.',
        statusCode: INTERNAL_SERVER_ERROR,
        code: 'CODE'
      })
    })

    t.test('should not convert validation errors', async t => {
      const server = buildStandaloneServer()

      const response = await server.inject({ method: 'GET', url: '/error/abc' })

      t.equal(response.statusCode, INTERNAL_SERVER_ERROR)

      const payload = JSON.parse(response.payload)
      t.match(payload.stack[1], /wrapValidationError \(\$ROOT\/node_modules.*\/fastify.*\/.+:\d+:\d+\)/)
      delete payload.stack

      t.same(payload, {
        error: 'Internal Server Error',
        message: '[Error] params/id must be number',
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

    t.end()
  })

  t.end()
})
