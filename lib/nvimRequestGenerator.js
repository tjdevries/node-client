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
function getCallArgs(types, methodName, functionTypeName, args) {
    var typeArgs = { name: methodName, type: '', args: '', params: '' };
    if (functionTypeName in ['Nvim', 'Vim', 'Ui']) {
        typeArgs.type = types['Nvim'];
        typeArgs.args = args.join(', ');
    }
    else {
        typeArgs.type = types[functionTypeName];
        // Substitute the buffer argument for `this`
        typeArgs.args = ['this'].concat(args.slice(1)).join(', ');
    }
    typeArgs.params = args.concat(['cb']).join(', ');
    return typeArgs;
}
function generateMethods(method, items) {
    var _this = this;
    var myArgs = ['this', 'that'];
    var methodConstructor = function (cb) {
        if (!cb) {
            _this._session.notify(method.name, items.args);
            return;
        }
        _this._session.request(method.name, items.args, function (err, res) {
            if (err) {
                return cb(new Error(err[1]));
            }
            cb(null, _this._decode(res));
        });
    };
}
// TODO: type for session
function getRegisteredType(session, type, id) {
    return {
        constructor: type,
        code: id,
        decode: function (data) { return new type(session, data, rpc.decode); },
        encode: function (obj) { return obj._data; },
    };
}
function getMetadataType(type) {
    return {};
}
function generateWrappers(nvim, metadata) {
    var session = {};
    var min_version = metadata.version.api_compatible;
    var max_version = metadata.version.api_level;
    // TODO: Types
    var types = {};
    var extTypes = [];
    for (var typeKey in metadata.types) {
        var typeFunction = generateTypeFunction(typeKey);
        extTypes.push(getRegisteredType(session, typeFunction, metadata.types[typeKey].id));
        types[typeKey] = typeFunction;
    }
    for (var _i = 0, _a = metadata.functions; _i < _a.length; _i++) {
        var func = _a[_i];
        // If it's not a support function, then skip it
        if (func.deprecatedSince && func.deprecatedSince < min_version) {
            continue;
        }
        var parts = func.name.split('_');
        var functionTypeName = _.capitalize(parts[0]);
        // Not sure why they have a `slice` item.
        var camelCaseName = _.camelCase(parts.join('_'));
        var functionTypeArgs = getCallArgs(metadata.types, camelCaseName, functionTypeName, func.parameters.map(function (param) { return param[1]; }));
        var method = generateMethods(func, functionTypeArgs);
        console.log(functionTypeArgs);
    }
}
exports.generateWrappers = generateWrappers;
