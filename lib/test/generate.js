"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var generate_typescript_interfaces_1 = require("../scripts/generate-typescript-interfaces");
var assert = require('assert');
describe('Generator', function () {
    describe('convertType', function () {
        it('should parse basic types', function () {
            assert(generate_typescript_interfaces_1.convertType('String') === 'string');
        });
        it('should convert ArrayOf types', function () {
            assert(generate_typescript_interfaces_1.convertType('ArrayOf(String)') === 'string[]');
            assert(generate_typescript_interfaces_1.convertType('ArrayOf(Integer)') === 'number[]');
        });
        it('should convert complicated ArrayOf types', function () {
            assert(generate_typescript_interfaces_1.convertType('ArrayOf(Integer, 2)') === '[number, number]');
        });
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
            assert('  methodName((err: Error, res: number) => void): void;\n' === generate_typescript_interfaces_1.RPCMethodToSignature(method));
        });
    });
});
