import Ajv from 'ajv'
import { FastifyInstance, RegisterOptions } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { IncomingMessage, Server, ServerResponse } from 'http'
import { handleErrors, handleNotFoundError } from './handlers'
import { addResponseValidation } from './validation'

export * from './handlers'
export * from './interfaces'
export { addAdditionalProperties } from './properties'
export { convertValidationErrors, niceJoin, validationMessagesFormatters } from './validation'

export const plugin = fastifyPlugin(
  function<S = Server, I = IncomingMessage, R = ServerResponse>(
    instance: FastifyInstance,
    options: RegisterOptions<S, I, R>,
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

// prettier-ignore
module.exports = plugin
Object.assign(module.exports, exports)
