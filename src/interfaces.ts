import { type ValidateFunction } from 'ajv'
import type Ajv from 'ajv'
import { type FastifyError } from 'fastify'

export const kHttpErrorsEnhancedConfiguration = Symbol('fastify-http-errors-enhanced-configuration')
export const kHttpErrorsEnhancedResponseValidations = Symbol('fastify-http-errors-enhanced-response-validation')

export interface Configuration {
  hideUnhandledErrors?: boolean
  convertValidationErrors?: boolean
  allowUndeclaredResponses?: boolean
  use422ForValidationErrors?: boolean
  responseValidatorCustomizer?: (ajv: Ajv) => void
  preHandler?: (error: FastifyError | Error) => Error
}

declare module 'fastify' {
  interface FastifyInstance {
    [kHttpErrorsEnhancedResponseValidations]: [FastifyInstance, ResponseSchemas, [string, object][]][]
  }

  interface FastifyRequest {
    [kHttpErrorsEnhancedConfiguration]?: Configuration
  }
}

export type GenericObject = Record<string, any>

export type NodeError = NodeJS.ErrnoException

export type RequestSection = 'params' | 'query' | 'querystring' | 'headers' | 'body' | 'response'

export type ResponseSchemas = Record<string, ValidateFunction>

export type Validations = Record<string, Record<string, string>>

export type ValidationFormatter = (...args: any[]) => string
