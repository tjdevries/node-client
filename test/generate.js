"use strict";
exports.__esModule = true;
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
});
