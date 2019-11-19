import fastify, { FastifyInstance, RegisterOptions } from 'fastify'
import { IncomingMessage, Server, ServerResponse } from 'http'
import createError, { BadGateway } from 'http-errors'
import { BAD_GATEWAY, INTERNAL_SERVER_ERROR, NOT_FOUND } from 'http-status-codes'
import fastifyerrorProperties, { handleErrors } from '../src'

type Callback = () => void

let server: FastifyInstance | null

function defaultRoutes(instance: FastifyInstance, _options: unknown, done: Callback): void {
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

  server.register(fastifyerrorProperties, options)
  server.register(routes || defaultRoutes)
  await server.listen(0)

  return server
}

describe('Handling http-errors', function(): void {
  beforeEach(buildServer)
  afterEach(() => server!.close())

  it('should correctly return client errors', async function(): Promise<void> {
    const response = await server!.inject({ method: 'GET', url: '/not-found' })

    expect(response.statusCode).toEqual(NOT_FOUND)
    expect(response.headers['content-type']).toEqual('application/json; charset=utf-8')
    expect(JSON.parse(response.payload)).toEqual({
      error: 'Not Found',
      message: 'Not found.',
      statusCode: NOT_FOUND
    })
  })

  it('should correctly return server errors', async function(): Promise<void> {
    const response = await server!.inject({ method: 'GET', url: '/bad-gateway' })

    expect(response.statusCode).toEqual(BAD_GATEWAY)
    expect(JSON.parse(response.payload)).toEqual({
      error: 'Bad Gateway',
      message: 'This was the error message.',
      statusCode: BAD_GATEWAY
    })
  })

  it('should correctly return additional headers', async function(): Promise<void> {
    const response = await server!.inject({ method: 'GET', url: '/headers' })

    expect(response.statusCode).toEqual(NOT_FOUND)
    expect(response.headers).toMatchObject({ 'x-custom-header': 'Custom-Value' })
    expect(JSON.parse(response.payload)).toEqual({
      error: 'Not Found',
      message: 'This was the error message.',
      statusCode: NOT_FOUND
    })
  })

  it('should correctly return additional properties', async function(): Promise<void> {
    const response = await server!.inject({ method: 'GET', url: '/properties' })

    expect(response.statusCode).toEqual(BAD_GATEWAY)
    expect(JSON.parse(response.payload)).toEqual({
      error: 'Bad Gateway',
      message: 'This was the error message.',
      statusCode: BAD_GATEWAY,
      id: 1
    })
  })

  it('should default status code to 500 if outside HTTP range', async function(): Promise<void> {
    const response = await server!.inject({ method: 'GET', url: '/weird-code' })

    expect(response.statusCode).toEqual(INTERNAL_SERVER_ERROR)
    expect(JSON.parse(response.payload)).toEqual({
      error: 'Internal Server Error',
      message: 'This was the error message.',
      statusCode: INTERNAL_SERVER_ERROR
    })
  })

  it('should have good defaults if the error is weirdly manipulated', async function(): Promise<void> {
    await buildServer({ hideUnhandledErrors: false })
    const response = await server!.inject({ method: 'GET', url: '/weird-error' })

    expect(response.statusCode).toEqual(INTERNAL_SERVER_ERROR)
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

    expect(response.statusCode).toEqual(INTERNAL_SERVER_ERROR)
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

  it('should correctly return server errors with masking explicility enabled', async function(): Promise<void> {
    await buildServer({ hideUnhandledErrors: true })

    const response = await server!.inject({ method: 'GET', url: '/error' })

    expect(response.statusCode).toEqual(INTERNAL_SERVER_ERROR)
    expect(JSON.parse(response.payload)).toEqual({
      error: 'Internal Server Error',
      message: 'An error occurred trying to process your request.',
      statusCode: INTERNAL_SERVER_ERROR
    })
  })

  it('should correctly return server errors with masking explicility disabled', async function(): Promise<void> {
    const response = await server!.inject({ method: 'GET', url: '/error' })

    expect(response.statusCode).toEqual(INTERNAL_SERVER_ERROR)
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

describe('Using standalone error handling', function(): void {
  let standaloneServer: FastifyInstance

  beforeEach(async function(): Promise<void> {
    standaloneServer = fastify()

    standaloneServer.setErrorHandler(handleErrors)
    standaloneServer.get('/error', {
      async handler(): Promise<void> {
        throw new Error('This was a generic message.')
      }
    })

    await standaloneServer.listen(0)
  })

  afterEach(() => standaloneServer.close())

  it('should not required the errorProperties by never masking server side errors ', async function(): Promise<void> {
    const response = await standaloneServer.inject({ method: 'GET', url: '/error' })

    expect(response.statusCode).toEqual(INTERNAL_SERVER_ERROR)
    expect(JSON.parse(response.payload)).toEqual({
      error: 'Internal Server Error',
      message: '[Error] This was a generic message.',
      statusCode: INTERNAL_SERVER_ERROR,
      stack: expect.arrayContaining([
        expect.stringMatching(/Object\.handler \(\$ROOT\/test\/index\.spec\.ts:\d+:\d+\)/)
      ])
    })
  })
})
