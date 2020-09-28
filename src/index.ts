import Ajv from 'ajv'
import { FastifyError, FastifyInstance, FastifyPluginOptions } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { handleErrors, handleNotFoundError } from './handlers'
import { addResponseValidation } from './validation'

export * from './handlers'
export * from './interfaces'
export { addAdditionalProperties, serializeError } from './properties'
export { convertValidationErrors, niceJoin, validationMessagesFormatters } from './validation'

export const plugin = fastifyPlugin(
  function (instance: FastifyInstance, options: FastifyPluginOptions, done: (error?: FastifyError) => void): void {
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

export default plugin
module.exports = plugin
Object.assign(module.exports, exports)
