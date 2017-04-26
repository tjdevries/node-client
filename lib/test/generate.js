"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var nvimRequestGenerator_1 = require("../nvimRequestGenerator");
var assert = require('assert');
describe('Generator', function () {
    describe('convertType', function () {
        it('should parse basic types', function () {
            assert(nvimRequestGenerator_1.convertType('String', false) === 'string');
        });
        it('should convert ArrayOf types', function () {
            assert(nvimRequestGenerator_1.convertType('ArrayOf(String)', false) === 'string[]');
            assert(nvimRequestGenerator_1.convertType('ArrayOf(Integer)', false) === 'number[]');
        });
        it('should convert complicated ArrayOf types', function () {
            assert(nvimRequestGenerator_1.convertType('ArrayOf(Integer, 2)', false) === '[number, number]');
        });
        it('should convert Nvim handles to special values', function () {
            assert(nvimRequestGenerator_1.convertType('Buffer', false) === 'BufferHandle');
            assert(nvimRequestGenerator_1.convertType('Buffer', true) === 'Buffer');
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
            assert('  methodName((err: Error, res: number) => void): void;\n' === nvimRequestGenerator_1.RPCMethodToSignature(method));
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
