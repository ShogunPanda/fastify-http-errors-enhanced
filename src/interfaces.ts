import { Ajv, ValidateFunction } from 'ajv'

export const kHttpErrorsEnhancedProperties = Symbol('fastify-http-errors-enhanced-properties')
export const kHttpErrorsEnhancedResponseValidations = Symbol('fastify-http-errors-enhanced-response-validation')

declare module 'fastify' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface FastifyInstance {
    responseValidatorSchemaCompiler: Ajv
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [kHttpErrorsEnhancedResponseValidations]: Array<[FastifyInstance, ResponseSchemas, Array<[string, object]>]>
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface FastifyRequest {
    [kHttpErrorsEnhancedProperties]?: {
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
