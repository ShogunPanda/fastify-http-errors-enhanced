import { FastifyError, FastifyInstance, FastifyPluginOptions } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { handleErrors, handleNotFoundError } from './handlers.js'
import {
  Configuration,
  kHttpErrorsEnhancedConfiguration,
  kHttpErrorsEnhancedResponseValidations
} from './interfaces.js'
import { addResponseValidation, compileResponseValidationSchema } from './validation.js'

export * from './handlers.js'
export * from './interfaces.js'
export { convertValidationErrors, niceJoin, validationMessagesFormatters } from './validation.js'

export const plugin = fastifyPlugin(
  function (instance: FastifyInstance, options: FastifyPluginOptions, done: (error?: FastifyError) => void): void {
    const isProduction = process.env.NODE_ENV === 'production'
    const convertResponsesValidationErrors = options.convertResponsesValidationErrors ?? !isProduction
    const handle404Errors = options.handle404Errors ?? true

    const configuration: Configuration = {
      hideUnhandledErrors: options.hideUnhandledErrors ?? isProduction,
      convertValidationErrors: options.convertValidationErrors ?? true,
      responseValidatorCustomizer: options.responseValidatorCustomizer,
      allowUndeclaredResponses: options.allowUndeclaredResponses ?? false,
      use422ForValidationErrors: options.use422ForValidationErrors ?? false,
      preHandler: typeof options.preHandler === 'function' ? options.preHandler : undefined
    }

    instance.decorate(kHttpErrorsEnhancedConfiguration, null)
    instance.decorateRequest(kHttpErrorsEnhancedConfiguration, null)

    instance.addHook('onRequest', (request, _, done) => {
      request[kHttpErrorsEnhancedConfiguration] = configuration

      done()
    })

    instance.setErrorHandler(handleErrors)

    if (handle404Errors) {
      instance.setNotFoundHandler(handleNotFoundError)
    }

    if (convertResponsesValidationErrors) {
      instance.decorate(kHttpErrorsEnhancedResponseValidations, [])

      instance.addHook('onRoute', addResponseValidation)
      instance.addHook('onReady', compileResponseValidationSchema.bind(instance, configuration))
    }

    done()
  },
  { name: 'fastify-http-errors-enhanced', fastify: '4.x' }
)

export default plugin
