"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const http_errors_1 = __importStar(require("http-errors"));
const http_status_codes_1 = require("http-status-codes");
const statuses_1 = __importDefault(require("statuses"));
const properties_1 = require("./properties");
const validation_1 = require("./validation");
var properties_2 = require("./properties");
exports.addAdditionalProperties = properties_2.addAdditionalProperties;
var validation_2 = require("./validation");
exports.convertValidationErrors = validation_2.convertValidationErrors;
exports.niceJoin = validation_2.niceJoin;
exports.validationMessages = validation_2.validationMessages;
exports.validationMessagesFormatters = validation_2.validationMessagesFormatters;
function handleNotFoundError(request, reply) {
    handleErrors(new http_errors_1.NotFound('Not found.'), request, reply);
}
exports.handleNotFoundError = handleNotFoundError;
function handleValidationError(error, request) {
    /*
      As seen in
        https://github.com/fastify/fastify/blob/master/lib/validation.js#L96
      and
        https://github.com/fastify/fastify/blob/master/lib/validation.js#L156,
  
      the error.message will  always start with the relative section (params, querystring, headers, body)
      and fastify throws on first failing section.
    */
    const section = error.message.match(/^\w+/)[0];
    return http_errors_1.default(http_status_codes_1.BAD_REQUEST, 'One or more validations failed trying to process your request.', {
        failedValidations: validation_1.convertValidationErrors(section, Reflect.get(request, section), error.validation)
    });
}
exports.handleValidationError = handleValidationError;
function handleErrors(error, request, reply) {
    var _a, _b;
    // It is a generic error, handle it
    if (!('statusCode' in error)) {
        // If it is a validation error, convert errors to human friendly format
        if ('validation' in error && ((_a = request.errorProperties) === null || _a === void 0 ? void 0 : _a.convertValidationErrors)) {
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
    // Get the status code
    let { statusCode, headers } = error;
    // Code outside HTTP range
    if (statusCode < 100 || statusCode > 599) {
        statusCode = http_status_codes_1.INTERNAL_SERVER_ERROR;
    }
    // Create the body
    const body = {
        statusCode,
        code: error.code,
        error: statuses_1.default[statusCode.toString()],
        message: error.message
    };
    properties_1.addAdditionalProperties(body, error);
    // Send the error back
    reply
        .code(statusCode)
        .headers(headers || {})
        .type('application/json')
        .send(body);
}
exports.handleErrors = handleErrors;
exports.default = fastify_plugin_1.default(function (instance, options, done) {
    var _a, _b;
    const hideUnhandledErrors = (_a = options.hideUnhandledErrors, (_a !== null && _a !== void 0 ? _a : process.env.NODE_ENV === 'production'));
    const convertValidationErrors = (_b = options.convertValidationErrors, (_b !== null && _b !== void 0 ? _b : true));
    instance.decorateRequest('errorProperties', { hideUnhandledErrors, convertValidationErrors });
    instance.setErrorHandler(handleErrors);
    instance.setNotFoundHandler(handleNotFoundError);
    done();
}, { name: 'fastify-errors-properties' });
