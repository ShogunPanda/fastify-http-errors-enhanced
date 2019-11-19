import { FastifyInstance, FastifyReply, FastifyRequest, RegisterOptions } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { IncomingMessage, Server, ServerResponse } from 'http'
import { HttpError, InternalServerError, NotFound } from 'http-errors'
import { INTERNAL_SERVER_ERROR } from 'http-status-codes'
import statuses from 'statuses'
import { addAdditionalProperties, GenericObject, NodeError, serializeError } from './properties'

export { addAdditionalProperties, GenericObject } from './properties'

export interface FastifyDecoratedRequest extends FastifyRequest {
  errorProperties?: {
    hideUnhandledErrors?: boolean
  }
}

export function handleNotFoundError(request: FastifyRequest, reply: FastifyReply<unknown>): void {
  handleErrors(new NotFound('Not found.'), request, reply)
}

export function handleErrors(error: Error, request: FastifyDecoratedRequest, reply: FastifyReply<unknown>): void {
  // It is a generic error, handle it
  if (!('statusCode' in (error as HttpError))) {
    // It is requested to hide the error, just log it and then create a generic one
    if (request.errorProperties?.hideUnhandledErrors) {
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

    instance.decorateRequest('errorProperties', { hideUnhandledErrors })
    instance.setErrorHandler(handleErrors)
    instance.setNotFoundHandler(handleNotFoundError)

    done()
  },
  { name: 'fastify-errors-properties' }
)
