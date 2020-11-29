/// <reference types="node" />
import { Ajv, ValidateFunction } from 'ajv';
declare module 'fastify' {
    interface FastifyInstance {
        responseValidatorSchemaCompiler: Ajv;
    }
    interface FastifyRequest {
        errorProperties?: {
            hideUnhandledErrors?: boolean;
            convertValidationErrors?: boolean;
        };
    }
}
export interface GenericObject {
    [key: string]: any;
}
export declare type NodeError = NodeJS.ErrnoException;
export declare type RequestSection = 'params' | 'query' | 'querystring' | 'headers' | 'body' | 'response';
export interface ResponseSchemas {
    [key: string]: ValidateFunction;
}
export interface Validations {
    [key: string]: {
        [key: string]: string;
    };
}
export declare type ValidationFormatter = (...args: Array<any>) => string;
