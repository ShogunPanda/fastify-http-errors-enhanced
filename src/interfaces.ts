import { Ajv, ValidateFunction } from 'ajv'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ServerResponse } from 'http'

export interface GenericObject {
  [key: string]: any
}

export type NodeError = NodeJS.ErrnoException

export type RequestSection = 'params' | 'query' | 'querystring' | 'headers' | 'body' | 'response'

export interface ResponseSchemas {
  [key: string]: ValidateFunction
}

export interface FastifyDecoratedInstance extends FastifyInstance {
  responseValidatorSchemaCompiler: Ajv
}

export interface FastifyDecoratedRequest extends FastifyRequest {
  errorProperties?: {
    hideUnhandledErrors?: boolean
    convertValidationErrors?: boolean
  }
}

export interface FastifyDecoratedReply extends FastifyReply<ServerResponse> {
  originalResponse?: {
    statusCode: number
    payload: any
  }
}
export interface Validations {
  [key: string]: {
    [key: string]: string
  }
}

export type ValidationFormatter = (...args: Array<any>) => string
