"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Session = require('msgpack5rpc');
var traverse = require('traverse');
var events_1 = require("events");
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
    return obj;
}
exports.decode = decode;
function equals(other) {
    try {
        return this._data.toString() === other._data.toString();
    }
    catch (e) {
        return false;
    }
}
exports.equals = equals;
;
var RPCClass = (function (_super) {
    __extends(RPCClass, _super);
    function RPCClass(session, channel_id) {
        var _this = _super.call(this) || this;
        _this._decode = decode;
        _this._session = session;
        _this._channel_id = channel_id;
        return _this;
    }
    return RPCClass;
}(events_1.EventEmitter));
exports.RPCClass = RPCClass;
