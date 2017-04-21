import { convertType, RPCMethodToSignature } from '../scripts/generate-typescript-interfaces';
import * as rpc from '../nvimRpc';

let assert = require('assert');

describe('Generator', () => {
    describe('convertType', () => {
        it('should parse basic types', () => {
            assert(convertType('String') === 'string');
        });

        it('should convert ArrayOf types', () => {
            assert(convertType('ArrayOf(String)') === 'string[]');
            assert(convertType('ArrayOf(Integer)') === 'number[]');
        });

        it('should convert complicated ArrayOf types', () => {
            assert(convertType('ArrayOf(Integer, 2)') === '[number, number]');
        });
    });

    describe('RPCMethodToSignature', () => {
        it('should convert simple RPC methods', () => {
            let method: rpc.Method = {
                method: true,
                name: 'methodName',
                returnType: 'Integer',
                parameters: [],
                since: 1,
            }

            assert(
                '  methodName((err: Error, res: number) => void): void;\n' === RPCMethodToSignature(method)
            )
        });
    });
});