"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
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
