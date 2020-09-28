import { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import createError, { HttpError, InternalServerError, NotFound } from 'http-errors'
import StatusCodes from 'http-status-codes'
import statuses from 'statuses'
import { GenericObject, NodeError, RequestSection } from './interfaces'
import { addAdditionalProperties, serializeError } from './properties'
import { upperFirst } from './utils'
import { convertValidationErrors, validationMessagesFormatters } from './validation'

export function handleNotFoundError(request: FastifyRequest, reply: FastifyReply): void {
  handleErrors(new NotFound('Not found.'), request, reply)
}

export function handleValidationError(error: FastifyError, request: FastifyRequest): HttpError {
  /*
    As seen in https://github.com/fastify/fastify/blob/master/lib/validation.js
    the error.message will  always start with the relative section (params, querystring, headers, body)
    and fastify throws on first failing section.
  */
  const section = error.message.match(/^\w+/)![0] as RequestSection

  return createError(StatusCodes.BAD_REQUEST, 'One or more validations failed trying to process your request.', {
    failedValidations: convertValidationErrors(section, Reflect.get(request, section), error.validation!)
  })
}

export function handleErrors(error: FastifyError | HttpError, request: FastifyRequest, reply: FastifyReply): void {
  // It is a generic error, handle it
  const code = (error as NodeError).code

  if (!('statusCode' in error)) {
    if ('validation' in error && request.errorProperties?.convertValidationErrors) {
      // If it is a validation error, convert errors to human friendly format
      error = handleValidationError(error as FastifyError, request)
    } else if (request.errorProperties?.hideUnhandledErrors) {
      // It is requested to hide the error, just log it and then create a generic one
      request.log.error({ error: serializeError(error) })
      error = new InternalServerError('An error occurred trying to process your request.')
    } else {
      // Wrap in a http-error, making the stack explicitily available
      error = Object.assign(new InternalServerError(error.message), serializeError(error))
      Object.defineProperty(error, 'stack', { enumerable: true })
    }
  } else if (code === 'INVALID_CONTENT_TYPE' || code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
    error = createError(StatusCodes.UNSUPPORTED_MEDIA_TYPE, upperFirst(validationMessagesFormatters.contentType()))
  } else if (code === 'FST_ERR_CTP_EMPTY_JSON_BODY') {
    error = createError(StatusCodes.BAD_REQUEST, upperFirst(validationMessagesFormatters.jsonEmpty()))
  } else if (code === 'MALFORMED_JSON' || error.message === 'Invalid JSON' || error.stack!.includes('at JSON.parse')) {
    error = createError(StatusCodes.BAD_REQUEST, upperFirst(validationMessagesFormatters.json()))
  }

  // Get the status code
  let { statusCode, headers } = error as HttpError

  // Code outside HTTP range
  if (statusCode < 100 || statusCode > 599) {
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR
  }

  // Create the body
  const body: GenericObject = {
    statusCode,
    code: (error as NodeError).code,
    error: statuses(statusCode.toString()),
    message: error.message
  }

  addAdditionalProperties(body, error)

  // Send the error back
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  reply
    .code(statusCode)
    .headers(headers ?? {})
    .type('application/json')
    .send(body)
}
