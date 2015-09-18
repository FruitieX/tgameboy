var screenshotInterval = 250;
var depressFrames = 10;

var buttons = {
    rt: {keycode: 0},
    lt: {keycode: 1},
    up: {keycode: 2},
    dn: {keycode: 3},
    a: {keycode: 4},
    b: {keycode: 5},
    sel: {keycode: 6},
    str: {keycode: 7}
}

var chatMsgs = [{
    nick: '<server>',
    text: 'Server was restarted.'
}];

var _ = require('underscore');
var fs = require('fs');
var token = require(process.env.HOME + '/.tgameboy-token.js');

var romName = process.argv[2]
try {
    var rom = fs.readFileSync(romName);
} catch(e) {
    console.error('error while reading ROM! please provide a valid path as first argument');
    process.exit(1);
}

var Bot = require('node-telegram-bot');
var Canvas = require('canvas');

var chatHeight = 160;
var chatPadding = 1;
var canvas = new Canvas(160, 144 + chatHeight);
var canvasCtx = canvas.getContext('2d');
var fontSize = 9;
var font = 'sans-serif';

var pendingScreenshots = {};

var sendScreenshot = function(chat_id) {
    canvasCtx.fillStyle = 'black';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    var imageData = gbCanvasCtx.getImageData(0, 0, gbCanvas.width, gbCanvas.height);
    canvasCtx.putImageData(imageData, 0, canvas.height - 144);

    canvasCtx.fillStyle = 'white';
    canvasCtx.imageSmoothingEnabled = false;
    var lineNum = 0;
    _.each(chatMsgs, function(msg) {
        canvasCtx.font = fontSize + 'px ' + font;

        var maxWidth = 160 - 2 * chatPadding;

        var lines = [];

        var text = msg.text;
        var words = text.split(' ');
        var line = '';

        lines.unshift({style: 'bold', text: msg.nick + ':'});

        // word wrap
        for(var n = 0; n < words.length; n++) {
            var testLine = line + words[n] + ' ';
            var metrics = canvasCtx.measureText(testLine);
            var testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                lines.unshift({text: line});
                line = words[n] + ' ';
            }
            else {
                line = testLine;
            }
        }
        lines.unshift({text: line});

        _.each(lines, function(line) {
            canvasCtx.font = (line.style ? line.style + ' ' : '') + fontSize + 'px ' + font;
            canvasCtx.fillText(line.text, chatPadding, canvas.height - 144 - fontSize * lineNum++ - chatPadding, maxWidth);
        });
    });

    var png = canvas.toBuffer();
    var fileName = new Date().getTime() + '-frame' + frame + '.png';
    fs.writeFileSync(fileName, png);

    bot.sendPhoto({
        chat_id: chat_id,
        files: {
            photo: './' + fileName
        },
        reply_markup: {
            keyboard: [
                ['/b',      '/up',      '/a',       '/sel',     '/scr'],
                ['/lt',     '/dn',      '/rt',      '/str',     '/scr'],
            ],
            resize_keyboard: true
        }
    }, function(err, msg) {
        if (err) {
            console.log('error on sendPhoto:');
            console.log(err);
        }
    });
};

var bot = new Bot({
    token: token
})
.on('message', function(msg) {
    if (msg.text) {
        console.log(msg.from.first_name + ': ' + msg.text);

        var chatId = msg.chat ? msg.chat.id : msg.from.id;
        var wasCommand = false;

        if (!msg.text.indexOf('/scr')) {
            sendScreenshot(chatId);
            wasCommand = true;
            return;
        }

        _.each(buttons, function(button, name) {
            if (!msg.text.indexOf('/' + name)) {
                lastActivity = new Date().getTime();

                gb.JoyPadEvent(button.keycode, true);
                button.depressFrame = frame + depressFrames;

                // only send screenshot if one isn't already being sent
                if (!pendingScreenshots[chatId]) {
                    pendingScreenshots[chatId] = setTimeout(function() {
                        delete(pendingScreenshots[chatId]);
                        sendScreenshot(chatId);
                    }, screenshotInterval);
                }

                wasCommand = true;
                return;
            }
        });

        if (!wasCommand) {
            chatMsgs.unshift({
                nick: msg.from.first_name,
                text: msg.text
            });
            chatMsgs = chatMsgs.slice(0, Math.floor((canvas.height - 160) / fontSize / 2) + 1);
            sendScreenshot(chatId);
        }
    }
});

bot.start();

var gameboy = require('./gameboy');

var gbCanvas = new Canvas(160, 144);
var gbCanvasCtx = gbCanvas.getContext('2d');
var gb = gameboy(gbCanvas, rom, {
    colorizeGb: true,
    drawEvents: true
});

var frame = 0;
gb.on('draw', function() {
    _.each(buttons, function(button, name) {
        if (button.depressFrame && button.depressFrame <= frame) {
            gb.JoyPadEvent(button.keycode, false);
            button.depressFrame = 0;
        }
    });

    frame++;
});
gb.on('error', function(err) {
    console.log(err);
});

gb.stopEmulator = 1;
gb.start();

try {
    var saveState = JSON.parse(fs.readFileSync(romName + '.state'));
    console.log('returning to game state in ' + romName + '.state');
    gb.returnFromState(saveState);
} catch(e) {
    console.log('could not find save state, not attempting state resume');
}

var interval = setInterval(function() {
    gb.run();
}, 0);

var zlib = require('zlib');

// backup game state every 10 minutes
var saveStateInterval = 60 * 10;

// but only if there was activity since the last backup
var lastBackup = new Date().getTime();
var lastActivity = 0;

setInterval(function() {
    if (lastActivity < lastBackup) {
        return;
    }

    zlib.gzip(JSON.stringify(gb.saveState()), function(err, buffer) {
        if (!err) {
            var fileName = romName + '.' + new Date().getTime() + '.state.gz';
            fs.writeFile(fileName, buffer, function(err) {
                if (!err) {
                    console.log('wrote game state backup successfully: ' + fileName);
                    lastBackup = new Date();
                } else {
                    console.error('error while writing game state backup:');
                    console.log(err);
                }
            });
        } else {
            console.error('error while compressing game state backup:');
            console.error(err);
        }
    });
}, saveStateInterval * 1000);

process.on('SIGINT', function() {
    console.log('caught SIGINT, saving state and quitting...');
    var saveState = JSON.stringify(gb.saveState());
    fs.writeFileSync(romName + '.state', saveState);
    process.exit();
});
