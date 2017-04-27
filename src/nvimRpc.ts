var Session = require('msgpack5rpc');
var traverse = require('traverse');

import msgpack5 from 'msgpack5';
import * as util from 'util';
import { EventEmitter } from 'events';
import * as stream from 'stream';


// Place holders to keep buffer handles separate.
// This seems to be the same idea Neovim does in src/nvim/api/private/defs.h
export type BufferHandle = number;
export type WindowHandle = number;
export type TabpageHandle = number;

export function GetHandleStrings(): string[] {
    return [
        'export type BufferHandle = number;',
        'export type WindowHandle = number;',
        'export type TabpageHandle = number;',
    ]
}

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

export interface RegisteredType<T> {
    type: number;
    constructor: () => any;
    // new Type(s, d, d)
    decode: (data) => T;
    // obj._data
    encode: (obj: T) => Buffer;
}

export function decode(obj) {
    traverse(obj).forEach(function(item) {
        if (item instanceof Session) {
            this.update(item, true);
        } else if (Buffer.isBuffer(item)) {
            try { this.update(item.toString('utf8')); } catch(e) {}
        }
    });

    return obj
}

export function equals(other) {
    try {
        return this._data.toString() === other._data.toString();
    } catch (e) {
        return false;
    }
};

export interface RequestSignature {
    (method, args, cb): void;
}

export interface NotifySignature {
    (method, args): void;
}

export interface DetachSignature {
    (): void;
}

// Really the msgpack5rpc Session, but not ts'd originally
export interface RPCSession extends EventEmitter {
    _msgpack: msgpack5.MessagePack;

    addTypes: (types) => void;
    attach: (writer: stream.Writable, reader: stream.Readable) => void;
    detach: () => void;
    request: RequestSignature;
    notify: NotifySignature;
}

export class RPCClass extends EventEmitter {
    public _session: RPCSession;
    public _decode: (buf: Buffer) => any = decode;
    public _channel_id: number;

    constructor(session: RPCSession, channel_id: number) {
        super();

        this._session = session;
        this._channel_id = channel_id;
    }
}