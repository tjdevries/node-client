"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var rpc = require("./nvimRpc");
var _ = require("lodash");
var Session = require('msgpack5rpc');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var nvimRpcTypes;
// TODO: This should be a class?
function Nvim(session, channel_id) {
    this._session = session;
    this._decode = rpc.decode;
    this._channel_id = channel_id;
}
util.inherits(Nvim, EventEmitter);
function generateTypeFunction(name) {
    var _this = this;
    var type = new Object();
    type[name] = function (session, data, decode) {
        _this._session = session;
        _this._data = data;
        _this._decode = decode;
    };
    // Eventually switch to: type.prototype.equals
    var equals = function equals(other) {
        try {
            return this._data.toString() === other._data.toString();
        }
        catch (e) {
            return false;
        }
    };
    return type;
}
function getCallArgs(NvimType, types, methodName, functionTypeName, args) {
    var typeArgs = { name: methodName, type: '', args: [], params: [] };
    if (functionTypeName in ['Nvim', 'Vim', 'Ui']) {
        typeArgs.type = NvimType;
        typeArgs.args = args;
    }
    else {
        typeArgs.type = types[functionTypeName];
        // Substitute the buffer argument for `this`
        typeArgs.args = ['this'].concat(args.slice(1));
    }
    typeArgs.params = args.concat(['cb']);
    return typeArgs;
}
function generateMethods(method, items) {
    // TODO: Move to this much nicer method constructor way
    var methodConstructor = (function () {
        function methodConstructor(cb) {
            var _this = this;
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
    result.metadata = {
        name: items.name,
        // deferred: func.deferred,
        returnType: method.returnType,
        parameters: items.args.concat(['cb']),
        parameterTypes: method.parameters.map(function (p) { return p[0]; }),
    };
    if (items.name === 'Nvim') {
        result.metadata.parameterTypes.shift();
    }
    return result;
}
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
        var parts = func.name.split('_');
        var functionTypeName = _.capitalize(parts[0]);
        // Not sure why they have a `slice` item.
        var camelCaseName = _.camelCase(parts.join('_'));
        var functionTypeArgs = getCallArgs(NvimType, metadata.types, camelCaseName, functionTypeName, func.parameters.map(function (param) { return param[1]; }));
        var method = generateMethods(func, functionTypeArgs);
        types[functionTypeArgs.name] = method;
        console.log(functionTypeArgs);
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
