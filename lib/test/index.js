"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
try {
    // which.sync('C:\\Users\\timot_000\\Downloads\\Neovim\\Neovim\\bin\\nvim.exe');
}
catch (e) {
    console.error('A Neovim installation is required to run the tests', '(see https://github.com/neovim/neovim/wiki/Installing)');
    process.exit(1);
}
/*
describe('Nvim', function() {
  var nvim, requests, notifications;

  before(function(done) {
    nvim = cp.spawn('C:\\Neovim\\bin\\nvim.exe', ['-u', 'NONE', '-N', '--embed'], {
      cwd: __dirname
    });

    attach(nvim.stdin, nvim.stdout, function(err, n) {
      nvim = n;
      nvim.on('request', function(method, args, resp) {
        requests.push({method: method, args: args});
        resp.send('received ' + method + '(' + args + ')');
      });
      nvim.on('notification', function(method, args) {
        notifications.push({method: method, args: args});
      });
      done();
    });
  });

  beforeEach(function() {
    requests = [];
    notifications = [];
  });

  it('can send requests and receive response', function(done) {
    nvim.eval('{"k1": "v1", "k2": 2}', function(err, res) {
      this.equal(err, null);
      this.deepEqual(res, {k1: 'v1', k2: 2});
      done();
    });
  });

  it('can receive requests and send responses', function(done) {
    nvim.eval('rpcrequest(1, "request", 1, 2, 3)', function(err, res) {
      this.equal(err, null);
      this.equal(res, 'received request(1,2,3)');
      this.deepEqual(requests, [{method: 'request', args: [1, 2, 3]}]);
      this.deepEqual(notifications, []);
      done();
    });
  });

  it('can receive notifications', function(done) {
    nvim.eval('rpcnotify(1, "notify", 1, 2, 3)', function(err, res) {
      this.equal(err, null);
      this.equal(res, 1);
      this.deepEqual(requests, []);
      setImmediate(function() {
        this.deepEqual(notifications, [{method: 'notify', args: [1, 2, 3]}]);
        done();
      });
    });
  });

  it('can deal with custom types', function(done) {
    nvim.command('vsp', function(err, res) {
      nvim.getWindows(function(err, windows) {
        this.equal(windows.length, 2);
        this.equal(windows[0] instanceof nvim.Window, true);
        this.equal(windows[1] instanceof nvim.Window, true);
        nvim.setCurrentWindow(windows[1], function(err, res) {
          nvim.getCurrentWindow(function(err, win) {
            this.equal(win.equals(windows[1]), true);
            nvim.getCurrentBuffer(function(err, buf) {
              this.equal(buf instanceof nvim.Buffer, true);
              buf.getLineSlice(0, -1, true, true, function(err, lines) {
                this.deepEqual(lines, ['']);
                buf.setLineSlice(0, -1, true, true, ['line1', 'line2'], function(err) {
                  buf.getLineSlice(0, -1, true, true, function(err, lines) {
                    this.deepEqual(lines, ['line1', 'line2']);
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });

  });

  it('emits "disconnect" after quit', function(done) {
    nvim.on('disconnect', done);
    nvim.quit();
  });
});
*/ 
