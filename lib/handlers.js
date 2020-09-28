"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleErrors = exports.handleValidationError = exports.handleNotFoundError = void 0;
const http_errors_1 = __importStar(require("http-errors"));
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const statuses_1 = __importDefault(require("statuses"));
const properties_1 = require("./properties");
const utils_1 = require("./utils");
const validation_1 = require("./validation");
function handleNotFoundError(request, reply) {
    handleErrors(new http_errors_1.NotFound('Not found.'), request, reply);
}
exports.handleNotFoundError = handleNotFoundError;
function handleValidationError(error, request) {
    /*
      As seen in https://github.com/fastify/fastify/blob/master/lib/validation.js
      the error.message will  always start with the relative section (params, querystring, headers, body)
      and fastify throws on first failing section.
    */
    const section = error.message.match(/^\w+/)[0];
    return http_errors_1.default(http_status_codes_1.default.BAD_REQUEST, 'One or more validations failed trying to process your request.', {
        failedValidations: validation_1.convertValidationErrors(section, Reflect.get(request, section), error.validation)
    });
}
exports.handleValidationError = handleValidationError;
function handleErrors(error, request, reply) {
    var _a, _b;
    // It is a generic error, handle it
    const code = error.code;
    if (!('statusCode' in error)) {
        if ('validation' in error && ((_a = request.errorProperties) === null || _a === void 0 ? void 0 : _a.convertValidationErrors)) {
            // If it is a validation error, convert errors to human friendly format
            error = handleValidationError(error, request);
        }
        else if ((_b = request.errorProperties) === null || _b === void 0 ? void 0 : _b.hideUnhandledErrors) {
            // It is requested to hide the error, just log it and then create a generic one
            request.log.error({ error: properties_1.serializeError(error) });
            error = new http_errors_1.InternalServerError('An error occurred trying to process your request.');
        }
        else {
            // Wrap in a http-error, making the stack explicitily available
            error = Object.assign(new http_errors_1.InternalServerError(error.message), properties_1.serializeError(error));
            Object.defineProperty(error, 'stack', { enumerable: true });
        }
    }
    else if (code === 'INVALID_CONTENT_TYPE' || code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
        error = http_errors_1.default(http_status_codes_1.default.UNSUPPORTED_MEDIA_TYPE, utils_1.upperFirst(validation_1.validationMessagesFormatters.contentType()));
    }
    else if (code === 'FST_ERR_CTP_EMPTY_JSON_BODY') {
        error = http_errors_1.default(http_status_codes_1.default.BAD_REQUEST, utils_1.upperFirst(validation_1.validationMessagesFormatters.jsonEmpty()));
    }
    else if (code === 'MALFORMED_JSON' || error.message === 'Invalid JSON' || error.stack.includes('at JSON.parse')) {
        error = http_errors_1.default(http_status_codes_1.default.BAD_REQUEST, utils_1.upperFirst(validation_1.validationMessagesFormatters.json()));
    }
    // Get the status code
    let { statusCode, headers } = error;
    // Code outside HTTP range
    if (statusCode < 100 || statusCode > 599) {
        statusCode = http_status_codes_1.default.INTERNAL_SERVER_ERROR;
    }
    // Create the body
    const body = {
        statusCode,
        code: error.code,
        error: statuses_1.default(statusCode.toString()),
        message: error.message
    };
    properties_1.addAdditionalProperties(body, error);
    // Send the error back
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    reply
        .code(statusCode)
        .headers(headers !== null && headers !== void 0 ? headers : {})
        .type('application/json')
        .send(body);
}
exports.handleErrors = handleErrors;
