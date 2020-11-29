/// <reference types="node" />
export * from './handlers';
export * from './interfaces';
export { convertValidationErrors, niceJoin, validationMessagesFormatters } from './validation';
export declare const plugin: import("fastify").FastifyPluginCallback<Record<string, any>, import("http").Server>;
export default plugin;
