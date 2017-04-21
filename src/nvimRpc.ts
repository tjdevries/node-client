var Session = require('msgpack5rpc');
var traverse = require('traverse');

export interface Version {
    api_compatible: number;
    api_level: number;
    api_prerelease: boolean;
    major: number;
    minor: number;
    patch: number;
}

// export type Parameter = [string, string];
export interface Parameter {
    0: string,
    1: string
}

// Can't seem to find a way to get 'name' and 'type' to stay
// export class Parameter {
//     public name: string;
//     public type: string;

//     private items: string[];

//     constructor(items: string[]) {
//         this.items = items;
//         this.name = this.items[0];
//         this.type  = this.items[1];
//     }
// }

export interface Method {
    method: boolean;
    name: string;
    returnType: string;
    parameters: Parameter[];
    since: number;
    deprecatedSince?: number;
}

export interface Type {
    id: number;
    prefix: string;
}

// TODO: Determine what this pendingRPC message would look like.
export interface Message {
    type: 'request' | 'notification';
    args: any[];
}

export interface ErrorType {
    id: number;
}

export interface Metadata {
    version: Version;
    types: {[key: string]: Type};
    functions: Method[];
    error_types: {[key: string]: ErrorType};
}

// TODO: Figure out how to annotate this type
// export interface SessionType extends Object;
export type SessionType = any;

export interface RegisteredType {
    constructor: () => any;
    code: number;
    // new Type(s, d, d)
    decode: (data) => SessionType;
    // obj._data
    encode: (obj) => any;
}

export function decode(obj) {
    traverse(obj).forEach(function(item) {
        if (item instanceof Session) {
            this.update(item, true);
        } else if (Buffer.isBuffer(item)) {
            try { this.update(item.toString('utf8')); } catch(e) {}
        }
    });
}