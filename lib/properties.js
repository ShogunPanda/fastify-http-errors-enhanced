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
    const serialized = {
        message: `[${error.code || error.name}] ${error.message}`,
        stack: (error.stack || '')
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
