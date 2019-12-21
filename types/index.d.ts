/// <reference types="node" />
import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest, RegisterOptions } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { FastifyDecoratedRequest } from './interfaces';
export * from './interfaces';
export { addAdditionalProperties } from './properties';
export { convertValidationErrors, niceJoin, validationMessagesFormatters } from './validation';
export declare function handleNotFoundError(request: FastifyRequest, reply: FastifyReply<unknown>): void;
export declare function handleValidationError(error: FastifyError, request: FastifyRequest): FastifyError;
export declare function handleErrors(error: FastifyError, request: FastifyDecoratedRequest, reply: FastifyReply<unknown>): void;
declare const _default: (instance: FastifyInstance<Server, IncomingMessage, ServerResponse>, options: RegisterOptions<unknown, unknown, unknown>, callback: (err?: FastifyError | undefined) => void) => void;
export default _default;
