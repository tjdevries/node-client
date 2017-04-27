"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var generator = require("../nvimRequestGenerator");
var assert = require('assert');
var chai_1 = require("chai");
describe('Generator', function () {
    describe('generator.convertType', function () {
        it('should parse basic types', function () {
            assert(generator.convertType('String', false) === 'string');
        });
        it('should convert ArrayOf types', function () {
            assert(generator.convertType('ArrayOf(String)', false) === 'string[]');
            assert(generator.convertType('ArrayOf(Integer)', false) === 'number[]');
        });
        it('should convert complicated ArrayOf types', function () {
            assert(generator.convertType('ArrayOf(Integer, 2)', false) === '[number, number]');
        });
        it('should convert Nvim handles to special values', function () {
            assert(generator.convertType('Buffer', false) === 'BufferHandle');
            assert(generator.convertType('Buffer', true) === 'Buffer');
        });
        // TODO: Check return type conversions
    });
    describe('RPCMethodToSignature', function () {
        it('should convert simple RPC methods', function () {
            var method = {
                method: true,
                name: 'methodName',
                returnType: 'Integer',
                parameters: [],
                since: 1,
            };
            assert('  methodName((err: Error, res: number) => void): void;\n' === generator.RPCMethodToSignature(method));
        });
    });
    describe('getMethodItems', function () {
        var func = {
            method: true,
            name: 'nvim_buf_line_count',
            returnType: 'number',
            parameters: [
                ['buffer', 'BufferHandle']
            ],
            since: 0
        };
        var types = {
            Nvim: { id: -1, prefix: '' },
            Buffer: { id: 0, prefix: 'nvim_buf_' },
            Window: { id: 1, prefix: 'nvim_win_' }
        };
        it('should return a methodItem', function () {
            var buffer_result = generator.getMethodItems(func, 'Nvim', types);
            if (buffer_result === null) {
                assert(false);
                return;
            }
            chai_1.expect(buffer_result.typescriptName).to.equal('bufLineCount');
            chai_1.expect(buffer_result.params).to.equal([]);
            chai_1.expect(buffer_result.params).to.equal([]);
        });
        it('should work with Buffer types', function () {
            var buffer_result = generator.getMethodItems(func, 'Buffer', types);
            if (buffer_result === null) {
                assert(false);
                return;
            }
            chai_1.expect(buffer_result.typescriptName).to.equal('lineCount');
        });
        it('should return null for non-valid items', function () {
            chai_1.expect(generator.getMethodItems(func, 'Window', types)).to.equal(null);
        });
        it('should have a signature without Buffer for Buffer', function () {
            var items = generator.getMethodItems(func, 'Buffer', types);
            if (items) {
                chai_1.expect(generator.methodItemsToSignature(items)).to.equal('');
            }
            else {
                chai_1.expect('').to.equal('items was not supposed to be null');
            }
        });
        it('should have a signature with BufferHandle for Nvim', function () {
            var items = generator.getMethodItems(func, 'Nvim', types);
            if (items) {
                chai_1.expect(generator.methodItemsToSignature(items)).to.equal('');
            }
            else {
                chai_1.expect('').to.equal('items was not supposed to be null');
            }
        });
    });
    describe('generateWrappers', function () {
        var metadata = {
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
        };
        it('should log stuff', function () {
            // generateWrappers({}, {}, metadata)
        });
    });
});
