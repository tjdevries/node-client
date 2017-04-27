"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var rpc = require("./nvimRpc");
var _ = require("lodash");
var Session = require('msgpack5rpc');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
function generateTypeFunction(name) {
    var _this = this;
    var type = new Object();
    type[name] = function (session, data, decode) {
        _this._session = session;
        _this._data = data;
        _this._decode = decode;
    };
    var equals = rpc.equals;
    return type;
}
var params_to_args = function (param) {
    return { name: param[0], type: param[1] };
};
function getFunctionSignatureCallback(func) {
    var anyFunctionSignature = '(...any) => any';
    var returnType = convertType(func.returnType, true);
    if (returnType === 'void') {
        return '(err: Error) => void) => void';
    }
    else {
        return '(err: Error, res: ' + returnType + ') => void';
    }
}
exports.getFunctionSignatureCallback = getFunctionSignatureCallback;
/**
 * @param NvimType
 * @param types
 * @param methodName
 * @param functionTypeName
 * @param args
 *
 * @returns The method items to describe a method
 */
function getMethodItems(func, func_type, types) {
    var parts = func.name.split('_');
    var replace_name;
    var typeArgs = {
        name: func.name,
        typescriptName: '',
        // Always void, because we use callbacks
        // Could be configured it we wanted to use promises
        returnType: 'void',
        type: undefined,
        typeName: '',
        args: [],
        params: []
    };
    if (func_type in ['Nvim', 'Vim', 'Ui']) {
        typeArgs.typeName = 'Nvim';
    }
    else {
        typeArgs.typeName = func_type;
    }
    // If this function doesn't match the right style,
    // then return null
    if (!func.name.match('^' + types[typeArgs.typeName].prefix)) {
        return null;
    }
    if (['Nvim', 'Vim', 'Ui'].indexOf(func_type) >= 0) {
        // TODO: Fix this to be the object?
        typeArgs.args = func.parameters.map(params_to_args);
        replace_name = func.name.replace('nvim_', '');
    }
    else {
        // Substitute the buffer argument for `this.handle`
        // TODO: Make sure that the item has '.handle'
        // TODO: More descriptive function signature?
        typeArgs.args = func.parameters.slice(1).map(params_to_args);
        replace_name = func.name.replace(types[typeArgs.typeName].prefix, '');
    }
    typeArgs.type = types[typeArgs.typeName];
    typeArgs.typescriptName = _.camelCase(replace_name);
    // TODO: More descriptive function signature?
    typeArgs.params = typeArgs.args.concat([{ name: 'cb', type: getFunctionSignatureCallback(func) }]);
    return typeArgs;
}
exports.getMethodItems = getMethodItems;
function generateMethods(method, method_type, types) {
    var items = getMethodItems(method, method_type, types);
    if (items === null) {
        return;
    }
    else {
        // TODO: Move to this much nicer method constructor way
        var methodConstructor = (function () {
            function methodConstructor(cb) {
                var _this = this;
                if (items === null) {
                    return;
                }
                if (!cb) {
                    this._session.notify(method.name, items.args);
                    return;
                }
                this._session.request(method.name, items.args, function (err, res) {
                    if (err) {
                        return cb(new Error(err[1]));
                    }
                    cb(null, _this._decode(res));
                });
            }
            methodConstructor.prototype._decode = function (res) {
                return rpc.decode(res);
            };
            methodConstructor.prototype.toString = function () {
                return 'this functoin i wrote';
            };
            return methodConstructor;
        }());
        methodConstructor.metadata = {
            name: method.name,
            // Not sure where this came from
            // deferred: method.deferred,
            returnType: method.returnType,
        };
    }
    // return new methodConstructor();
    var result = new Function('return function ' + items.name + '(' + items.params.join(', ') + ') {' +
        '\n  if (!cb) {' +
        '\n    this._session.notify("' + method.name + '", [' + items.args.join(', ') + ']);' +
        '\n    return;' +
        '\n  }' +
        '\n  var _this = this;' +
        '\n  this._session.request("' + method.name +
        '", [' + items.args.join(', ') + '], function(err, res) {' +
        '\n     if (err) return cb(new Error(err[1]));' +
        '\n     cb(null, _this._decode(res));' +
        '\n   });' +
        '\n};')();
    // TODO: Clean up the metadata
    result.metadata = items;
    if (items.name === 'Nvim') {
        result.metadata.parameterTypes.shift();
    }
    return result;
}
function methodItemsToSignature(items) {
    var signatureArgument = [];
    for (var i = 0; i < items.params.length; i++) {
        signatureArgument.push(items.params[i].name
            + ': '
            + convertType(items.params[i].type, false));
    }
    return '  ' + items.typescriptName
        + '(' + signatureArgument.join(', ')
        + '): ' + convertType(items.returnType, true) + ';\n';
}
exports.methodItemsToSignature = methodItemsToSignature;
// TODO: specify the type for the registered type
function getRegisteredType(session, type, id) {
    return {
        type: id,
        constructor: type,
        decode: function (data) { return new type(session, data, rpc.decode); },
        encode: function (obj) { return obj._data; },
    };
}
function getMetadataType(type) {
    return {};
}
// TODO: nvim declaration
// TODO: types declaration
function generateWrappers(NvimType, types, metadata) {
    if (typeof metadata.version === 'undefined') {
        return;
    }
    var min_version = metadata.version.api_compatible;
    var max_version = metadata.version.api_level;
    for (var _i = 0, _a = metadata.functions; _i < _a.length; _i++) {
        var func = _a[_i];
        // If it's not a supported function, then skip it
        if (func.deprecatedSince && func.deprecatedSince < min_version) {
            continue;
        }
        var method = generateMethods(func, NvimType, metadata.types);
        // Get the name from method
        // types[functionTypeArgs.name] = method;
        console.log(method);
    }
}
exports.generateWrappers = generateWrappers;
var paramTypeMap = {
    'String': 'string',
    'Integer': 'number',
    'Boolean': 'boolean',
    'Array': 'Array<any>',
    'Dictionary': 'Object',
    'Buffer': 'BufferHandle',
    'Window': 'WindowHandle',
    'Tabpage': 'TabpageHandle',
};
var returnTypeMap = {
    'String': 'string',
    'Integer': 'number',
    'Boolean': 'boolean',
    'Array': 'Array<any>',
    'Dictionary': 'Object',
};
/**
 * Convert the mspack RPC type to a Typescript Type
 * @param type  The type specified by the request
 * @param isReturnType  Whether the type being converted is a return type or not
 */
