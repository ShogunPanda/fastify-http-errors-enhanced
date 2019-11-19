/// <reference types="node" />
export declare type GenericObject = {
    [key: string]: any;
};
export declare type NodeError = NodeJS.ErrnoException;
export declare function addAdditionalProperties(target: GenericObject, source: GenericObject): void;
export declare function serializeError(error: Error): GenericObject;
