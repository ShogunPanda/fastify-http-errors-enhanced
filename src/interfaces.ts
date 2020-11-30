import { Ajv, ValidateFunction } from 'ajv'

declare module 'fastify' {
  interface FastifyInstance {
    responseValidatorSchemaCompiler: Ajv
  }

  interface FastifyRequest {
    errorProperties?: {
      hideUnhandledErrors?: boolean
      convertValidationErrors?: boolean
      allowUndeclaredResponses?: boolean
    }
  }
}

export interface GenericObject {
  [key: string]: any
}

export type NodeError = NodeJS.ErrnoException

export type RequestSection = 'params' | 'query' | 'querystring' | 'headers' | 'body' | 'response'

export interface ResponseSchemas {
  [key: string]: ValidateFunction
}

export interface Validations {
  [key: string]: {
    [key: string]: string
  }
}

export type ValidationFormatter = (...args: Array<any>) => string
