"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Session = require('msgpack5rpc');
var traverse = require('traverse');
function decode(obj) {
    traverse(obj).forEach(function (item) {
        if (item instanceof Session) {
            this.update(item, true);
        }
        else if (Buffer.isBuffer(item)) {
            try {
                this.update(item.toString('utf8'));
            }
            catch (e) { }
        }
    });
}
exports.decode = decode;
