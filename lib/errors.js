"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_errors_1 = __importDefault(require("http-errors"));
const properties_1 = require("./properties");
class ExtendedHttpError extends Error {
    constructor(message, properties) {
        super('');
        // Normalize arguments
        if (typeof message === 'object') {
            properties = message;
            message = undefined;
        }
        // Create a http-error with the same name and get its properties
        const standardError = new http_errors_1.default[this.constructor.name](message);
        const { status, statusCode, message: msg, headers, expose, stack } = standardError;
        // Assign properties - Use explicit assignment to avoid TS warning
        this.status = status;
        this.statusCode = statusCode;
        this.message = msg;
        this.headers = headers;
        this.expose = expose;
        this.stack = stack;
        // Assign additional properties
        if (properties) {
            properties_1.addAdditionalProperties(this, properties);
        }
    }
}
exports.ExtendedHttpError = ExtendedHttpError;
// Keep these in sync with https://www.npmjs.com/package/http-errors
class BadRequest extends ExtendedHttpError {
}
exports.BadRequest = BadRequest;
class Unauthorized extends ExtendedHttpError {
}
exports.Unauthorized = Unauthorized;
class PaymentRequired extends ExtendedHttpError {
}
exports.PaymentRequired = PaymentRequired;
class Forbidden extends ExtendedHttpError {
}
exports.Forbidden = Forbidden;
class NotFound extends ExtendedHttpError {
}
exports.NotFound = NotFound;
class MethodNotAllowed extends ExtendedHttpError {
}
exports.MethodNotAllowed = MethodNotAllowed;
class NotAcceptable extends ExtendedHttpError {
}
exports.NotAcceptable = NotAcceptable;
class ProxyAuthenticationRequired extends ExtendedHttpError {
}
exports.ProxyAuthenticationRequired = ProxyAuthenticationRequired;
class RequestTimeout extends ExtendedHttpError {
}
exports.RequestTimeout = RequestTimeout;
class Conflict extends ExtendedHttpError {
}
exports.Conflict = Conflict;
class Gone extends ExtendedHttpError {
}
exports.Gone = Gone;
class LengthRequired extends ExtendedHttpError {
}
exports.LengthRequired = LengthRequired;
class PreconditionFailed extends ExtendedHttpError {
}
exports.PreconditionFailed = PreconditionFailed;
class PayloadTooLarge extends ExtendedHttpError {
}
exports.PayloadTooLarge = PayloadTooLarge;
class URITooLong extends ExtendedHttpError {
}
exports.URITooLong = URITooLong;
class UnsupportedMediaType extends ExtendedHttpError {
}
exports.UnsupportedMediaType = UnsupportedMediaType;
class RangeNotSatisfiable extends ExtendedHttpError {
}
exports.RangeNotSatisfiable = RangeNotSatisfiable;
class ExpectationFailed extends ExtendedHttpError {
}
exports.ExpectationFailed = ExpectationFailed;
class ImATeapot extends ExtendedHttpError {
}
exports.ImATeapot = ImATeapot;
class MisdirectedRequest extends ExtendedHttpError {
}
exports.MisdirectedRequest = MisdirectedRequest;
class UnprocessableEntity extends ExtendedHttpError {
}
exports.UnprocessableEntity = UnprocessableEntity;
class Locked extends ExtendedHttpError {
}
exports.Locked = Locked;
class FailedDependency extends ExtendedHttpError {
}
exports.FailedDependency = FailedDependency;
class UnorderedCollection extends ExtendedHttpError {
}
exports.UnorderedCollection = UnorderedCollection;
class UpgradeRequired extends ExtendedHttpError {
}
exports.UpgradeRequired = UpgradeRequired;
class PreconditionRequired extends ExtendedHttpError {
}
exports.PreconditionRequired = PreconditionRequired;
class TooManyRequests extends ExtendedHttpError {
}
exports.TooManyRequests = TooManyRequests;
class RequestHeaderFieldsTooLarge extends ExtendedHttpError {
}
exports.RequestHeaderFieldsTooLarge = RequestHeaderFieldsTooLarge;
class UnavailableForLegalReasons extends ExtendedHttpError {
}
exports.UnavailableForLegalReasons = UnavailableForLegalReasons;
class InternalServerError extends ExtendedHttpError {
}
exports.InternalServerError = InternalServerError;
class NotImplemented extends ExtendedHttpError {
}
exports.NotImplemented = NotImplemented;
class BadGateway extends ExtendedHttpError {
}
exports.BadGateway = BadGateway;
class ServiceUnavailable extends ExtendedHttpError {
}
exports.ServiceUnavailable = ServiceUnavailable;
class GatewayTimeout extends ExtendedHttpError {
}
exports.GatewayTimeout = GatewayTimeout;
class HTTPVersionNotSupported extends ExtendedHttpError {
}
exports.HTTPVersionNotSupported = HTTPVersionNotSupported;
class VariantAlsoNegotiates extends ExtendedHttpError {
}
exports.VariantAlsoNegotiates = VariantAlsoNegotiates;
class InsufficientStorage extends ExtendedHttpError {
}
exports.InsufficientStorage = InsufficientStorage;
class LoopDetected extends ExtendedHttpError {
}
exports.LoopDetected = LoopDetected;
class BandwidthLimitExceeded extends ExtendedHttpError {
}
exports.BandwidthLimitExceeded = BandwidthLimitExceeded;
class NotExtended extends ExtendedHttpError {
}
exports.NotExtended = NotExtended;
class NetworkAuthenticationRequire extends ExtendedHttpError {
}
exports.NetworkAuthenticationRequire = NetworkAuthenticationRequire;
