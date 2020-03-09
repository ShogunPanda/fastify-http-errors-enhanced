"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ajv_1 = __importDefault(require("ajv"));
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const handlers_1 = require("./handlers");
const validation_1 = require("./validation");
__export(require("./handlers"));
var properties_1 = require("./properties");
exports.addAdditionalProperties = properties_1.addAdditionalProperties;
exports.serializeError = properties_1.serializeError;
var validation_2 = require("./validation");
exports.convertValidationErrors = validation_2.convertValidationErrors;
exports.niceJoin = validation_2.niceJoin;
exports.validationMessagesFormatters = validation_2.validationMessagesFormatters;
exports.plugin = fastify_plugin_1.default(function (instance, options, done) {
    var _a, _b, _c;
    const isProduction = process.env.NODE_ENV === 'production';
    const hideUnhandledErrors = (_a = options.hideUnhandledErrors) !== null && _a !== void 0 ? _a : isProduction;
    const convertValidationErrors = (_b = options.convertValidationErrors) !== null && _b !== void 0 ? _b : true;
    const convertResponsesValidationErrors = (_c = options.convertResponsesValidationErrors) !== null && _c !== void 0 ? _c : !isProduction;
    instance.decorateRequest('errorProperties', { hideUnhandledErrors, convertValidationErrors });
    instance.setErrorHandler(handlers_1.handleErrors);
    instance.setNotFoundHandler(handlers_1.handleNotFoundError);
    if (convertResponsesValidationErrors) {
        instance.decorate('responseValidatorSchemaCompiler', new ajv_1.default({
            // The fastify defaults, with the exception of removeAdditional and coerceTypes, which have been reversed
            removeAdditional: false,
            useDefaults: true,
            coerceTypes: false,
            allErrors: true,
            nullable: true
        }));
        instance.addHook('onRoute', validation_1.addResponseValidation);
    }
    done();
}, { name: 'fastify-errors-properties' });
exports.default = exports.plugin;
module.exports = exports.plugin;
Object.assign(module.exports, exports);
