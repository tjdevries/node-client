import * as cp from 'child_process';
import * as stream from 'stream';
import * as winston from 'winston';

import * as rpc from './nvimRpc';
import * as generate from './nvimRequestGenerator';

// Configure logging
export var logger = new (winston.Logger)({
    level: 'verbose',
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({
            name: 'main',
            filename: 'neovim_client.log',
            level: 'verbose'
        })
    ]
})

import * as Session from 'msgpack5rpc';

export class Nvim extends rpc.RPCClass {
    constructor(session: rpc.RPCSession, channel_id: number) {
        super(session, channel_id);
    }
}

export function attach(writer: stream.Writable, reader: stream.Readable, cb) {
    let sessionBootstrap: rpc.RPCSession = new Session([]);
    let initSession: rpc.RPCSession = sessionBootstrap;

    // Create an bootstrap neovim connection
    let nvimBootStrap = new rpc.RPCClass(sessionBootstrap, -1);

    // Types to pass to final session
    // TODO: Can I be more specific with the registered types?
    let externalTypes: rpc.RegisteredType<any>[] = [];
    // Eventual channel id for the neovim connection
    let channel_id: number = -1
    // The metadata received from requesting the api data
    // Will be filled in later
    var metadata = <rpc.Metadata>{};
    // type information, TODO: Make a stronger type
    let types = {};

    let pendingRPCs: rpc.Message[] = [];
    let calledCallback: boolean = false;

    sessionBootstrap.attach(writer, reader);

    // register initial RPC handlers to queue non-spec requests until API is generated
    let requestCallback: rpc.RequestSignature = function (method, args, resp) {
        if (method !== 'specs') {
            pendingRPCs.push({
                type: 'request',
                args: Array.prototype.slice.call(arguments)
            });
        } else {
            cb(null, nvimBootStrap) // the errback may be called later, but 'specs' must be handled
            calledCallback = true;
            nvimBootStrap.emit('request', rpc.decode(method), rpc.decode(args), resp);
        }
    };
    sessionBootstrap.on('request', requestCallback);

    let notificationCallback: rpc.NotifySignature = function (method, args) {
        pendingRPCs.push({
            type: 'notification',
            args: Array.prototype.slice.call(arguments)
        });
    };
    sessionBootstrap.on('detach', notificationCallback);


    let detachCallback: rpc.DetachSignature = function() {
        sessionBootstrap.removeAllListeners('request');
        sessionBootstrap.removeAllListeners('notification');
        nvimBootStrap.emit('disconnect');
    }
    sessionBootstrap.on('detach', detachCallback);

    let apiCallback = function(err, res) {
        if (err) {
            return cb(err);
        }

        // Fill in the channel id for the nvimFinal
        channel_id = res[0]
        logger.log('info', 'apiCallback: channel_id = %d', channel_id)
        // Fill in the metadata for nvimFinal
        metadata = rpc.decode(res[1]);
        logger.log('info', 'apiCallback: metadata = %s', metadata);

        // Get the necessary information from each of the types specified in the API
        for (let name in metadata.types) {
            // let type: rpc.RegisteredType = new rpc.TypeClass()
            let Type = Function(
                'return function ' + name + '(session, data, decode) { ' +
                '\n  this._session = session;' + 
                '\n  this._data = data;' +
                '\n  this._decode = decode;' +
                '\n};'
            )();
            Type.prototype.equals = rpc.equals;

            externalTypes.push({
                constructor: Type,
                type: metadata.types[name].id,
                decode: function(data) { return new Type(sessionBootstrap, data, rpc.decode); },
                encode: function(obj) { return obj._data; }
            });

            types[name] = Type;
            Nvim.prototype[name] = Type;
        }

    }
    sessionBootstrap.request('vim_get_api_info', [], apiCallback);

    generate.generateWrappers(Nvim, types, metadata);
    // addExtraNvimMethods(Nvim);

    let sessionFinal: rpc.SessionType =  new Session(externalTypes);
    sessionFinal.attach(writer, reader);

    let nvimFinal = new Nvim(sessionFinal, channel_id);

    sessionFinal.on('request', function(method, args, resp) {
        nvimFinal.emit('request', rpc.decode(method), rpc.decode(args), resp);
    });

    sessionFinal.on('notification', function(method, args) {
        nvimFinal.emit('notification', rpc.decode(method), rpc.decode(args));
    });

    sessionFinal.on('detach', function() {
      sessionFinal.removeAllListeners('request');
      sessionFinal.removeAllListeners('notification');
      nvimFinal.emit('disconnect');
    });

    cb(null, nvimFinal);

    // dequeue any pending RPCs
    initSession.detach();
    pendingRPCs.forEach(function(pending) {
      if(pending.type === 'request') {
        // there's no clean way to change the output channel using the current
        // Session abstraction
        pending.args[pending.args.length - 1]._encoder = sessionFinal._encoder;
      }
      nvimFinal.emit.apply(nvimFinal, [pending.type].concat(pending.args));
    });
}