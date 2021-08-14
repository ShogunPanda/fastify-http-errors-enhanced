import { FastifyInstance, RouteOptions, ValidationResult as FastifyValidationResult } from 'fastify';
import { Configuration, RequestSection, ValidationFormatter, Validations } from './interfaces';
export interface ValidationResult extends FastifyValidationResult {
    dataPath: any;
    instancePath: string;
}
export declare function niceJoin(array: Array<string>, lastSeparator?: string, separator?: string): string;
export declare const validationMessagesFormatters: {
    [key: string]: ValidationFormatter;
};
export declare function convertValidationErrors(section: RequestSection, data: {
    [key: string]: unknown;
}, validationErrors: Array<ValidationResult>): Validations;
export declare function addResponseValidation(this: FastifyInstance, route: RouteOptions): void;
export declare function compileResponseValidationSchema(this: FastifyInstance, configuration: Configuration): void;
