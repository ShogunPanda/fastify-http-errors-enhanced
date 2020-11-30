"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = exports.validationMessagesFormatters = exports.niceJoin = exports.convertValidationErrors = void 0;
const ajv_1 = __importDefault(require("ajv"));
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const handlers_1 = require("./handlers");
const validation_1 = require("./validation");
__exportStar(require("./handlers"), exports);
__exportStar(require("./interfaces"), exports);
var validation_2 = require("./validation");
Object.defineProperty(exports, "convertValidationErrors", { enumerable: true, get: function () { return validation_2.convertValidationErrors; } });
Object.defineProperty(exports, "niceJoin", { enumerable: true, get: function () { return validation_2.niceJoin; } });
Object.defineProperty(exports, "validationMessagesFormatters", { enumerable: true, get: function () { return validation_2.validationMessagesFormatters; } });
exports.plugin = fastify_plugin_1.default(function (instance, options, done) {
    var _a, _b, _c, _d;
    const isProduction = process.env.NODE_ENV === 'production';
    const hideUnhandledErrors = (_a = options.hideUnhandledErrors) !== null && _a !== void 0 ? _a : isProduction;
    const convertValidationErrors = (_b = options.convertValidationErrors) !== null && _b !== void 0 ? _b : true;
    const convertResponsesValidationErrors = (_c = options.convertResponsesValidationErrors) !== null && _c !== void 0 ? _c : !isProduction;
    const allowUndeclaredResponses = (_d = options.allowUndeclaredResponses) !== null && _d !== void 0 ? _d : false;
    instance.decorateRequest('errorProperties', {
        hideUnhandledErrors,
        convertValidationErrors,
        allowUndeclaredResponses
    });
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
}, { name: 'fastify-http-errors-enhanced' });
exports.default = exports.plugin;
module.exports = exports.plugin;
Object.assign(module.exports, exports);
