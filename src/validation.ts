import { Ajv, type Options } from 'ajv'
import addFormats from 'ajv-formats'
import {
  FastifyServerOptions,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type ValidationResult as FastifyValidationResult,
  type RouteOptions
} from 'fastify'
import { INTERNAL_SERVER_ERROR, InternalServerError } from 'http-errors-enhanced'
import {
  kHttpErrorsEnhancedConfiguration,
  kHttpErrorsEnhancedResponseValidations,
  type Configuration,
  type RequestSection,
  type ResponseSchemas,
  type ValidationFormatter,
  type Validations
} from './interfaces.js'
import { get } from './utils.js'

// Fix CJS/ESM interoperability

export interface ValidationResult extends FastifyValidationResult {
  dataPath: any
  instancePath: string
}

/* c8 ignore next 15 */
/*
  The fastify defaults, with the following modifications:
    * coerceTypes is set to false
    * removeAdditional is set to false
    * allErrors is set to true
    * uriResolver has been removed
*/
export const defaultAjvOptions: Options = {
  coerceTypes: false,
  useDefaults: true,
  removeAdditional: false,
  addUsedSchema: false,
  allErrors: true
}

function buildAjv(options?: Options, plugins?: (Function | [Function, unknown])[]): Ajv {
  // Create the instance
  const compiler: Ajv = new Ajv({
    ...defaultAjvOptions,
    ...options
  })

  // Add plugins
  let formatPluginAdded = false
  for (const pluginSpec of plugins ?? []) {
    const [plugin, pluginOpts]: [Function, unknown] = Array.isArray(pluginSpec) ? pluginSpec : [pluginSpec, undefined]

    if (plugin.name === 'formatsPlugin') {
      formatPluginAdded = true
    }

    plugin(compiler, pluginOpts)
  }

  if (!formatPluginAdded) {
    // @ts-expect-error Wrong typing
    addFormats(compiler)
  }

  return compiler
}

export function niceJoin(array: string[], lastSeparator: string = ' and ', separator: string = ', '): string {
  switch (array.length) {
    case 0:
      return ''
    case 1:
      return array[0]
    case 2:
      return array.join(lastSeparator)
    default:
      return array.slice(0, -1).join(separator) + lastSeparator + array.at(-1)!
  }
}

export const validationMessagesFormatters: Record<string, ValidationFormatter> = {
  contentType: () =>
    'only JSON payloads are accepted. Please set the "Content-Type" header to start with "application/json"',
  json: () => 'the body payload is not a valid JSON',
  jsonEmpty: () => 'the JSON body payload cannot be empty if the "Content-Type" header is set',
  missing: () => 'must be present',
  unknown: () => 'is not a valid property',
  uuid: () => 'must be a valid GUID (UUID v4)',
  timestamp: () => 'must be a valid ISO 8601 / RFC 3339 timestamp (example: 2018-07-06T12:34:56Z)',
  date: () => 'must be a valid ISO 8601 / RFC 3339 date (example: 2018-07-06)',
  time: () => 'must be a valid ISO 8601 / RFC 3339 time (example: 12:34:56)',
  uri: () => 'must be a valid URI',
  hostname: () => 'must be a valid hostname',
  ipv4: () => 'must be a valid IPv4',
  ipv6: () => 'must be a valid IPv6',
  paramType: type => {
    switch (type) {
      case 'integer':
        return 'must be a valid integer number'
      case 'number':
        return 'must be a valid number'
      case 'boolean':
        return 'must be a valid boolean (true or false)'
      case 'object':
        return 'must be a object'
      case 'array':
        return 'must be an array'
      default:
        return 'must be a string'
    }
  },
  presentString: () => 'must be a non empty string',
  minimum: min => `must be a number greater than or equal to ${min}`,
  maximum: max => `must be a number less than or equal to ${max}`,
  minimumProperties(min: number): string {
    return min === 1 ? 'cannot be a empty object' : `must be a object with at least ${min} properties`
  },
  maximumProperties(max: number): string {
    return max === 0 ? 'must be a empty object' : `must be a object with at most ${max} properties`
  },
  minimumItems(min: number): string {
    return min === 1 ? 'cannot be a empty array' : `must be an array with at least ${min} items`
  },
  maximumItems(max: number): string {
    return max === 0 ? 'must be a empty array' : `must be an array with at most ${max} items`
  },
  enum: values =>
    `must be one of the following values: ${niceJoin(values.map((f: string) => `"${f}"`) as string[], ' or ')}`,
  pattern: pattern => `must match pattern "${pattern.replaceAll('(?:', '(')}"`,
  invalidResponseCode: code => `This endpoint cannot respond with HTTP status ${code}.`,
  invalidResponse: code =>
    `The response returned from the endpoint violates its specification for the HTTP status ${code}.`,
  invalidFormat: format => `must match format "${format}" (format)`
  /* c8 ignore next */
}

