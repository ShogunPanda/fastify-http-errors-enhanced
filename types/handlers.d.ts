import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { FastifyDecoratedRequest } from './interfaces';
export * from './interfaces';
export { addAdditionalProperties } from './properties';
export { convertValidationErrors, niceJoin, validationMessagesFormatters } from './validation';
export declare function handleNotFoundError(request: FastifyRequest, reply: FastifyReply<unknown>): void;
export declare function handleValidationError(error: FastifyError, request: FastifyRequest): FastifyError;
export declare function handleErrors(error: FastifyError, request: FastifyDecoratedRequest, reply: FastifyReply<unknown>): void;
