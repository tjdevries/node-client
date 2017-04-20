import { convertType } from '../scripts/generate-typescript-interfaces';

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
});