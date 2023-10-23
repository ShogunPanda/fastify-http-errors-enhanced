/* eslint-disable @typescript-eslint/no-floating-promises */

import fastify, { type FastifyError, type FastifyInstance, type FastifyPluginOptions } from 'fastify'
import { INTERNAL_SERVER_ERROR } from 'http-errors-enhanced'
import t from 'tap'
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

t.test('should correctly allow preprocessing of error before executing the handler', async t => {
  const server = await buildServer({
    preHandler(error: FastifyError | Error) {
      Object.defineProperty(error, 'preHandlerExecuted', { enumerable: true, value: true })
      return error
    }
  })

  const response = await server.inject({ method: 'GET', url: '/error' })

  t.equal(response.statusCode, INTERNAL_SERVER_ERROR)
  t.equal(response.headers['x-custom-header'], 'Custom-Value')

  const payload = JSON.parse(response.payload)
  t.match(payload.stack[0], /^Object\.handler \((?:file:\/\/)?\$ROOT\/test\/hooks\.test\.ts:\d+:\d+\)$/)
  delete payload.stack

  t.same(payload, {
    error: 'Internal Server Error',
    message: '[Error] This was a generic message.',
    statusCode: INTERNAL_SERVER_ERROR,
    id: 1,
    preHandlerExecuted: true
  })
})
