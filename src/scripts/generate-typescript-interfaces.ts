import { logger, attach } from '../index';
import * as _ from 'lodash';
import * as cp from 'child_process';

import * as rpc from '../nvimRpc';

var proc = cp.spawn('C:\\Users\\tdevries\\Downloads\\Neovim\\Neovim\\bin\\nvim', ['-u', 'NONE', '-N', '--embed'], {
    cwd: __dirname
});

attach(proc.stdin, proc.stdout, function (err, nvim: any) {
    var interfaces = {
        Nvim: nvim.constructor,
        Buffer: nvim.Buffer,
        // Window: nvim.Window,
        // Tabpage: nvim.Tabpage,
    };

    let nvimKey = 'constructor'
    logger.log('info', '%s: %s', nvimKey, nvim[nvimKey]);
    nvimKey = 'Buffer'
    logger.log('info', '%s: %s', nvimKey, nvim[nvimKey]);

    process.stdout.write('// Neovim TypeScript Declaration');
    process.stdout.write('export default function attach(writer: NodeJS.WritableStream, reader: NodeJS.ReadableStream, cb: (err: Error, nvim: Nvim) => void): void;\n\n');

    for (let key in interfaces) {
        let name = key;

        // Only neovim extends NodeJS.EventEmitter
        if (key == 'Nvim') {
            name += ' extends NodeJS.EventEmitter';
        }
        // Beging interface declaration
        process.stdout.write('export interface ' + name + ' {\n');

        // TODO: Old one had a 'quit' method here, need to look into that
        if (key === 'Nvim') {
            process.stdout.write('  quit(): void;\n');
        }
        for (let methodName in interfaces[key].prototype) {
            let method = interfaces[key].prototype[methodName];

            // Skip on undefined method
            if (typeof method === 'undefined') {
                continue;
            }

            if (method.metadata) {
                process.stdout.write('  ' + methodName + '\n');
                process.stdout.write('  ' + method + '\n\n');
                break;
            }
            // if (method.metadata) {
            //     process.stdout.write()
            // }
        }

        process.stdout.write('}\n');

        proc.stdin.end();
    }

})