function convertType(type, isReturnType) {
    // We return different types if it's a return type as compared to a parameter
    var typeMap = isReturnType ? returnTypeMap : paramTypeMap;
    // Return the value if it's within our mapping
    if (typeMap[type]) {
        return typeMap[type];
    }
    // [1]: The type value
    // [2: optional]: The specified length
    var genericMatch = /Of\((\w+),?\s*(\d)?\)/.exec(type);
    if (genericMatch) {
        var t = convertType(genericMatch[1], isReturnType);
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
            // I'm not sure where this should happen.
            return '{ [key: string]: ' + t + '; }';
        }
    }
    return type;
}
exports.convertType = convertType;
function getRPCCallback(method) {
    var type;
    type = '(err: Error';
    var rtype = convertType(method.returnType, true);
    if (rtype === 'void') {
        type += ') => void;';
    }
    else {
        type += ', res: ' + rtype + ') => void';
    }
    return type;
}
exports.getRPCCallback = getRPCCallback;
function RPCMethodToSignature(method) {
    // TODO: Determine if we should do that here or elsewhere.
    // Maybe we should do it before we call this code.
    // if (!method.method) { return ''; }
    // if (method.deprecatedSince) { return ''; }
    var params = [];
    // Handle all but the last item
    for (var index = 0; index < method.parameters.length - 1; index++) {
        var type = convertType(method.parameters[index][0], false);
        params.push(method.parameters[index][0] + ': ' + type);
    }
    // The last item will be a callback
    // In the case of zero arguments, we should check that here
    params.push(getRPCCallback(method));
    return '  ' + method.name + '(' + params.join(', ') + '): void;\n';
}
exports.RPCMethodToSignature = RPCMethodToSignature;
