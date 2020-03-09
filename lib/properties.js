"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const processRoot = process.cwd();
function addAdditionalProperties(target, source) {
    for (const v in source) {
        if (v === 'status' || v === 'statusCode' || v === 'expose' || v === 'headers') {
            continue;
        }
        target[v] = source[v];
    }
}
exports.addAdditionalProperties = addAdditionalProperties;
function serializeError(error) {
    var _a, _b;
    const serialized = {
        message: `[${(_a = error.code) !== null && _a !== void 0 ? _a : error.name}] ${error.message}`,
        stack: ((_b = error.stack) !== null && _b !== void 0 ? _b : '')
            .split('\n')
            .slice(1)
            .map((s) => s
            .trim()
            .replace(/^at /, '')
            .replace(processRoot, '$ROOT'))
    };
    addAdditionalProperties(serialized, error);
    return serialized;
}
exports.serializeError = serializeError;
