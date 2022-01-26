import { FastifyError, FastifyInstance, FastifyPluginOptions } from 'fastify'
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

    instance.addHook('onRequest', (request, _, done) => {
      request[kHttpErrorsEnhancedConfiguration] = configuration

      done()
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