export function convertValidationErrors(
  section: RequestSection,
  data: Record<string, unknown>,
  validationErrors: ValidationResult[]
): Validations {
  /* c8 ignore next 2 */
  const errors: Record<string, string> = {}

  if (section === 'querystring') {
    section = 'query'
  }

  // For each error
  for (const e of validationErrors) {
    let message = ''
    let pattern: string
    let value: string
    let reason: string

    // Normalize the key
    let key: string = e.dataPath ?? e.instancePath /* c8 ignore next */ ?? ''

    if (/^[./]/.test(key)) {
      key = key.slice(1)
    }

    // Remove useless quotes
    /* c8 ignore next 3 */
    if (key.startsWith('[') && key.endsWith(']')) {
      key = key.slice(1, -1)
    }

    // Depending on the type
    switch (e.keyword) {
      case 'required':
      case 'dependencies':
        key = e.params.missingProperty as string
        message = validationMessagesFormatters.missing()
        break
      case 'additionalProperties':
        key = e.params.additionalProperty as string

        message = validationMessagesFormatters.unknown()
        break
      case 'type':
        message = validationMessagesFormatters.paramType(e.params.type)
        break
      case 'minProperties':
        message = validationMessagesFormatters.minimumProperties(e.params.limit)
        break
      case 'maxProperties':
        message = validationMessagesFormatters.maximumProperties(e.params.limit)
        break
      case 'minItems':
        message = validationMessagesFormatters.minimumItems(e.params.limit)
        break
      case 'maxItems':
        message = validationMessagesFormatters.maximumItems(e.params.limit)
        break
      case 'minimum':
        message = validationMessagesFormatters.minimum(e.params.limit)
        break
      case 'maximum':
        message = validationMessagesFormatters.maximum(e.params.limit)
        break
      case 'enum':
        message = validationMessagesFormatters.enum(e.params.allowedValues)
        break
      case 'pattern':
        pattern = e.params.pattern as string
        value = get<string>(data, key)

        message =
          pattern === '.+' && !value
            ? validationMessagesFormatters.presentString()
            : validationMessagesFormatters.pattern(e.params.pattern)

        break
      case 'format':
        reason = e.params.format as string

        // Normalize the key
        if (reason === 'date-time') {
          reason = 'timestamp'
        }

        message = (validationMessagesFormatters[reason] || validationMessagesFormatters.invalidFormat)(reason)

        break
    }

    // No custom message was found, default to input one replacing the starting verb and adding some path info
    /* c8 ignore next 3 */
    if (!message.length) {
      message = `${e.message?.replace(/^should/, 'must')} (${e.keyword})`
    }

    // Remove useless quotes
    /* c8 ignore next 3 */
    if (/^["'][^.]+["']$/.test(key)) {
      key = key.slice(1, -1)
    }

    // Fix empty properties
    if (!key) {
      key = '$root'
    }

    key = key.replace(/^\//, '')

    errors[key] = message
  }

  return { [section]: errors }
}

export function addResponseValidation(this: FastifyInstance, route: RouteOptions): void {
  if (!route.schema?.response) {
    return
  }

  const validators: ResponseSchemas = {}

  /*
    Add these validators to the list of the one to compile once the server is started.
    This makes possible to handle shared schemas.
  */
  this[kHttpErrorsEnhancedResponseValidations].push([
    this,
    validators,
    Object.entries(route.schema.response as Record<string, object>)
  ])

  // Note that this hook is not called for non JSON payloads therefore validation is not possible in such cases
  route.preSerialization = function (
    this: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
    payload: any,
    done: (err: Error | null, payload?: any) => void
  ): void {
    const statusCode = reply.raw.statusCode

    // Never validate error 500
    if (statusCode === INTERNAL_SERVER_ERROR) {
      done(null, payload)
      return
    }

    // No validator, it means the HTTP status is not allowed
    const validator = validators[statusCode]

    if (!validator) {
      if (request[kHttpErrorsEnhancedConfiguration]!.allowUndeclaredResponses) {
        done(null, payload)
        return
      }

      done(new InternalServerError(validationMessagesFormatters.invalidResponseCode(statusCode)))
      return
    }

    // Now validate the payload
    const valid = validator(payload)

    if (!valid) {
      done(
        new InternalServerError(validationMessagesFormatters.invalidResponse(statusCode), {
          failedValidations: convertValidationErrors(
            'response',
            payload as Record<string, unknown>,
            validator.errors as ValidationResult[]
          )
        })
      )
      return
    }

    done(null, payload)
  }
}

export function compileResponseValidationSchema(this: FastifyInstance, configuration: Configuration): void {
  /* c8 ignore next 3 */
  const hasCustomizer = typeof configuration.responseValidatorCustomizer === 'function'

  // This is hackish, but it is the only way to get the options from fastify at the moment.
  const kOptions = Object.getOwnPropertySymbols(this).find(s => s.description === 'fastify.options')!

  for (const [instance, validators, schemas] of this[kHttpErrorsEnhancedResponseValidations]) {
    // Create the compiler using exactly the same options as fastify
    const ajvOptions = (instance[kOptions as keyof FastifyInstance] as FastifyServerOptions)?.ajv ?? {}
    const compiler = buildAjv(ajvOptions.customOptions, ajvOptions.plugins)

    // Add instance schemas
    compiler.addSchema(Object.values(instance.getSchemas()))

    // Customize if required to
    if (hasCustomizer) {
      configuration.responseValidatorCustomizer!(compiler)
    }

    for (const [code, schema] of schemas) {
      validators[code] = compiler.compile(schema)
    }
  }
}
