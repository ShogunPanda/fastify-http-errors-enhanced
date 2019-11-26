import Ajv from 'ajv'
import fastify, { FastifyInstance, RegisterOptions } from 'fastify'
import { IncomingMessage, Server, ServerResponse } from 'http'
import createError, { BadGateway } from 'http-errors'
import { BAD_GATEWAY, BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, UNSUPPORTED_MEDIA_TYPE } from 'http-status-codes'
import 'jest-additional-expectations'
import fastifyErrorProperties, { handleErrors } from '../src'

type Callback = () => void

let server: FastifyInstance | null

function defaultRoutes(instance: FastifyInstance, _options: unknown, done: Callback): void {
  const ajv = new Ajv({
    removeAdditional: false,
    useDefaults: true,
    coerceTypes: true,
    allErrors: true,
    nullable: true
  })

  instance.setSchemaCompiler((schema: object) => ajv.compile(schema))

  instance.get('/bad-gateway', {
    async handler(): Promise<void> {
      throw new BadGateway('This was the error message.')
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
      const error = new BadGateway('This was the error message.')
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

async function buildServer(
  options: RegisterOptions<Server, IncomingMessage, ServerResponse> = {},
  routes?: (instance: FastifyInstance, _options: unknown, done: Callback) => void
): Promise<FastifyInstance> {
  if (server) {
    await server.close()
    server = null
  }

  server = fastify()

  server.register(fastifyErrorProperties, options)
  server.register(routes || defaultRoutes)
  await server.listen(0)

  return server
}

describe('Plugin', function(): void {
  describe('Handling http-errors', function(): void {
    beforeEach(buildServer)
    afterEach(() => server!.close())

    it('should correctly return client errors', async function(): Promise<void> {
      const response = await server!.inject({ method: 'GET', url: '/not-found' })

      expect(response).toHaveHTTPStatus(NOT_FOUND)
      expect(response).toBeJSON()
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Not Found',
        message: 'Not found.',
        statusCode: NOT_FOUND
      })
    })

    it('should correctly return server errors', async function(): Promise<void> {
      const response = await server!.inject({ method: 'GET', url: '/bad-gateway' })

      expect(response).toHaveHTTPStatus(BAD_GATEWAY)
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Bad Gateway',
        message: 'This was the error message.',
        statusCode: BAD_GATEWAY
      })
    })

    it('should correctly return additional headers', async function(): Promise<void> {
      const response = await server!.inject({ method: 'GET', url: '/headers' })

      expect(response).toHaveHTTPStatus(NOT_FOUND)
      expect(response.headers).toMatchObject({ 'x-custom-header': 'Custom-Value' })
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Not Found',
        message: 'This was the error message.',
        statusCode: NOT_FOUND
      })
    })

    it('should correctly return additional properties', async function(): Promise<void> {
      const response = await server!.inject({ method: 'GET', url: '/properties' })

      expect(response).toHaveHTTPStatus(BAD_GATEWAY)
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Bad Gateway',
        message: 'This was the error message.',
        statusCode: BAD_GATEWAY,
        id: 1
      })
    })

    it('should default status code to 500 if outside HTTP range', async function(): Promise<void> {
      const response = await server!.inject({ method: 'GET', url: '/weird-code' })

      expect(response).toHaveHTTPStatus(INTERNAL_SERVER_ERROR)
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Internal Server Error',
        message: 'This was the error message.',
        statusCode: INTERNAL_SERVER_ERROR
      })
    })

    it('should have good defaults if the error is weirdly manipulated', async function(): Promise<void> {
      await buildServer({ hideUnhandledErrors: false })
      const response = await server!.inject({ method: 'GET', url: '/weird-error' })

      expect(response).toHaveHTTPStatus(INTERNAL_SERVER_ERROR)
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Internal Server Error',
        message: '[Error] This was the error message.',
        statusCode: INTERNAL_SERVER_ERROR,
        stack: []
      })
    })
  })

  describe('Handling generic errors', function(): void {
    beforeEach(buildServer)
    afterEach(() => server!.close())

    it('should correctly return generic errors by wrapping them in a 500 http-error, including headers and properties', async function(): Promise<
      void
    > {
      const response = await server!.inject({ method: 'GET', url: '/error' })

      expect(response).toHaveHTTPStatus(INTERNAL_SERVER_ERROR)
      expect(response.headers).toMatchObject({ 'x-custom-header': 'Custom-Value' })
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Internal Server Error',
        message: '[Error] This was a generic message.',
        statusCode: INTERNAL_SERVER_ERROR,
        id: 1,
        stack: expect.arrayContaining([
          expect.stringMatching(/Object\.handler \(\$ROOT\/test\/index\.spec\.ts:\d+:\d+\)/)
        ])
      })
    })

    it('should correctly parse invalid content type errors', async function(): Promise<void> {
      const response = await server!.inject({
        method: 'POST',
        url: '/bad-gateway',
        headers: { 'content-type': 'image/png' }
      })

      expect(response).toHaveHTTPStatus(UNSUPPORTED_MEDIA_TYPE)
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Unsupported Media Type',
        message:
          'Only JSON payloads are accepted. Please set the "Content-Type" header to start with "application/json"',
        statusCode: UNSUPPORTED_MEDIA_TYPE
      })
    })

    it('should correctly parse missing body errors', async function(): Promise<void> {
      const response = await server!.inject({
        method: 'POST',
        url: '/bad-gateway',
        headers: { 'content-type': 'application/json' }
      })

      expect(response).toHaveHTTPStatus(BAD_REQUEST)
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Bad Request',
        message: 'The JSON body payload cannot be empty if the "Content-Type" header is set',
        statusCode: BAD_REQUEST
      })
    })

    it('should correctly parse malformed body errors', async function(): Promise<void> {
      const response = await server!.inject({
        method: 'POST',
        url: '/bad-gateway',
        headers: { 'content-type': 'application/json' },
        payload: '{a'
      })

      expect(response).toHaveHTTPStatus(BAD_REQUEST)
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Bad Request',
        message: 'The body payload is not a valid JSON',
        statusCode: BAD_REQUEST
      })
    })

    it('should correctly return server errors with masking explicitily enabled', async function(): Promise<void> {
      await buildServer({ hideUnhandledErrors: true })

      const response = await server!.inject({ method: 'GET', url: '/error' })

      expect(response).toHaveHTTPStatus(INTERNAL_SERVER_ERROR)
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Internal Server Error',
        message: 'An error occurred trying to process your request.',
        statusCode: INTERNAL_SERVER_ERROR
      })
    })

    it('should correctly return server errors with masking explicitily disabled', async function(): Promise<void> {
      const response = await server!.inject({ method: 'GET', url: '/error' })

      expect(response).toHaveHTTPStatus(INTERNAL_SERVER_ERROR)
      expect(response.headers).toMatchObject({ 'x-custom-header': 'Custom-Value' })
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Internal Server Error',
        message: '[Error] This was a generic message.',
        statusCode: INTERNAL_SERVER_ERROR,
        id: 1,
        stack: expect.arrayContaining([
          expect.stringMatching(/Object\.handler \(\$ROOT\/test\/index\.spec\.ts:\d+:\d+\)/)
        ])
      })
    })
  })

  describe('Handling validation errors', function(): void {
    beforeEach(buildServer)
    afterEach(() => server!.close())

    it('should validate params', async function(): Promise<void> {
      const response = await server!.inject({
        method: 'POST',
        url: '/validated/abc',
        headers: { 'x-header': '123' },
        payload: []
      })

      expect(response).toHaveHTTPStatus(BAD_REQUEST)
      expect(JSON.parse(response.payload)).toEqual({
        statusCode: BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { params: { id: 'must be a valid number' } }
      })
    })

    it('should validate querystring', async function(): Promise<void> {
      const response = await server!.inject({
        method: 'POST',
        url: '/validated/123',
        query: { val: 13, val2: 'asd' },
        payload: []
      })

      expect(response).toHaveHTTPStatus(BAD_REQUEST)
      expect(JSON.parse(response.payload)).toEqual({
        statusCode: BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { query: { val: 'must match pattern "ab{2}c"', val2: 'is not a valid property' } }
      })
    })

    it('should validate headers', async function(): Promise<void> {
      const response = await server!.inject({ method: 'POST', url: '/validated/123', payload: [] })

      expect(response).toHaveHTTPStatus(BAD_REQUEST)
      expect(JSON.parse(response.payload)).toEqual({
        statusCode: BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { headers: { 'x-header': 'must be present' } }
      })
    })

    it('should validate body', async function(): Promise<void> {
      const response = await server!.inject({ method: 'POST', url: '/validated/123' })

      expect(response).toHaveHTTPStatus(BAD_REQUEST)
      expect(JSON.parse(response.payload)).toEqual({
        statusCode: BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more validations failed trying to process your request.',
        failedValidations: { body: { $root: 'must be an array' } }
      })
    })

    it('should not convert validation if option is disabled', async function(): Promise<void> {
      await buildServer({ convertValidationErrors: false })

      const response = await server!.inject({
        method: 'POST',
        url: '/validated/abc',
        headers: { 'x-header': '123' },
        payload: []
      })

      expect(response).toHaveHTTPStatus(INTERNAL_SERVER_ERROR)
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Internal Server Error',
        message: '[Error] params.id should be number',
        statusCode: INTERNAL_SERVER_ERROR,
        stack: expect.arrayContaining([
          expect.stringMatching(/validate \(\$ROOT\/node_modules\/fastify\/.+:\d+:\d+\)/)
        ]),
        validation: expect.arrayContaining([
          expect.objectContaining({
            dataPath: '.id',
            keyword: 'type',
            message: 'should be number',
            params: {
              type: 'number'
            },
            schemaPath: '#/properties/id/type'
          })
        ])
      })
    })
  })

  describe('Using standalone error handling', function(): void {
    let standaloneServer: FastifyInstance

    beforeEach(async function(): Promise<void> {
      standaloneServer = fastify()

      standaloneServer.setErrorHandler(handleErrors)
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
    })

    afterEach(() => standaloneServer.close())

    it('should not required the errorProperties by never masking server side errors ', async function(): Promise<void> {
      const response = await standaloneServer.inject({ method: 'GET', url: '/error/123' })

      expect(response).toHaveHTTPStatus(INTERNAL_SERVER_ERROR)
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Internal Server Error',
        message: '[Error] This was a generic message.',
        statusCode: INTERNAL_SERVER_ERROR,
        stack: expect.arrayContaining([
          expect.stringMatching(/Object\.handler \(\$ROOT\/test\/index\.spec\.ts:\d+:\d+\)/)
        ])
      })
    })

    it('should not convert validation errors', async function(): Promise<void> {
      const response = await standaloneServer.inject({ method: 'GET', url: '/error/abc' })

      expect(response).toHaveHTTPStatus(INTERNAL_SERVER_ERROR)
      expect(JSON.parse(response.payload)).toEqual({
        error: 'Internal Server Error',
        message: '[Error] params.id should be number',
        statusCode: INTERNAL_SERVER_ERROR,
        stack: expect.arrayContaining([
          expect.stringMatching(/validate \(\$ROOT\/node_modules\/fastify\/.+:\d+:\d+\)/)
        ]),
        validation: expect.arrayContaining([
          expect.objectContaining({
            dataPath: '.id',
            keyword: 'type',
            message: 'should be number',
            params: {
              type: 'number'
            },
            schemaPath: '#/properties/id/type'
          })
        ])
      })
    })
  })
})
