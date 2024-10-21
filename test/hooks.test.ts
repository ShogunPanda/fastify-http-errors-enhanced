import fastify, { type FastifyError, type FastifyInstance, type FastifyPluginOptions } from 'fastify'
import { INTERNAL_SERVER_ERROR } from 'http-errors-enhanced'
import { deepStrictEqual, match } from 'node:assert'
import { test } from 'node:test'
import { plugin as fastifyHttpErrorsEnhanced } from '../src/index.js'

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

  server.get('/error', {
    handler() {
      const error = new Error('This was a generic message.')
      Object.assign(error, { id: 1, headers: { 'X-Custom-Header': 'Custom-Value' } })

      return Promise.reject(error)
    }
  })

  return server
}

test('should correctly allow preprocessing of error before executing the handler', async t => {
  const server = await buildServer({
    preHandler(error: FastifyError | Error) {
      Object.defineProperty(error, 'preHandlerExecuted', { enumerable: true, value: true })
      return error
    }
  })

  const response = await server.inject({ method: 'GET', url: '/error' })

  deepStrictEqual(response.statusCode, INTERNAL_SERVER_ERROR)
  deepStrictEqual(response.headers['x-custom-header'], 'Custom-Value')

  const payload = JSON.parse(response.payload)
  match(payload.stack[0] as string, /^Object\.handler \((?:file:\/\/)?\$ROOT\/test\/hooks\.test\.ts:\d+:\d+\)$/)
  delete payload.stack

  deepStrictEqual(payload, {
    error: 'Internal Server Error',
    message: '[Error] This was a generic message.',
    statusCode: INTERNAL_SERVER_ERROR,
    id: 1,
    preHandlerExecuted: true
  })
})
