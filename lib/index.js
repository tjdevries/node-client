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
var winston = require("winston");
var rpc = require("./nvimRpc");
var generate = require("./nvimRequestGenerator");
// Configure logging
exports.logger = new (winston.Logger)({
    level: 'verbose',
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({
            name: 'main',
            filename: 'neovim_client.log',
            level: 'verbose'
        })
    ]
});
var Session = require("msgpack5rpc");
var Nvim = (function (_super) {
    __extends(Nvim, _super);
    function Nvim(session, channel_id) {
        return _super.call(this, session, channel_id) || this;
    }
    return Nvim;
}(rpc.RPCClass));
function attach(writer, reader, cb) {
    var sessionBootstrap = new Session([]);
    var initSession = sessionBootstrap;
    // Create an bootstrap neovim connection
    var nvimBootStrap = new rpc.RPCClass(sessionBootstrap, -1);
    // Types to pass to final session
    // TODO: Can I be more specific with the registered types?
    var externalTypes = [];
    // Eventual channel id for the neovim connection
    var channel_id = -1;
    // The metadata received from requesting the api data
    // Will be filled in later
    var metadata = {};
    // type information, TODO: Make a stronger type
    var types = {};
    var pendingRPCs = [];
    var calledCallback = false;
    sessionBootstrap.attach(writer, reader);
    // register initial RPC handlers to queue non-spec requests until API is generated
    var requestCallback = function (method, args, resp) {
        if (method !== 'specs') {
            pendingRPCs.push({
                type: 'request',
                args: Array.prototype.slice.call(arguments)
            });
        }
        else {
            cb(null, nvimBootStrap); // the errback may be called later, but 'specs' must be handled
            calledCallback = true;
            nvimBootStrap.emit('request', rpc.decode(method), rpc.decode(args), resp);
        }
    };
    sessionBootstrap.on('request', requestCallback);
    var notificationCallback = function (method, args) {
        pendingRPCs.push({
            type: 'notification',
            args: Array.prototype.slice.call(arguments)
        });
    };
    sessionBootstrap.on('detach', notificationCallback);
    var detachCallback = function () {
        sessionBootstrap.removeAllListeners('request');
        sessionBootstrap.removeAllListeners('notification');
        nvimBootStrap.emit('disconnect');
    };
    sessionBootstrap.on('detach', detachCallback);
    var apiCallback = function (err, res) {
        if (err) {
            return cb(err);
        }
        // Fill in the channel id for the nvimFinal
        channel_id = res[0];
        exports.logger.log('info', 'apiCallback: channel_id = %d', channel_id);
        // Fill in the metadata for nvimFinal
        metadata = rpc.decode(res[1]);
        exports.logger.log('info', 'apiCallback: metadata = %s', metadata);
        var _loop_1 = function (name_1) {
            // let type: rpc.RegisteredType = new rpc.TypeClass()
            var Type = Function('return function ' + name_1 + '(session, data, decode) { ' +
                '\n  this._session = session;' +
                '\n  this._data = data;' +
                '\n  this._decode = decode;' +
                '\n};')();
            Type.prototype.equals = rpc.equals;
            externalTypes.push({
                constructor: Type,
                type: metadata.types[name_1].id,
                decode: function (data) { return new Type(sessionBootstrap, data, rpc.decode); },
                encode: function (obj) { return obj._data; }
            });
            types[name_1] = Type;
            Nvim.prototype[name_1] = Type;
        };
        // Get the necessary information from each of the types specified in the API
        for (var name_1 in metadata.types) {
            _loop_1(name_1);
        }
    };
    sessionBootstrap.request('vim_get_api_info', [], apiCallback);
    generate.generateWrappers(Nvim, types, metadata);
    // addExtraNvimMethods(Nvim);
    var sessionFinal = new Session(externalTypes);
    sessionFinal.attach(writer, reader);
    var nvimFinal = new Nvim(sessionFinal, channel_id);
    sessionFinal.on('request', function (method, args, resp) {
        nvimFinal.emit('request', rpc.decode(method), rpc.decode(args), resp);
    });
    sessionFinal.on('notification', function (method, args) {
        nvimFinal.emit('notification', rpc.decode(method), rpc.decode(args));
    });
    sessionFinal.on('detach', function () {
        sessionFinal.removeAllListeners('request');
        sessionFinal.removeAllListeners('notification');
        nvimFinal.emit('disconnect');
    });
    cb(null, nvimFinal);
    // dequeue any pending RPCs
    initSession.detach();
    pendingRPCs.forEach(function (pending) {
        if (pending.type === 'request') {
            // there's no clean way to change the output channel using the current
            // Session abstraction
            pending.args[pending.args.length - 1]._encoder = sessionFinal._encoder;
        }
        nvimFinal.emit.apply(nvimFinal, [pending.type].concat(pending.args));
    });
}
exports.attach = attach;
