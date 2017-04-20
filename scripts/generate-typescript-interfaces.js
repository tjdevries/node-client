"use strict";
exports.__esModule = true;
var _ = require("lodash");
var typeMap = {
    'String': 'string',
    'Integer': 'number',
    'Boolean': 'boolean',
    'Array': 'Array<any>',
    'Dictionary': '{}'
};
/**
 * Convert the mspack RPC type to a Typescript Type
 * @param type The type specified by the request
 */
function convertType(type) {
    if (typeMap[type])
        return typeMap[type];
    var genericMatch = /Of\((\w+),?\s*(\d)?\)/.exec(type);
    if (genericMatch) {
        var t = convertType(genericMatch[1]);
        var specifiedLength = parseInt(genericMatch[2]);
        if (/^Array/.test(type)) {
            if (specifiedLength) {
                // Create an array of:
                // [t, t, t, ...]
                // So the length is kept
                return '[' + _.fill(Array(specifiedLength), t).join(', ') + ']';
            }
            else {
                // Just return an array:
                // t[]
                return t + '[]';
            }
        }
        else {
            return '{ [key: string]: ' + t + '; }';
        }
    }
    return type;
}
exports.convertType = convertType;
function RPCMethodToSignature(method) {
    if (!method.method) {
        return '';
    }
    if (method.deprecatedSince) {
        return '';
    }
    var params = [];
    for (var index = 0; index < method.parameters.length; index++) {
        var type = void 0;
        if (index < method.parameters.length) {
            type = convertType(method.parameters[index].type);
        }
        else {
            type = '(err: Error';
            var rtype = convertType(method.parameters[index].type);
            if (rtype === 'void') {
                type += ') => void;';
            }
            else {
                type += ', res: ' + rtype + ') => void';
            }
        }
        params.push(method.parameters[index].name + ': ' + type);
    }
    return '  ' + method.name;
}
