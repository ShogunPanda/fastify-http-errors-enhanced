"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const http_errors_1 = require("http-errors");
const http_status_codes_1 = require("http-status-codes");
const statuses_1 = __importDefault(require("statuses"));
const properties_1 = require("./properties");
var properties_2 = require("./properties");
exports.addAdditionalProperties = properties_2.addAdditionalProperties;
function handleNotFoundError(request, reply) {
    handleErrors(new http_errors_1.NotFound('Not found.'), request, reply);
}
exports.handleNotFoundError = handleNotFoundError;
function handleErrors(error, request, reply) {
    var _a;
    // It is a generic error, handle it
    if (!('statusCode' in error)) {
        // It is requested to hide the error, just log it and then create a generic one
        if ((_a = request.errorProperties) === null || _a === void 0 ? void 0 : _a.hideUnhandledErrors) {
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
    var _a;
    const hideUnhandledErrors = (_a = options.hideUnhandledErrors, (_a !== null && _a !== void 0 ? _a : process.env.NODE_ENV === 'production'));
    instance.decorateRequest('errorProperties', { hideUnhandledErrors });
    instance.setErrorHandler(handleErrors);
    instance.setNotFoundHandler(handleNotFoundError);
    done();
}, { name: 'fastify-errors-properties' });
