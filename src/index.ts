import type { FastifyError, FastifyInstance, FastifyPluginOptions } from 'fastify'
import type { Configuration } from './interfaces.ts'
import fastifyPlugin from 'fastify-plugin'
import { handleErrors, handleNotFoundError } from './handlers.ts'
import { kHttpErrorsEnhancedConfiguration, kHttpErrorsEnhancedResponseValidations } from './interfaces.ts'
import { addResponseValidation, compileResponseValidationSchema } from './validation.ts'

export * from './handlers.ts'
export * from './interfaces.ts'
export { convertValidationErrors, niceJoin, validationMessagesFormatters } from './validation.ts'

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

    instance.decorate(kHttpErrorsEnhancedConfiguration, undefined)
    instance.decorateRequest(kHttpErrorsEnhancedConfiguration, undefined)

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
  { name: 'fastify-http-errors-enhanced', fastify: '5.x' }
)

export default plugin
