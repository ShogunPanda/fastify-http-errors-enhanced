/// <reference types="node" />
import { FastifyInstance, RegisterOptions } from 'fastify';
import { IncomingMessage, Server as HttpServer, ServerResponse } from 'http';
import { Http2Server, Http2ServerRequest, Http2ServerResponse } from 'http2';
import { Server as HttpsServer } from 'https';
export * from './handlers';
export * from './interfaces';
export { addAdditionalProperties, serializeError } from './properties';
export { convertValidationErrors, niceJoin, validationMessagesFormatters } from './validation';
export interface Options<S extends HttpServer | HttpsServer | Http2Server = HttpServer, I extends IncomingMessage | Http2ServerRequest = IncomingMessage, R extends ServerResponse | Http2ServerResponse = ServerResponse> extends RegisterOptions<S, I, R> {
    hideUnhandledErrors?: boolean;
    convertValidationErrors?: boolean;
    convertResponsesValidationErrors?: boolean;
}
export declare type Plugin<S extends HttpServer | HttpsServer | Http2Server = HttpServer, I extends IncomingMessage | Http2ServerRequest = IncomingMessage, R extends ServerResponse | Http2ServerResponse = ServerResponse> = (fastify: FastifyInstance<S, I, R>, options: Options<S, I, R>) => void;
export declare const plugin: (instance: FastifyInstance<HttpServer, IncomingMessage, ServerResponse>, options: Options<HttpServer, IncomingMessage, ServerResponse>, callback: (err?: import("fastify").FastifyError | undefined) => void) => void;
declare const _default: Plugin<HttpServer, IncomingMessage, ServerResponse>;
export default _default;
