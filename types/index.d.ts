/// <reference types="node" />
import { FastifyPluginOptions } from 'fastify';
export * from './handlers';
export * from './interfaces';
export { convertValidationErrors, niceJoin, validationMessagesFormatters } from './validation';
export declare const plugin: import("fastify").FastifyPluginCallback<FastifyPluginOptions, import("http").Server>;
export default plugin;
