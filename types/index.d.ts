/// <reference types="node" />
import { FastifyInstance, RegisterOptions } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
export * from './handlers';
export * from './interfaces';
export { addAdditionalProperties } from './properties';
export { convertValidationErrors, niceJoin, validationMessagesFormatters } from './validation';
export declare const plugin: (instance: FastifyInstance<Server, IncomingMessage, ServerResponse>, options: RegisterOptions<unknown, unknown, unknown>, callback: (err?: import("fastify").FastifyError | undefined) => void) => void;
