"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../index");
var cp = require("child_process");
var proc = cp.spawn('C:\\Users\\tdevries\\Downloads\\Neovim\\Neovim\\bin\\nvim', ['-u', 'NONE', '-N', '--embed'], {
    cwd: __dirname
});
function metadataToSignature(metadata) {
    return 'TODO';
}
index_1.attach(proc.stdin, proc.stdout, function (err, nvim) {
    var interfaces = {
        Nvim: nvim.constructor,
        Buffer: nvim.Buffer,
    };
    var nvimKey = 'constructor';
    index_1.logger.log('info', '%s: %s', nvimKey, nvim[nvimKey]);
    nvimKey = 'Buffer';
    index_1.logger.log('info', '%s: %s', nvimKey, nvim[nvimKey]);
    process.stdout.write('// Neovim TypeScript Declaration');
    process.stdout.write('export default function attach(writer: NodeJS.WritableStream, reader: NodeJS.ReadableStream, cb: (err: Error, nvim: Nvim) => void): void;\n\n');
    for (var key in interfaces) {
        if (key == 'Nvim') {
            // Only neovim extends NodeJS.EventEmitter
            process.stdout.write('export interface ' + key + 'extends NodeJS.EventEmitter {\n');
            process.stdout.write('  quit(): void;\n');
        }
        else {
            // Beging interface declaration
            process.stdout.write('export interface ' + key + ' {\n');
        }
        for (var methodName in interfaces[key].prototype) {
            var method = interfaces[key].prototype[methodName];
            // Skip on undefined method
            if (typeof method === 'undefined') {
                continue;
            }
            if (method.metadata) {
                process.stdout.write('  ' + methodName + '\n');
                process.stdout.write('  ' + method + '\n\n');
                process.stdout.write(metadataToSignature(method.metadata));
                break;
            }
        }
        process.stdout.write('  equals(rhs: ' + key + '): boolean;\n');
        process.stdout.write('}\n');
    }
    // process.stdout.write('export function attach(writer: NodeJS.WritableStream, reader: NodeJS.ReadableStream): Promise<Nvim>;\n\n');
    proc.stdin.end();
});
