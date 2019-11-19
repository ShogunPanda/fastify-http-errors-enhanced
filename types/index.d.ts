/// <reference types="node" />
import { FastifyInstance, FastifyReply, FastifyRequest, RegisterOptions } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
export { addAdditionalProperties, GenericObject } from './properties';
export interface FastifyDecoratedRequest extends FastifyRequest {
    errorProperties?: {
        hideUnhandledErrors?: boolean;
    };
}
export declare function handleNotFoundError(request: FastifyRequest, reply: FastifyReply<unknown>): void;
export declare function handleErrors(error: Error, request: FastifyDecoratedRequest, reply: FastifyReply<unknown>): void;
declare const _default: (instance: FastifyInstance<Server, IncomingMessage, ServerResponse>, options: RegisterOptions<unknown, unknown, unknown>, callback: (err?: import("fastify").FastifyError | undefined) => void) => void;
export default _default;
