import attach from '../index';
import * as _ from 'lodash';

interface RPCParamter {
    type: string;
    name: string;
}

interface RPCMethod {
    method: boolean;
    name: string;
    returnType: string;
    parameters: RPCParamter[];
    since: number;
    deprecatedSince?: boolean;
}


var typeMap: {[otherProperties: string]: string} = {
  'String': 'string',
  'Integer': 'number',
  'Boolean': 'boolean',
  'Array': 'Array<any>',
  'Dictionary': '{}',
};

/**
 * Convert the mspack RPC type to a Typescript Type
 * @param type The type specified by the request
 */
export function convertType(type: string): string {
    if(typeMap[type]) return typeMap[type];

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
            return '{ [key: string]: ' + t + '; }';
        }
    }
    return type;
}

function RPCMethodToSignature(method: RPCMethod): string {
    if (!method.method) { return ''; }
    if (method.deprecatedSince) { return ''; }

    let params: string[] = [];

    for (let index = 0; index < method.parameters.length; index++) {
        let type: string;

        if (index < method.parameters.length) {
            type = convertType(method.parameters[index].type);
        } else {
            type = '(err: Error';
            let rtype: string = convertType(method.parameters[index].type);
            if (rtype === 'void') {
                type += ') => void;';
            } else {
                type += ', res: ' + rtype + ') => void';
            }
        }

        params.push(method.parameters[index].name + ': ' + type);
    }
    return '  ' + method.name;
}