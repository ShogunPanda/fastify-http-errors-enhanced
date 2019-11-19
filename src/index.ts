import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest, RegisterOptions } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { IncomingMessage, Server, ServerResponse } from 'http'
import createError, { HttpError, InternalServerError, NotFound } from 'http-errors'
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from 'http-status-codes'
import statuses from 'statuses'
import { addAdditionalProperties, GenericObject, NodeError, serializeError } from './properties'
import { convertValidationErrors, RequestSection } from './validation'

export { addAdditionalProperties, GenericObject } from './properties'
export { convertValidationErrors, niceJoin, validationMessages, validationMessagesFormatters } from './validation'

export interface FastifyDecoratedRequest extends FastifyRequest {
  errorProperties?: {
    hideUnhandledErrors?: boolean
    convertValidationErrors?: boolean
  }
}

export function handleNotFoundError(request: FastifyRequest, reply: FastifyReply<unknown>): void {
  handleErrors(new NotFound('Not found.'), request, reply)
}

export function handleValidationError(error: FastifyError, request: FastifyRequest): FastifyError {
  /*
    As seen in
      https://github.com/fastify/fastify/blob/master/lib/validation.js#L96
    and
      https://github.com/fastify/fastify/blob/master/lib/validation.js#L156,

    the error.message will  always start with the relative section (params, querystring, headers, body)
    and fastify throws on first failing section.
  */
  const section = error.message.match(/^\w+/)![0] as RequestSection

  return createError(BAD_REQUEST, 'One or more validations failed trying to process your request.', {
    failedValidations: convertValidationErrors(section, Reflect.get(request, section), error.validation!)
  })
}

export function handleErrors(
  error: FastifyError,
  request: FastifyDecoratedRequest,
  reply: FastifyReply<unknown>
): void {
  // It is a generic error, handle it
  if (!('statusCode' in (error as HttpError))) {
    // If it is a validation error, convert errors to human friendly format
    if ('validation' in error && request.errorProperties?.convertValidationErrors) {
      error = handleValidationError(error, request)
    } else if (request.errorProperties?.hideUnhandledErrors) {
      // It is requested to hide the error, just log it and then create a generic one
      request.log.error({ error: serializeError(error) })
      error = new InternalServerError('An error occurred trying to process your request.')
    } else {
      // Wrap in a http-error, making the stack explicitily available
      error = Object.assign(new InternalServerError(error.message), serializeError(error))
      Object.defineProperty(error, 'stack', { enumerable: true })
    }
  }

  // Get the status code
  let { statusCode, headers } = error as HttpError

  // Code outside HTTP range
  if (statusCode < 100 || statusCode > 599) {
    statusCode = INTERNAL_SERVER_ERROR
  }

  // Create the body
  const body: GenericObject = {
    statusCode,
    code: (error as NodeError).code,
    error: statuses[statusCode.toString()],
    message: error.message
  }

  addAdditionalProperties(body, error)

  // Send the error back
  reply
    .code(statusCode)
    .headers(headers || {})
    .type('application/json')
    .send(body)
}

export default fastifyPlugin(
  function<S = Server, I = IncomingMessage, R = ServerResponse>(
    instance: FastifyInstance,
    options: RegisterOptions<S, I, R>,
    done: () => void
  ): void {
    const hideUnhandledErrors = options.hideUnhandledErrors ?? process.env.NODE_ENV === 'production'
    const convertValidationErrors = options.convertValidationErrors ?? true

    instance.decorateRequest('errorProperties', { hideUnhandledErrors, convertValidationErrors })
    instance.setErrorHandler(handleErrors)
    instance.setNotFoundHandler(handleNotFoundError)

    done()
  },
  { name: 'fastify-errors-properties' }
)
