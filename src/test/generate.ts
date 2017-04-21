import { convertType, RPCMethodToSignature } from '../scripts/generate-typescript-interfaces';
import { generateWrappers } from '../nvimRequestGenerator';
import * as rpc from '../nvimRpc';

let assert = require('assert');

describe('Generator', () => {
    describe('convertType', () => {
        it('should parse basic types', () => {
            assert(convertType('String', false) === 'string');
        });

        it('should convert ArrayOf types', () => {
            assert(convertType('ArrayOf(String)', false) === 'string[]');
            assert(convertType('ArrayOf(Integer)', false) === 'number[]');
        });

        it('should convert complicated ArrayOf types', () => {
            assert(convertType('ArrayOf(Integer, 2)', false) === '[number, number]');
        });

        it('should convert Nvim handles to special values', () => {
            assert(convertType('Buffer', false) === 'BufferHandle');
            assert(convertType('Buffer', true) === 'Buffer');
        });

        // TODO: Check return type conversions
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

    describe('generateWrappers', () => {
        let metadata: rpc.Metadata = {
            "version": {
                "major": 0,
                "api_level": 2,
                "api_prerelease": true,
                "patch": 0,
                "api_compatible": 0,
                "minor": 2
            },
            "types": {
                "Window": {
                    "id": 1,
                    "prefix": "nvim_win_"
                },
                "Tabpage": {
                    "id": 2,
                    "prefix": "nvim_tabpage_"
                },
                "Buffer": {
                    "id": 0,
                    "prefix": "nvim_buf_"
                }
            },
            "functions": [
                {
                    "method": true,
                    "name": "nvim_buf_line_count",
                    "returnType": "Integer",
                    "parameters": [
                        [
                            "Buffer",
                            "buffer"
                        ]
                    ],
                    "since": 1
                },
                {
                    "method": false,
                    "deprecatedSince": 1,
                    "name": "buffer_get_line",
                    "returnType": "String",
                    "parameters": [
                        [
                            "Buffer",
                            "buffer"
                        ],
                        [
                            "Integer",
                            "index"
                        ]
                    ],
                    "since": 0
                },
            ],
            "error_types": {
                 "Validation": {
                    "id": 1
                },
                "Exception": {
                    "id": 0
                }
            }
        }
        it('should log stuff', () => {
            generateWrappers({}, metadata)
        });
    });
});