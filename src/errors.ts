import HttpErrors from 'http-errors'
import { addAdditionalProperties, GenericObject } from './properties'

export class ExtendedHttpError extends Error {
  [key: string]: any
  status: number
  statusCode: number
  expose: boolean
  headers?: { [key: string]: string }

  constructor(message?: string | GenericObject, properties?: GenericObject) {
    super('')

    // Normalize arguments
    if (typeof message === 'object') {
      properties = message
      message = undefined
    }

    // Create a http-error with the same name and get its properties
    const standardError = new HttpErrors[this.constructor.name](message as string)
    const { status, statusCode, message: msg, headers, expose, stack } = standardError

    // Assign properties - Use explicit assignment to avoid TS warning
    this.status = status
    this.statusCode = statusCode
    this.message = msg
    this.headers = headers
    this.expose = expose
    this.stack = stack

    // Assign additional properties
    if (properties) {
      addAdditionalProperties(this, properties)
    }
  }
}

// Keep these in sync with https://www.npmjs.com/package/http-errors
export class BadRequest extends ExtendedHttpError {}
export class Unauthorized extends ExtendedHttpError {}
export class PaymentRequired extends ExtendedHttpError {}
export class Forbidden extends ExtendedHttpError {}
export class NotFound extends ExtendedHttpError {}
export class MethodNotAllowed extends ExtendedHttpError {}
export class NotAcceptable extends ExtendedHttpError {}
export class ProxyAuthenticationRequired extends ExtendedHttpError {}
export class RequestTimeout extends ExtendedHttpError {}
export class Conflict extends ExtendedHttpError {}
export class Gone extends ExtendedHttpError {}
export class LengthRequired extends ExtendedHttpError {}
export class PreconditionFailed extends ExtendedHttpError {}
export class PayloadTooLarge extends ExtendedHttpError {}
export class URITooLong extends ExtendedHttpError {}
export class UnsupportedMediaType extends ExtendedHttpError {}
export class RangeNotSatisfiable extends ExtendedHttpError {}
export class ExpectationFailed extends ExtendedHttpError {}
export class ImATeapot extends ExtendedHttpError {}
export class MisdirectedRequest extends ExtendedHttpError {}
export class UnprocessableEntity extends ExtendedHttpError {}
export class Locked extends ExtendedHttpError {}
export class FailedDependency extends ExtendedHttpError {}
export class UnorderedCollection extends ExtendedHttpError {}
export class UpgradeRequired extends ExtendedHttpError {}
export class PreconditionRequired extends ExtendedHttpError {}
export class TooManyRequests extends ExtendedHttpError {}
export class RequestHeaderFieldsTooLarge extends ExtendedHttpError {}
export class UnavailableForLegalReasons extends ExtendedHttpError {}
export class InternalServerError extends ExtendedHttpError {}
export class NotImplemented extends ExtendedHttpError {}
export class BadGateway extends ExtendedHttpError {}
export class ServiceUnavailable extends ExtendedHttpError {}
export class GatewayTimeout extends ExtendedHttpError {}
export class HTTPVersionNotSupported extends ExtendedHttpError {}
export class VariantAlsoNegotiates extends ExtendedHttpError {}
export class InsufficientStorage extends ExtendedHttpError {}
export class LoopDetected extends ExtendedHttpError {}
export class BandwidthLimitExceeded extends ExtendedHttpError {}
export class NotExtended extends ExtendedHttpError {}
export class NetworkAuthenticationRequire extends ExtendedHttpError {}
