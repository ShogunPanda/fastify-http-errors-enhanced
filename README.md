# fastify-errors-properties

[![Package Version](https://img.shields.io/npm/v/fastify-errors-properties.svg)](https://npm.im/fastify-errors-properties)
[![Dependency Status](https://img.shields.io/david/ShogunPanda/fastify-errors-properties)](https://david-dm.org/ShogunPanda/fastify-errors-properties)
[![Build](https://github.com/ShogunPanda/fastify-errors-properties/workflows/CI/badge.svg)](https://github.com/ShogunPanda/fastify-errors-properties/actions?query=workflow%3ACI)
[![Code Coverage](https://img.shields.io/codecov/c/gh/ShogunPanda/fastify-errors-properties?token=d0ae1643f35c4c4f9714a357f796d05d)](https://codecov.io/gh/ShogunPanda/fastify-errors-properties)

A error handling plugin for Fastify that enables additional properties in errors.

http://sw.cowtech.it/fastify-errors-properties

## Installation

Just run:

```bash
npm install fastify-errors-properties --save
```

## Usage

Register as a plugin, optional providing any of the following options:

- `hideUnhandledErrors`: If to hide unhandled server errors or returning to the client including stack information. Default is to hide errors when `NODE_ENV` environment variable is `production`.
- `convertValidationErrors`: Convert validation errors to a structured human readable object. Default is `true`.
- `convertResponsesValidationErrors`: Convert response validation errors to a structured human readable object. Default is to enable when `NODE_ENV` environment variable is different from `production`.

Once registered, the server will use the plugin handlers for all errors (basically, both `setErrorHandler` and `setNotFoundHandler` are called).

The handler response format will compatible with standard fastify error response, which is the following:

```typescript
{
  statusCode: number
  code?: string
  error: string
  message: string
}
```

In addition, the response headers will contain all headers defined in `error.headers` and the response body will contain all additional enumerable properties of the error.

To clarify, take this server as a example:

```js
const server = require('fastify')()
const createError = require('http-errors')

server.register(require('fastify-errors-properties'))

server.get('/invalid', {
  handler: function(request, reply) {
    throw createError(404, 'You are not supposed to reach this.', { header: { 'X-Req-Id': request.id, id: 123 } })
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
const server = require('fastify')()
const createError = require('http-errors')

server.register(require('fastify-errors-properties'), { hideUnhandledErrors: false })

server.get('/invalid', {
  handler: function(request, reply) {
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

## Contributing to fastify-errors-properties

- Check out the latest master to make sure the feature hasn't been implemented or the bug hasn't been fixed yet.
- Check out the issue tracker to make sure someone already hasn't requested it and/or contributed it.
- Fork the project.
- Start a feature/bugfix branch.
- Commit and push until you are happy with your contribution.
- Make sure to add tests for it. This is important so I don't break it in a future version unintentionally.

## Copyright

Copyright (C) 2019 and above Shogun (shogun@cowtech.it).

Licensed under the ISC license, which can be found at https://choosealicense.com/licenses/isc.
