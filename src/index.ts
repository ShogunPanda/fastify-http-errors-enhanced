import { FastifyError, FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { handleErrors, handleNotFoundError } from './handlers'
import { kHttpErrorsEnhancedProperties, kHttpErrorsEnhancedResponseValidations } from './interfaces'
import { addResponseValidation, compileResponseValidationSchema } from './validation'

export * from './handlers'
export * from './interfaces'
export { convertValidationErrors, niceJoin, validationMessagesFormatters } from './validation'

export const plugin = fastifyPlugin(
  function (instance: FastifyInstance, options: FastifyPluginOptions, done: (error?: FastifyError) => void): void {
    const isProduction = process.env.NODE_ENV === 'production'
    const hideUnhandledErrors = options.hideUnhandledErrors ?? isProduction
    const convertValidationErrors = options.convertValidationErrors ?? true
    const convertResponsesValidationErrors = options.convertResponsesValidationErrors ?? !isProduction
    const allowUndeclaredResponses = options.allowUndeclaredResponses ?? false

    instance.decorateRequest(kHttpErrorsEnhancedProperties, null)

    instance.addHook('onRequest', async (request: FastifyRequest) => {
      request[kHttpErrorsEnhancedProperties] = {
        hideUnhandledErrors,
        convertValidationErrors,
        allowUndeclaredResponses
      }
    })

    instance.setErrorHandler(handleErrors)
    instance.setNotFoundHandler(handleNotFoundError)

    if (convertResponsesValidationErrors) {
      instance.decorate(kHttpErrorsEnhancedResponseValidations, [])

      instance.addHook('onRoute', addResponseValidation)
      instance.addHook('onReady', compileResponseValidationSchema)
    }

    done()
  },
  { name: 'fastify-http-errors-enhanced' }
)

export default plugin
module.exports = plugin
Object.assign(module.exports, exports)
