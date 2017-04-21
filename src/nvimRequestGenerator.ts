import * as rpc from './nvimRpc';

import * as _ from 'lodash';
var Session = require('msgpack5rpc');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

let nvimRpcTypes: rpc.Type[];

// TODO: This should be a class?
function Nvim(session, channel_id: number) {
    this._session = session;
    this._decode = rpc.decode;
    this._channel_id = channel_id;
}
util.inherits(Nvim, EventEmitter);  

function generateTypeFunction(name: string) {
    let type: {[typeName: string]: rpc.SessionType} = new Object();
    type[name] = (session, data, decode) => {
        this._session = session;
        this._data = data;
        this._decode = decode;
    }

    // Eventually switch to: type.prototype.equals
    let equals = function equals(other: rpc.SessionType): boolean {
        try {
            return this._data.toString() === other._data.toString();
        } catch (e) {
            return false;
        }
    }

    return type;
}

interface MethodItems {
    name: string;
    type: string;
    args: string;
    params: string;
}

function getCallArgs(types: Object, methodName: string, functionTypeName: string, args: string[]): MethodItems {
    let typeArgs: MethodItems = {name: methodName, type: '', args: '', params: ''};

    if (functionTypeName in ['Nvim', 'Vim', 'Ui']) {
        typeArgs.type = types['Nvim'];
        typeArgs.args = args.join(', ');
    } else {
        typeArgs.type = types[functionTypeName];
        // Substitute the buffer argument for `this`
        typeArgs.args = ['this'].concat(args.slice(1)).join(', ');
    }

    typeArgs.params = args.concat(['cb']).join(', ');

    return typeArgs;
}

function generateMethods(method: rpc.Method, items: MethodItems) {
    let myArgs: string[] = ['this', 'that'];
    let methodConstructor = (cb: (a: Error | null, b?: any) => any) => {
        if (!cb) {
            this._session.notify(method.name, items.args);
            return;
        }

        this._session.request(method.name, items.args, (err: Error, res) => {
            if (err) { return cb(new Error(err[1])); }
            cb(null, this._decode(res));
        });
    }
}

// TODO: type for session
function getRegisteredType(session: any, type: rpc.SessionType, id: number): rpc.RegisteredType {
    return {
        constructor: type,
        code: id,
        decode: function(data) { return new type(session, data, rpc.decode); },
        encode: function(obj) { return obj._data; },
    }
}

function getMetadataType(type: rpc.Type): any {
    return {};
}

export function generateWrappers(nvim: any, metadata: rpc.Metadata): void {
    let session = {};
    let min_version: number = metadata.version.api_compatible;
    let max_version: number = metadata.version.api_level;

    // TODO: Types
    let types = {};
    let extTypes: rpc.RegisteredType[] = [];

    for (let typeKey in metadata.types) {
        let typeFunction = generateTypeFunction(typeKey);

        extTypes.push(getRegisteredType(
            session,
            typeFunction,
            metadata.types[typeKey].id
        ));

        types[typeKey] = typeFunction;
    }

    for (let func of metadata.functions) {
        // If it's not a support function, then skip it
        if (func.deprecatedSince && func.deprecatedSince < min_version) {
            continue;
        }

        let parts: string[] = func.name.split('_');
        let functionTypeName: string = _.capitalize(parts[0]);

        // Not sure why they have a `slice` item.
        let camelCaseName: string = _.camelCase(parts.join('_'));

        let functionTypeArgs: MethodItems = getCallArgs(
            metadata.types,
            camelCaseName,
            functionTypeName,
            func.parameters.map(function(param: rpc.Parameter) { return param[1]; })
        );

        let method = generateMethods(func, functionTypeArgs);

        console.log(functionTypeArgs);

    }
}