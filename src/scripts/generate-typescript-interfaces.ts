import attach from '../../index';
import * as _ from 'lodash';
import * as cp from 'child_process';

import * as rpc from '../nvimRpc';

// Place holders to keep buffer handles separate.
// This seems to be the same idea Neovim does in src/nvim/api/private/defs.h
export type BufferHandle = number;
export type WindowHandle = number;
export type TabpageHandle = number;

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

function getRPCCallback(method: rpc.Method): string {
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


// let proc = cp.spawn('nvim', ['-u', 'NONE', 'N', '--embed'], {
//     cwd: __dirname
// });

// attach(proc.stdin, proc.stdout, function(err, nvim: any) {
//    var interfaces = {
//        Nvim: nvim.constructor,
//        Buffer: nvim.Buffer,
//        Window: nvim.Window,
//        Tabpage: nvim.Tagpage,
//    };

// })