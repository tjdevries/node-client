import * as generator from '../nvimRequestGenerator';
import * as rpc from '../nvimRpc';

let assert = require('assert');

import { expect } from 'chai';

describe('Generator', () => {
    describe('generator.convertType', () => {
        it('should parse basic types', () => {
            assert(generator.convertType('String', false) === 'string');
        });

        it('should convert ArrayOf types', () => {
            assert(generator.convertType('ArrayOf(String)', false) === 'string[]');
            assert(generator.convertType('ArrayOf(Integer)', false) === 'number[]');
        });

        it('should convert complicated ArrayOf types', () => {
            assert(generator.convertType('ArrayOf(Integer, 2)', false) === '[number, number]');
        });

        it('should convert Nvim handles to special values', () => {
            assert(generator.convertType('Buffer', false) === 'BufferHandle');
            assert(generator.convertType('Buffer', true) === 'Buffer');
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
                '  methodName((err: Error, res: number) => void): void;\n' === generator.RPCMethodToSignature(method)
            )
        });
    });

    describe('getMethodItems', () => {
        let func: rpc.Method = {
            method: true,
            name: 'nvim_buf_line_count',
            returnType: 'number',
            parameters: [
                ['buffer', 'BufferHandle']
            ],
            since: 0
        }

        let types = {
            Nvim: {id: -1, prefix: ''},
            Buffer: {id: 0, prefix: 'nvim_buf_'},
            Window: {id: 1, prefix: 'nvim_win_'}
        }

        it('should return a methodItem', () => {
            let buffer_result: generator.MethodItems | null = 
                generator.getMethodItems(
                    func,
                    'Nvim',
                    types
                );
            if (buffer_result === null) {
                assert(false);
                return;
            }
            expect(buffer_result.typescriptName).to.equal('bufLineCount');
            expect(buffer_result.params).to.equal([]);
            expect(buffer_result.params).to.equal([]);
        });

        it('should work with Buffer types', () => {
            let buffer_result: generator.MethodItems | null = 
                generator.getMethodItems(
                    func,
                    'Buffer',
                    types
                );
            if (buffer_result === null) {
                assert(false);
                return;
            }
            expect(buffer_result.typescriptName).to.equal('lineCount');
        });

        it('should return null for non-valid items', () => {
            expect(
                generator.getMethodItems(
                    func,
                    'Window',
                    types
                )
            ).to.equal(null);
        })

        it('should have a signature without Buffer for Buffer', () => {
            let items = generator.getMethodItems(func, 'Buffer', types);
            if (items) {
                expect(generator.methodItemsToSignature(items)).to.equal('');
            } else {
                expect('').to.equal('items was not supposed to be null');
            }
        });

        it('should have a signature with BufferHandle for Nvim', () => {
            let items = generator.getMethodItems(func, 'Nvim', types);
            if (items) {
                expect(generator.methodItemsToSignature(items)).to.equal('');
            } else {
                expect('').to.equal('items was not supposed to be null');
            }
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
            // generateWrappers({}, {}, metadata)
        });
    });
});