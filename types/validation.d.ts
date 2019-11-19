import { ValidationResult } from 'fastify';
export declare type RequestSection = 'params' | 'query' | 'querystring' | 'headers' | 'body';
export interface Validations {
    [key: string]: {
        [key: string]: string;
    };
}
export declare type validationFormatter = (...args: Array<any>) => string;
export declare function niceJoin(array: Array<string>, lastSeparator?: string, separator?: string): string;
export declare const validationMessagesFormatters: {
    [key: string]: validationFormatter;
};
export declare const validationMessages: {
    [key: string]: string;
};
export declare function convertValidationErrors(section: RequestSection, data: {
    [key: string]: unknown;
}, validationErrors: Array<ValidationResult>): Validations;
