import Ajv, { ValidateFunction } from 'ajv'
import { FastifyError } from 'fastify'

export const kHttpErrorsEnhancedConfiguration = Symbol('fastify-http-errors-enhanced-configuration')
export const kHttpErrorsEnhancedResponseValidations = Symbol('fastify-http-errors-enhanced-response-validation')

export interface Configuration {
  hideUnhandledErrors?: boolean
  convertValidationErrors?: boolean
  allowUndeclaredResponses?: boolean
  responseValidatorCustomizer?: (ajv: Ajv) => void
  preHandler?: (error: FastifyError | Error) => Error
}

declare module 'fastify' {
  interface FastifyInstance {
    [kHttpErrorsEnhancedResponseValidations]: Array<[FastifyInstance, ResponseSchemas, Array<[string, object]>]>
  }

  interface FastifyRequest {
    [kHttpErrorsEnhancedConfiguration]?: Configuration
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
