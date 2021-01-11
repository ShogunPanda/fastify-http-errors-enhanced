import { FastifyError, FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { handleErrors, handleNotFoundError } from './handlers'
import { Configuration, kHttpErrorsEnhancedConfiguration, kHttpErrorsEnhancedResponseValidations } from './interfaces'
import { addResponseValidation, compileResponseValidationSchema } from './validation'

export * from './handlers'
export * from './interfaces'
export { convertValidationErrors, niceJoin, validationMessagesFormatters } from './validation'

export const plugin = fastifyPlugin(
  function (instance: FastifyInstance, options: FastifyPluginOptions, done: (error?: FastifyError) => void): void {
    const isProduction = process.env.NODE_ENV === 'production'
    const convertResponsesValidationErrors = options.convertResponsesValidationErrors ?? !isProduction

    const configuration: Configuration = {
      hideUnhandledErrors: options.hideUnhandledErrors ?? isProduction,
      convertValidationErrors: options.convertValidationErrors ?? true,
      responseValidatorCustomizer: options.responseValidatorCustomizer,
      allowUndeclaredResponses: options.allowUndeclaredResponses ?? false
    }

    instance.decorate(kHttpErrorsEnhancedConfiguration, null)
    instance.decorateRequest(kHttpErrorsEnhancedConfiguration, null)

    instance.addHook('onRequest', async (request: FastifyRequest) => {
      request[kHttpErrorsEnhancedConfiguration] = configuration
    })

    instance.setErrorHandler(handleErrors)
    instance.setNotFoundHandler(handleNotFoundError)

    if (convertResponsesValidationErrors) {
      instance.decorate(kHttpErrorsEnhancedResponseValidations, [])

      instance.addHook('onRoute', addResponseValidation)
      instance.addHook('onReady', compileResponseValidationSchema.bind(instance, configuration))
    }

    done()
  },
  { name: 'fastify-http-errors-enhanced' }
)

export default plugin

// Fix CommonJS exporting
/* istanbul ignore else */
if (typeof module !== 'undefined') {
  module.exports = plugin
  Object.assign(module.exports, exports)
}
