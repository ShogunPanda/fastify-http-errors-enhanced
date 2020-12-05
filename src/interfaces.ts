import { Ajv, ValidateFunction } from 'ajv'

declare module 'fastify' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface FastifyInstance {
    responseValidatorSchemaCompiler: Ajv
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
