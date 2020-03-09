import Ajv from 'ajv'
import { FastifyInstance, RegisterOptions } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { IncomingMessage, Server as HttpServer, ServerResponse } from 'http'
import { Http2Server, Http2ServerRequest, Http2ServerResponse } from 'http2'
import { Server as HttpsServer } from 'https'
import { handleErrors, handleNotFoundError } from './handlers'
import { addResponseValidation } from './validation'

export * from './handlers'
export * from './interfaces'
export { addAdditionalProperties, serializeError } from './properties'
export { convertValidationErrors, niceJoin, validationMessagesFormatters } from './validation'

export interface Options<
  S extends HttpServer | HttpsServer | Http2Server = HttpServer,
  I extends IncomingMessage | Http2ServerRequest = IncomingMessage,
  R extends ServerResponse | Http2ServerResponse = ServerResponse
> extends RegisterOptions<S, I, R> {
  hideUnhandledErrors?: boolean
  convertValidationErrors?: boolean
  convertResponsesValidationErrors?: boolean
}

export type Plugin<
  S extends HttpServer | HttpsServer | Http2Server = HttpServer,
  I extends IncomingMessage | Http2ServerRequest = IncomingMessage,
  R extends ServerResponse | Http2ServerResponse = ServerResponse
> = (fastify: FastifyInstance<S, I, R>, options: Options<S, I, R>) => void

export const plugin = fastifyPlugin(
  function(
    instance: FastifyInstance<HttpServer, IncomingMessage, ServerResponse>,
    options: Options<HttpServer, IncomingMessage, ServerResponse>,
    done: () => void
  ): void {
    const isProduction = process.env.NODE_ENV === 'production'
    const hideUnhandledErrors = options.hideUnhandledErrors ?? isProduction
    const convertValidationErrors = options.convertValidationErrors ?? true
    const convertResponsesValidationErrors = options.convertResponsesValidationErrors ?? !isProduction

    instance.decorateRequest('errorProperties', { hideUnhandledErrors, convertValidationErrors })
    instance.setErrorHandler(handleErrors)
    instance.setNotFoundHandler(handleNotFoundError)

    if (convertResponsesValidationErrors) {
      instance.decorate(
        'responseValidatorSchemaCompiler',
        new Ajv({
          // The fastify defaults, with the exception of removeAdditional and coerceTypes, which have been reversed
          removeAdditional: false,
          useDefaults: true,
          coerceTypes: false,
          allErrors: true,
          nullable: true
        })
      )

      instance.addHook('onRoute', addResponseValidation)
    }

    done()
  },
  { name: 'fastify-errors-properties' }
)

export default plugin as Plugin
module.exports = plugin
Object.assign(module.exports, exports)
