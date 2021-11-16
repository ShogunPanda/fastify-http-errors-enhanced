# fastify-http-errors-enhanced

[![Version](https://img.shields.io/npm/v/fastify-http-errors-enhanced.svg)](https://npm.im/fastify-http-errors-enhanced)
[![Dependencies](https://img.shields.io/librariesio/release/npm/fastify-http-errors-enhanced)](https://libraries.io/npm/fastify-http-errors-enhanced)
[![Build](https://github.com/ShogunPanda/fastify-http-errors-enhanced/workflows/CI/badge.svg)](https://github.com/ShogunPanda/fastify-http-errors-enhanced/actions?query=workflow%3ACI)
[![Coverage](https://img.shields.io/codecov/c/gh/ShogunPanda/fastify-http-errors-enhanced?token=ep3IRURLnT)](https://codecov.io/gh/ShogunPanda/fastify-http-errors-enhanced)

A error handling plugin for Fastify that uses enhanced HTTP errors.

http://sw.cowtech.it/fastify-http-errors-enhanced

## Installation

Just run:

```bash
npm install fastify-http-errors-enhanced --save
```

## Usage

Register as a plugin, optional providing any of the following options:

- `hideUnhandledErrors`: If to hide unhandled server errors or returning to the client including stack information. Default is to hide errors when `NODE_ENV` environment variable is `production`.
- `convertValidationErrors`: Convert validation errors to a structured human readable object. Default is `true`.
- `convertResponsesValidationErrors`: Convert response validation errors to a structured human readable object. Default is to enable when `NODE_ENV` environment variable is different from `production`.
- `allowUndeclaredResponses`: When converting response validation errors, allow responses that have no schema defined instead of throwing an error.
- `responseValidatorCustomizer`: A function that receives a Ajv instances before compiling all response schemas. This can be used to add custom keywords, formats and so on.

Once registered, the server will use the plugin handlers for all errors (basically, both `setErrorHandler` and `setNotFoundHandler` are called).

The handler response format will compatible with standard fastify error response, which is the following:

```typescript
{
  statusCode: number
  error: string
  message: string
}
```

If the original error's `code` properties does not start with `HTTP_ERROR_` ([http-errors-enhanced](https://github.com/ShogunPanda/http-errors-enhanced) standard error prefix), then the `code` is also included in output object.
In addition, the response headers will contain all headers defined in `error.headers` and the response body will contain all additional enumerable properties of the error.

To clarify, take this server as a example:

```js
import fastify from 'fastify'
import fastifyHttpErrorsEnhanced from 'fastify-http-errors-enhanced'
import { NotFoundError } from 'http-errors-enhanced'

const server = fastify()
server.register(fastifyHttpErrorsEnhanced)

server.get('/invalid', {
  handler: async function (request, reply) {
    throw new NotFoundError('You are not supposed to reach this.', {
      header: { 'X-Req-Id': request.id, id: 123 },
      code: 'UNREACHABLE'
    })
  }
})

server.listen(3000, err => {
  if (err) {
    throw err
  }
})
```

When hitting `/invalid` it will return the following:

```json
{
  "error": "Not Found",
  "code": "UNREACHABLE",
  "message": "You are not supposed to reach this.",
  "statusCode": 404,
  "id": 123
}
```

and the `X-Req-Id` will be set accordingly.

## Unhandled error handling

Once installed the plugin will also manage unhandled server errors.

In particular, if error hiding is enabled, all unhandled errors will return the following response:

```json
{
  "error": "Internal Server Error",
  "message": "An error occurred trying to process your request.",
  "statusCode": 500
}
```

and the error will be logged using `error` severity.

If not hidden, instead, the error will be returned in a standard response that also add the `stack` property (as a array of strings) and any additional error enumerable property.

To clarify, take this server as a example:

```js
import fastify from 'fastify'
import fastifyHttpErrorsEnhanced from 'fastify-http-errors-enhanced'
import { NotFoundError } from 'http-errors-enhanced'
import createError from 'http-errors'

server.register(fastifyHttpErrorsEnhanced, { hideUnhandledErrors: false })

server.get('/invalid', {
  handler(request, reply) {
    const error = new Error('This was not supposed to happen.')
    error.id = 123
    throw error
  }
})

server.listen(3000, err => {
  if (err) {
    throw err
  }
})
```

When hitting `/invalid` it will return the following:

```json
{
  "error": "Internal Server Error",
  "message": "[Error] This was not supposed to happen.",
  "statusCode": 500,
  "id": 123,
  "stack": ["..."]
}
```

## Validation and response validation errors

If enabled, response will have status of 400 or 500 (depending on whether the request or response validation failed) and the the body will have the `failedValidations` property.

Example of a client validation error:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "One or more validations failed trying to process your request.",
  "failedValidations": { "query": { "val": "must match pattern \"ab{2}c\"", "val2": "is not a valid property" } }
}
```

Example of a response validation error:

```json
{
  "error": "Internal Server Error",
  "message": "The response returned from the endpoint violates its specification for the HTTP status 200.",
  "statusCode": 500,
  "failedValidations": {
    "response": {
      "a": "must be a string",
      "b": "must be present",
      "c": "is not a valid property"
    }
  }
}
```

## ESM Only

This package only supports to be directly imported in a ESM context.

For informations on how to use it in a CommonJS context, please check [this page](https://gist.github.com/ShogunPanda/fe98fd23d77cdfb918010dbc42f4504d).

## Contributing to fastify-http-errors-enhanced

- Check out the latest master to make sure the feature hasn't been implemented or the bug hasn't been fixed yet.
- Check out the issue tracker to make sure someone already hasn't requested it and/or contributed it.
- Fork the project.
- Start a feature/bugfix branch.
- Commit and push until you are happy with your contribution.
- Make sure to add tests for it. This is important so I don't break it in a future version unintentionally.

## Copyright

Copyright (C) 2019 and above Shogun (shogun@cowtech.it).

Licensed under the ISC license, which can be found at https://choosealicense.com/licenses/isc.
