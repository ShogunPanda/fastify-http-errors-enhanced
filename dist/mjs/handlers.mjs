import { addAdditionalProperties, BadRequestError, InternalServerError, INTERNAL_SERVER_ERROR, messagesByCodes, NotFoundError, serializeError, UnsupportedMediaTypeError } from 'http-errors-enhanced';
import { kHttpErrorsEnhancedConfiguration } from "./interfaces.mjs";
import { upperFirst } from "./utils.mjs";
import { convertValidationErrors, validationMessagesFormatters } from "./validation.mjs";
export function handleNotFoundError(request, reply) {
    handleErrors(new NotFoundError('Not found.'), request, reply);
}
export function handleValidationError(error, request) {
    /*
      As seen in https://github.com/fastify/fastify/blob/master/lib/validation.js
      the error.message will  always start with the relative section (params, querystring, headers, body)
      and fastify throws on first failing section.
    */
    const section = error.message.match(/^\w+/)[0];
    return new BadRequestError('One or more validations failed trying to process your request.', {
        failedValidations: convertValidationErrors(section, Reflect.get(request, section), error.validation)
    });
}
export function handleErrors(error, request, reply) {
    var _a, _b;
    // It is a generic error, handle it
    const code = error.code;
    if (!('statusCode' in error)) {
        if ('validation' in error && ((_a = request[kHttpErrorsEnhancedConfiguration]) === null || _a === void 0 ? void 0 : _a.convertValidationErrors)) {
            // If it is a validation error, convert errors to human friendly format
            error = handleValidationError(error, request);
        }
        else if ((_b = request[kHttpErrorsEnhancedConfiguration]) === null || _b === void 0 ? void 0 : _b.hideUnhandledErrors) {
            // It is requested to hide the error, just log it and then create a generic one
            request.log.error({ error: serializeError(error) });
            error = new InternalServerError('An error occurred trying to process your request.');
        }
        else {
            // Wrap in a HttpError, making the stack explicitily available
            error = new InternalServerError(serializeError(error));
            Object.defineProperty(error, 'stack', { enumerable: true });
        }
    }
    else if (code === 'INVALID_CONTENT_TYPE' || code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
        error = new UnsupportedMediaTypeError(upperFirst(validationMessagesFormatters.contentType()));
    }
    else if (code === 'FST_ERR_CTP_EMPTY_JSON_BODY') {
        error = new BadRequestError(upperFirst(validationMessagesFormatters.jsonEmpty()));
    }
    else if (code === 'MALFORMED_JSON' || error.message === 'Invalid JSON' || error.stack.includes('at JSON.parse')) {
        error = new BadRequestError(upperFirst(validationMessagesFormatters.json()));
    }
    // Get the status code
    let { statusCode, headers } = error;
    // Code outside HTTP range
    if (statusCode < 100 || statusCode > 599) {
        statusCode = INTERNAL_SERVER_ERROR;
    }
    // Create the body
    const body = {
        statusCode,
        error: messagesByCodes[statusCode],
        message: error.message
    };
    addAdditionalProperties(body, error);
    // Send the error back
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    reply
        .code(statusCode)
        .headers(headers !== null && headers !== void 0 ? headers : {})
        .type('application/json')
        .send(body);
}
