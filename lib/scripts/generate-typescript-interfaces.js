"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../../index");
var _ = require("lodash");
var cp = require("child_process");
var proc = cp.spawn('nvim', ['-u', 'NONE', 'N', '--embed'], {
    cwd: __dirname
});
var typeMap = {
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
function convertType(type) {
    if (typeMap[type])
        return typeMap[type];
    var genericMatch = /Of\((\w+),?\s*(\d)?\)/.exec(type);
    if (genericMatch) {
        var t = convertType(genericMatch[1]);
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
    var rtype = convertType(method.returnType);
    if (rtype === 'void') {
        type += ') => void;';
    }
    else {
        type += ', res: ' + rtype + ') => void';
    }
    return type;
}
function RPCMethodToSignature(method) {
    if (!method.method) {
        return '';
    }
    if (method.deprecatedSince) {
        return '';
    }
    var params = [];
    // Handle all but the last item
    for (var index = 0; index < method.parameters.length - 1; index++) {
        var type = convertType(method.parameters[index].type);
        params.push(method.parameters[index].name + ': ' + type);
    }
    // The last item will be a callback
    // In the case of zero arguments, we should check that here
    params.push(getRPCCallback(method));
    return '  ' + method.name + '(' + params.join(', ') + '): void;\n';
}
exports.RPCMethodToSignature = RPCMethodToSignature;
index_1.default(proc.stdin, proc.stdout, function (err, nvim) {
    var interfaces = {
        Nvim: nvim.constructor,
        Buffer: nvim.Buffer,
        Window: nvim.Window,
        Tabpage: nvim.Tagpage,
    };
});
