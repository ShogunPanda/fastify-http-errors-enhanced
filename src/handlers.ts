import { type FastifyError, type FastifyReply, type FastifyRequest } from 'fastify'
import {
  BadRequestError,
  INTERNAL_SERVER_ERROR,
  InternalServerError,
  NotFoundError,
  UnprocessableEntityError,
  UnsupportedMediaTypeError,
  addAdditionalProperties,
  messagesByCodes,
  serializeError,
  type HttpError
} from 'http-errors-enhanced'
import {
  kHttpErrorsEnhancedConfiguration,
  type GenericObject,
  type NodeError,
  type RequestSection
} from './interfaces.js'
import { upperFirst } from './utils.js'
import { convertValidationErrors, validationMessagesFormatters, type ValidationResult } from './validation.js'

export function handleNotFoundError(request: FastifyRequest, reply: FastifyReply): void {
  handleErrors(new NotFoundError('Not found.'), request, reply)
}

export function handleValidationError(error: FastifyError, request: FastifyRequest): Error {
  /*
    As seen in https://github.com/fastify/fastify/blob/master/lib/validation.js
    the error.message will  always start with the relative section (params, querystring, headers, body)
    and fastify throws on first failing section.
  */
  const section = error.message.match(/^\w+/)![0] as RequestSection

  const Klass = request[kHttpErrorsEnhancedConfiguration]?.use422ForValidationErrors
    ? UnprocessableEntityError
    : BadRequestError

  return new Klass('One or more validations failed trying to process your request.', {
    failedValidations: convertValidationErrors(
      section,
      Reflect.get(request, section) as Record<string, unknown>,
      error.validation! as ValidationResult[]
    )
  })
}

export function handleErrors(error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply): void {
  if (request[kHttpErrorsEnhancedConfiguration]?.preHandler) {
    error = request[kHttpErrorsEnhancedConfiguration].preHandler(error)
  }

  // It is a generic error, handle it
  const code = (error as NodeError).code

  if (!('statusCode' in error) || 'validation' in error) {
    if ('validation' in error && request[kHttpErrorsEnhancedConfiguration]?.convertValidationErrors) {
      // If it is a validation error, convert errors to human friendly format
      error = handleValidationError(error, request)
    } else if (request[kHttpErrorsEnhancedConfiguration]?.hideUnhandledErrors) {
      // It is requested to hide the error, just log it and then create a generic one
      request.log.error({ error: serializeError(error) })
      error = new InternalServerError('An error occurred trying to process your request.')
    } else {
      // Wrap in a HttpError, making the stack explicitily available
      error = new InternalServerError(serializeError(error))
      Object.defineProperty(error, 'stack', { enumerable: true })
    }
  } else if (code === 'INVALID_CONTENT_TYPE' || code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
    error = new UnsupportedMediaTypeError(upperFirst(validationMessagesFormatters.contentType()))
  } else if (code === 'FST_ERR_CTP_EMPTY_JSON_BODY') {
    error = new BadRequestError(upperFirst(validationMessagesFormatters.jsonEmpty()))
  } else if (
    code === 'MALFORMED_JSON' ||
    error.name === 'SyntaxError' ||
    error.message === 'Invalid JSON' ||
    error.stack!.includes('at JSON.parse')
  ) {
    error = new BadRequestError(upperFirst(validationMessagesFormatters.json()))
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
    error: messagesByCodes[statusCode],
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
