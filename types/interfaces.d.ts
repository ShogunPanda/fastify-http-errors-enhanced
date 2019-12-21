/// <reference types="node" />
import { Ajv, ValidateFunction } from 'ajv';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ServerResponse } from 'http';
export declare type GenericObject = {
    [key: string]: any;
};
export declare type NodeError = NodeJS.ErrnoException;
export declare type RequestSection = 'params' | 'query' | 'querystring' | 'headers' | 'body' | 'response';
export interface ResponseSchemas {
    [key: string]: ValidateFunction;
}
export interface FastifyDecoratedInstance extends FastifyInstance {
    responseValidatorSchemaCompiler: Ajv;
}
export interface FastifyDecoratedRequest extends FastifyRequest {
    errorProperties?: {
        hideUnhandledErrors?: boolean;
        convertValidationErrors?: boolean;
    };
}
export interface FastifyDecoratedReply extends FastifyReply<ServerResponse> {
    originalResponse?: {
        statusCode: number;
        payload: any;
    };
}
export interface Validations {
    [key: string]: {
        [key: string]: string;
    };
}
export declare type ValidationFormatter = (...args: Array<any>) => string;
