import attach from '../../index';
import * as _ from 'lodash';
import * as cp from 'child_process';

import * as rpc from '../nvimRpc';

let proc = cp.spawn('nvim', ['-u', 'NONE', 'N', '--embed'], {
    cwd: __dirname
});

var typeMap: { [otherProperties: string]: string } = {
    'String': 'string',
    'Integer': 'number',
    'Boolean': 'boolean',
    'Array': 'Array<any>',
    'Dictionary': 'Object',
};

/**
 * Convert the mspack RPC type to a Typescript Type
 * @param type The type specified by the request
 */
export function convertType(type: string): string {
    if (typeMap[type]) return typeMap[type];

    let genericMatch: RegExpExecArray | null = /Of\((\w+),?\s*(\d)?\)/.exec(type);

    if (genericMatch) {
        let t: string = convertType(genericMatch[1]);
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
    let rtype: string = convertType(method.returnType);
    if (rtype === 'void') {
        type += ') => void;';
    } else {
        type += ', res: ' + rtype + ') => void';
    }

    return type
}

export function RPCMethodToSignature(method: rpc.Method): string {
    if (!method.method) { return ''; }
    if (method.deprecatedSince) { return ''; }

    let params: string[] = [];

    // Handle all but the last item
    for (let index = 0; index < method.parameters.length - 1; index++) {
        let type: string = convertType(method.parameters[index].type);
        params.push(method.parameters[index].name + ': ' + type);
    }

    // The last item will be a callback
    // In the case of zero arguments, we should check that here
    params.push(getRPCCallback(method));

    return '  ' + method.name + '(' + params.join(', ') + '): void;\n';
}

attach(proc.stdin, proc.stdout, function(err, nvim: any) {
   var interfaces = {
       Nvim: nvim.constructor,
       Buffer: nvim.Buffer,
       Window: nvim.Window,
       Tabpage: nvim.Tagpage,
   };

})