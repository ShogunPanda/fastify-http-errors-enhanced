"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get = require("lodash.get");
function niceJoin(array, lastSeparator = ' and ', separator = ', ') {
    switch (array.length) {
        case 0:
            return '';
        case 1:
            return array[0];
        case 2:
            return array.join(lastSeparator);
        default:
            return array.slice(0, array.length - 1).join(separator) + lastSeparator + array[array.length - 1];
    }
}
exports.niceJoin = niceJoin;
exports.validationMessagesFormatters = {
    minimum: (min) => `must be a number greater than or equal to ${min}`,
    maximum: (max) => `must be a number less than or equal to ${max}`,
    minimumProperties(min) {
        return min === 1 ? 'cannot be a empty object' : `must be a object with at least ${min} properties`;
    },
    maximumProperties(max) {
        return max === 0 ? 'must be a empty object' : `must be a object with at most ${max} properties`;
    },
    minimumItems(min) {
        return min === 1 ? 'cannot be a empty array' : `must be an array with at least ${min} items`;
    },
    maximumItems(max) {
        return max === 0 ? 'must be a empty array' : `must be an array with at most ${max} items`;
    },
    enum: (values) => `must be one of the following values: ${niceJoin(values.map((f) => `"${f}"`), ' or ')}`,
    pattern: (pattern) => `must match pattern "${pattern.replace(/\(\?\:/g, '(')}"`,
    invalidResponseCode: (code) => `This endpoint cannot respond with HTTP status ${code}.`,
    invalidResponse: (code) => `The response returned from the endpoint violates its specification for the HTTP status ${code}.`
};
exports.validationMessages = {
    contentType: 'only JSON payloads are accepted. Please set the "Content-Type" header to start with "application/json"',
    json: 'the body payload is not a valid JSON',
    jsonEmpty: 'the JSON body payload cannot be empty if the "Content-Type" header is set',
    missing: 'must be present',
    unknown: 'is not a valid property',
    emptyObject: 'cannot be a empty object',
    uuid: 'must be a valid GUID (UUID v4)',
    timestamp: 'must be a valid ISO 8601 / RFC 3339 timestamp (example: 2018-07-06T12:34:56Z)',
    date: 'must be a valid ISO 8601 / RFC 3339 date (example: 2018-07-06)',
    time: 'must be a valid ISO 8601 / RFC 3339 time (example: 12:34:56)',
    hostname: 'must be a valid hostname',
    ip: 'must be a valid IPv4 or IPv6',
    ipv4: 'must be a valid IPv4',
    ipv6: 'must be a valid IPv6',
    integer: 'must be a valid integer number',
    number: 'must be a valid number',
    boolean: 'must be a valid boolean (true or false)',
    object: 'must be a object',
    array: 'must be an array',
    string: 'must be a string',
    presentString: 'must be a non empty string'
};
function convertValidationErrors(section, data, validationErrors) {
    const errors = {};
    if (section === 'querystring') {
        section = 'query';
    }
    // For each error
    for (const e of validationErrors) {
        let message = '';
        // Normalize the key
        let key = e.dataPath;
        if (key.startsWith('.')) {
            key = key.substring(1);
        }
        if (key.startsWith('[') && key.endsWith(']')) {
            key = key.substring(1, key.length - 1);
        }
        // Depending on the type
        switch (e.keyword) {
            case 'required':
            case 'dependencies':
                key = e.params.missingProperty;
                message = exports.validationMessages.missing;
                break;
            case 'additionalProperties':
                key = e.params.additionalProperty;
                message = exports.validationMessages.unknown;
                break;
            case 'type':
                message = exports.validationMessages[e.params.type];
                break;
            case 'minProperties':
                message = exports.validationMessagesFormatters.minimumProperties(e.params.limit);
                break;
            case 'maxProperties':
                message = exports.validationMessagesFormatters.maximumProperties(e.params.limit);
                break;
            case 'minItems':
                message = exports.validationMessagesFormatters.minimumItems(e.params.limit);
                break;
            case 'maxItems':
                message = exports.validationMessagesFormatters.maximumItems(e.params.limit);
                break;
            case 'minimum':
                message = exports.validationMessagesFormatters.minimum(e.params.limit);
                break;
            case 'maximum':
                message = exports.validationMessagesFormatters.maximum(e.params.limit);
                break;
            case 'enum':
                message = exports.validationMessagesFormatters.enum(e.params.allowedValues);
                break;
            case 'pattern':
                const pattern = e.params.pattern;
                const value = get(data, key);
                if (pattern === '.+' && !value) {
                    message = exports.validationMessages.presentString;
                }
                else {
                    message = exports.validationMessagesFormatters.pattern(e.params.pattern);
                }
                break;
            case 'format':
                let reason = e.params.format;
                // Normalize the key
                if (reason === 'date-time') {
                    reason = 'timestamp';
                }
                message = exports.validationMessagesFormatters[reason]
                    ? exports.validationMessagesFormatters[reason](reason)
                    : exports.validationMessages[reason];
                break;
        }
        // No custom message was found, default to input one replacing the starting verb and adding some path info
        if (!message) {
            message = `${e.message.replace(/^should/, 'must')} (${e.keyword})`;
        }
        // Find the property to add
        let property = key
            .replace(/\[(\d+)\]/g, '.$1') // Array path
            .replace(/\[([^\]]+)\]/g, '.$1'); // Object path
        if (!property) {
            property = '$root';
        }
        if (property.match(/(?:^['"])(?:[^\.]+)(?:['"]$)/)) {
            property = property.substring(1, property.length - 1);
        }
        errors[property] = message;
    }
    return { [section]: errors };
}
exports.convertValidationErrors = convertValidationErrors;
