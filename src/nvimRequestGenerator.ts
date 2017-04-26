import * as rpc from './nvimRpc';

import * as _ from 'lodash';
var Session = require('msgpack5rpc');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * MethodItems
 * 
 * Used to store the information requred to turn a neovim api method
 * into a typescript declaration
 */
interface MethodItems {
    name: string;
    type: any;
    args: string[];
    params: string[];
}

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

/**
 * @param NvimType 
 * @param types 
 * @param methodName 
 * @param functionTypeName 
 * @param args 
 * 
 * @returns The method items to describe a method
 */
function getMethodItems(NvimType, types: Object, methodName: string, functionTypeName: string, args: string[]): MethodItems {
    let typeArgs: MethodItems = {name: methodName, type: '', args: [], params: []};

    if (functionTypeName in ['Nvim', 'Vim', 'Ui']) {
        typeArgs.type = NvimType;
        typeArgs.args = args;
    } else {
        typeArgs.type = types[functionTypeName];
        // Substitute the buffer argument for `this`
        typeArgs.args = ['this'].concat(args.slice(1));
    }

    typeArgs.params = args.concat(['cb']);

    return typeArgs;
}

function generateMethods(method: rpc.Method, items: MethodItems) {
    // TODO: Move to this much nicer method constructor way
    class  methodConstructor {

        public _decode(res: any) {
            return rpc.decode(res);
        }

        public _session: {
            notify: (name, args) => any;
            request: (name, args, err_cb) => any;
        }

        public static metadata = {
            name: method.name,
            // Not sure where this came from
            // deferred: method.deferred,
            returnType: method.returnType,
            // parameters: items.args.concat(['cb']),
            // parameterTypes

        }
        
        constructor(cb?: (a: Error | null, b?: any) => any)  {
            if (!cb) {
                this._session.notify(method.name, items.args);
                return;
            }

            this._session.request(method.name, items.args, (err: Error, res) => {
                if (err) { return cb(new Error(err[1])); }
                cb(null, this._decode(res));
            })
        }

        public toString() {
            return 'this functoin i wrote';
        }
    }

    // return new methodConstructor();

    var result = new Function(
      'return function ' + items.name + '(' + items.params.join(', ') + ') {' +
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
      '\n};'
    )();
    // TODO: Clean up the metadata
    result.metadata = {
      name: items.name,
      // deferred: func.deferred,
      returnType: method.returnType,
      parameters: items.args.concat(['cb']),
      parameterTypes: method.parameters.map(function(p) { return p[0]; }),
      // canFail: method.can_fail,
    }
    if (items.name === 'Nvim') {
      result.metadata.parameterTypes.shift();
    }

    return result;
}

// TODO: specify the type for the registered type
function getRegisteredType(session: rpc.SessionType, type: rpc.SessionType, id: number): rpc.RegisteredType<any> {
    return {
        type: id,
        constructor: type,
        decode: function(data) { return new type(session, data, rpc.decode); },
        encode: function(obj) { return obj._data; },
    }
}

function getMetadataType(type: rpc.Type): any {
    return {};
}

// TODO: nvim declaration
// TODO: types declaration
export function generateWrappers(NvimType, types, metadata: rpc.Metadata): void {
    if (typeof metadata.version === 'undefined') {
        return;
    }

    let min_version: number = metadata.version.api_compatible;
    let max_version: number = metadata.version.api_level;

    for (let func of metadata.functions) {
        // If it's not a supported function, then skip it
        if (func.deprecatedSince && func.deprecatedSince < min_version) {
            continue;
        }

        let parts: string[] = func.name.split('_');
        let functionTypeName: string = _.capitalize(parts[0]);

        // Not sure why they have a `slice` item.
        let camelCaseName: string = _.camelCase(parts.join('_'));

        let functionTypeArgs: MethodItems = getMethodItems(
            NvimType,
            metadata.types,
            camelCaseName,
            functionTypeName,
            func.parameters.map(function(param: rpc.Parameter) { return param[1]; })
        );

        let method = generateMethods(func, functionTypeArgs);

        types[functionTypeArgs.name] = method;

        console.log(functionTypeArgs);
        console.log(method)

    }
}

var paramTypeMap: { [otherProperties: string]: string } = {
    'String': 'string',
    'Integer': 'number',
    'Boolean': 'boolean',
    'Array': 'Array<any>',
    'Dictionary': 'Object',
    'Buffer': 'BufferHandle',
    'Window': 'WindowHandle',
    'Tabpage': 'TabpageHandle',
};

var returnTypeMap: { [otherProperties: string]: string } = {
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
export function convertType(type: string, isReturnType: boolean): string {
    // We return different types if it's a return type as compared to a parameter
    let typeMap = isReturnType ? returnTypeMap : paramTypeMap;

    // Return the value if it's within our mapping
    if (typeMap[type]) { return typeMap[type]; }

    // [1]: The type value
    // [2: optional]: The specified length
    let genericMatch: RegExpExecArray | null = /Of\((\w+),?\s*(\d)?\)/.exec(type);

    if (genericMatch) {
        let t: string = convertType(genericMatch[1], isReturnType);
        let specifiedLength: number = parseInt(genericMatch[2]);

        if (/^Array/.test(type)) {
            if (specifiedLength) {
                // Create an array of:
                // [t, t, t, ...]
                // So the length is kept
                return '[' + _.fill(Array(specifiedLength), t).join(', ') + ']';
            } else {
                // Just return an array:
                // t[]
                return t + '[]';
            }

        } else {
            // I'm not sure where this should happen.
            return '{ [key: string]: ' + t + '; }';
        }
    }
    return type;
}

export function getRPCCallback(method: rpc.Method): string {
    let type: string;
    type = '(err: Error';
    let rtype: string = convertType(method.returnType, true);
    if (rtype === 'void') {
        type += ') => void;';
    } else {
        type += ', res: ' + rtype + ') => void';
    }

    return type
}

export function RPCMethodToSignature(method: rpc.Method): string {
    // TODO: Determine if we should do that here or elsewhere.
    // Maybe we should do it before we call this code.
    // if (!method.method) { return ''; }
    // if (method.deprecatedSince) { return ''; }

    let params: string[] = [];

    // Handle all but the last item
    for (let index = 0; index < method.parameters.length - 1; index++) {
        let type: string = convertType(method.parameters[index][0], false);
        params.push(method.parameters[index][0] + ': ' + type);
    }

    // The last item will be a callback
    // In the case of zero arguments, we should check that here
    params.push(getRPCCallback(method));

    return '  ' + method.name + '(' + params.join(', ') + '): void;\n';
}