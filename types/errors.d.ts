import { GenericObject } from './properties';
export declare class ExtendedHttpError extends Error {
    [key: string]: any;
    status: number;
    statusCode: number;
    expose: boolean;
    headers?: {
        [key: string]: string;
    };
    constructor(message?: string | GenericObject, properties?: GenericObject);
}
export declare class BadRequest extends ExtendedHttpError {
}
export declare class Unauthorized extends ExtendedHttpError {
}
export declare class PaymentRequired extends ExtendedHttpError {
}
export declare class Forbidden extends ExtendedHttpError {
}
export declare class NotFound extends ExtendedHttpError {
}
export declare class MethodNotAllowed extends ExtendedHttpError {
}
export declare class NotAcceptable extends ExtendedHttpError {
}
export declare class ProxyAuthenticationRequired extends ExtendedHttpError {
}
export declare class RequestTimeout extends ExtendedHttpError {
}
export declare class Conflict extends ExtendedHttpError {
}
export declare class Gone extends ExtendedHttpError {
}
export declare class LengthRequired extends ExtendedHttpError {
}
export declare class PreconditionFailed extends ExtendedHttpError {
}
export declare class PayloadTooLarge extends ExtendedHttpError {
}
export declare class URITooLong extends ExtendedHttpError {
}
export declare class UnsupportedMediaType extends ExtendedHttpError {
}
export declare class RangeNotSatisfiable extends ExtendedHttpError {
}
export declare class ExpectationFailed extends ExtendedHttpError {
}
export declare class ImATeapot extends ExtendedHttpError {
}
export declare class MisdirectedRequest extends ExtendedHttpError {
}
export declare class UnprocessableEntity extends ExtendedHttpError {
}
export declare class Locked extends ExtendedHttpError {
}
export declare class FailedDependency extends ExtendedHttpError {
}
export declare class UnorderedCollection extends ExtendedHttpError {
}
export declare class UpgradeRequired extends ExtendedHttpError {
}
export declare class PreconditionRequired extends ExtendedHttpError {
}
export declare class TooManyRequests extends ExtendedHttpError {
}
export declare class RequestHeaderFieldsTooLarge extends ExtendedHttpError {
}
export declare class UnavailableForLegalReasons extends ExtendedHttpError {
}
export declare class InternalServerError extends ExtendedHttpError {
}
export declare class NotImplemented extends ExtendedHttpError {
}
export declare class BadGateway extends ExtendedHttpError {
}
export declare class ServiceUnavailable extends ExtendedHttpError {
}
export declare class GatewayTimeout extends ExtendedHttpError {
}
export declare class HTTPVersionNotSupported extends ExtendedHttpError {
}
export declare class VariantAlsoNegotiates extends ExtendedHttpError {
}
export declare class InsufficientStorage extends ExtendedHttpError {
}
export declare class LoopDetected extends ExtendedHttpError {
}
export declare class BandwidthLimitExceeded extends ExtendedHttpError {
}
export declare class NotExtended extends ExtendedHttpError {
}
export declare class NetworkAuthenticationRequire extends ExtendedHttpError {
}
