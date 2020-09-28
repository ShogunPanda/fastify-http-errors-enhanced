import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { HttpError } from 'http-errors';
export declare function handleNotFoundError(request: FastifyRequest, reply: FastifyReply): void;
export declare function handleValidationError(error: FastifyError, request: FastifyRequest): HttpError;
export declare function handleErrors(error: FastifyError | HttpError, request: FastifyRequest, reply: FastifyReply): void;
