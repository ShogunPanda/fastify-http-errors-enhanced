/// <reference types="node" />
import { Ajv, ValidateFunction } from 'ajv';
export declare const kHttpErrorsEnhancedProperties: unique symbol;
export declare const kHttpErrorsEnhancedResponseValidations: unique symbol;
declare module 'fastify' {
    interface FastifyInstance {
        responseValidatorSchemaCompiler: Ajv;
        [kHttpErrorsEnhancedResponseValidations]: Array<[FastifyInstance, ResponseSchemas, Array<[string, object]>]>;
    }
    interface FastifyRequest {
        [kHttpErrorsEnhancedProperties]?: {
            hideUnhandledErrors?: boolean;
            convertValidationErrors?: boolean;
            allowUndeclaredResponses?: boolean;
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
