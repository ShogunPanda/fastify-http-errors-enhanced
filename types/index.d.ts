/// <reference types="node" />
import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest, RegisterOptions } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
export { addAdditionalProperties, GenericObject } from './properties';
export { convertValidationErrors, niceJoin, validationMessages, validationMessagesFormatters } from './validation';
export interface FastifyDecoratedRequest extends FastifyRequest {
    errorProperties?: {
        hideUnhandledErrors?: boolean;
        convertValidationErrors?: boolean;
    };
}
export declare function handleNotFoundError(request: FastifyRequest, reply: FastifyReply<unknown>): void;
export declare function handleValidationError(error: FastifyError, request: FastifyRequest): FastifyError;
export declare function handleErrors(error: FastifyError, request: FastifyDecoratedRequest, reply: FastifyReply<unknown>): void;
declare const _default: (instance: FastifyInstance<Server, IncomingMessage, ServerResponse>, options: RegisterOptions<unknown, unknown, unknown>, callback: (err?: FastifyError | undefined) => void) => void;
export default _default;
