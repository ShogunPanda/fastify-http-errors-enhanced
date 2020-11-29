import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
export declare function handleNotFoundError(request: FastifyRequest, reply: FastifyReply): void;
export declare function handleValidationError(error: FastifyError, request: FastifyRequest): Error;
export declare function handleErrors(error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply): void;
