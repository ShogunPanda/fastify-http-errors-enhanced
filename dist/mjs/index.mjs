import fastifyPlugin from 'fastify-plugin';
import { handleErrors, handleNotFoundError } from "./handlers.mjs";
import { kHttpErrorsEnhancedProperties, kHttpErrorsEnhancedResponseValidations } from "./interfaces.mjs";
import { addResponseValidation, compileResponseValidationSchema } from "./validation.mjs";
export * from "./handlers.mjs";
export * from "./interfaces.mjs";
export { convertValidationErrors, niceJoin, validationMessagesFormatters } from "./validation.mjs";
export const plugin = fastifyPlugin(function (instance, options, done) {
    var _a, _b, _c, _d;
    const isProduction = process.env.NODE_ENV === 'production';
    const hideUnhandledErrors = (_a = options.hideUnhandledErrors) !== null && _a !== void 0 ? _a : isProduction;
    const convertValidationErrors = (_b = options.convertValidationErrors) !== null && _b !== void 0 ? _b : true;
    const convertResponsesValidationErrors = (_c = options.convertResponsesValidationErrors) !== null && _c !== void 0 ? _c : !isProduction;
    const allowUndeclaredResponses = (_d = options.allowUndeclaredResponses) !== null && _d !== void 0 ? _d : false;
    instance.decorateRequest(kHttpErrorsEnhancedProperties, null);
    instance.addHook('onRequest', async (request) => {
        request[kHttpErrorsEnhancedProperties] = {
            hideUnhandledErrors,
            convertValidationErrors,
            allowUndeclaredResponses
        };
    });
    instance.setErrorHandler(handleErrors);
    instance.setNotFoundHandler(handleNotFoundError);
    if (convertResponsesValidationErrors) {
        instance.decorate(kHttpErrorsEnhancedResponseValidations, []);
        instance.addHook('onRoute', addResponseValidation);
        instance.addHook('onReady', compileResponseValidationSchema);
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
