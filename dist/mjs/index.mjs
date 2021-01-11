import fastifyPlugin from 'fastify-plugin';
import { handleErrors, handleNotFoundError } from "./handlers.mjs";
import { kHttpErrorsEnhancedConfiguration, kHttpErrorsEnhancedResponseValidations } from "./interfaces.mjs";
import { addResponseValidation, compileResponseValidationSchema } from "./validation.mjs";
export * from "./handlers.mjs";
export * from "./interfaces.mjs";
export { convertValidationErrors, niceJoin, validationMessagesFormatters } from "./validation.mjs";
export const plugin = fastifyPlugin(function (instance, options, done) {
    var _a, _b, _c, _d;
    const isProduction = process.env.NODE_ENV === 'production';
    const convertResponsesValidationErrors = (_a = options.convertResponsesValidationErrors) !== null && _a !== void 0 ? _a : !isProduction;
    const configuration = {
        hideUnhandledErrors: (_b = options.hideUnhandledErrors) !== null && _b !== void 0 ? _b : isProduction,
        convertValidationErrors: (_c = options.convertValidationErrors) !== null && _c !== void 0 ? _c : true,
        responseValidatorCustomizer: options.responseValidatorCustomizer,
        allowUndeclaredResponses: (_d = options.allowUndeclaredResponses) !== null && _d !== void 0 ? _d : false
    };
    instance.decorate(kHttpErrorsEnhancedConfiguration, null);
    instance.decorateRequest(kHttpErrorsEnhancedConfiguration, null);
    instance.addHook('onRequest', async (request) => {
        request[kHttpErrorsEnhancedConfiguration] = configuration;
    });
    instance.setErrorHandler(handleErrors);
    instance.setNotFoundHandler(handleNotFoundError);
    if (convertResponsesValidationErrors) {
        instance.decorate(kHttpErrorsEnhancedResponseValidations, []);
        instance.addHook('onRoute', addResponseValidation);
        instance.addHook('onReady', compileResponseValidationSchema.bind(instance, configuration));
    }
    done();
}, { name: 'fastify-http-errors-enhanced' });
export default plugin;
// Fix CommonJS exporting
/* istanbul ignore else */
if (typeof module !== 'undefined') {
    module.exports = plugin;
    Object.assign(module.exports, exports);
}
