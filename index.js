var screenshotInterval = 250;
var depressFrames = 10;

var buttons = {
    right: {keycode: 0},
    left: {keycode: 1},
    up: {keycode: 2},
    down: {keycode: 3},
    a: {keycode: 4},
    b: {keycode: 5},
    select: {keycode: 6},
    start: {keycode: 7}
}

var chatMsgs = [];

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

var sendScreenshot = function(chat_id) {
    var png = canvas.toBuffer();
    fs.writeFileSync(frame + '.png', png);

    bot.sendPhoto({
        chat_id: chat_id,
        files: {
            photo: './' + frame + '.png'
        },
        reply_markup: {
            keyboard: [
                ['/b', '/up', '/a'],
                ['/left', '/start', '/right'],
                ['/select', '/down', '/screen']
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
        console.log('got msg: ' + msg.text);

        var chatId = msg.chat ? msg.chat.id : msg.from.id;

        if (!msg.text.indexOf('/screen')) {
            sendScreenshot(chatId);
            return;
        }

        _.each(buttons, function(button, name) {
            if (!msg.text.indexOf('/' + name)) {
                gb.JoyPadEvent(button.keycode, true);
                button.depressFrame = frame + depressFrames;
                setTimeout(function() {
                    sendScreenshot(chatId);
                }, screenshotInterval);
                return;
            }
        });
    }
});

bot.start();

var Canvas = require('canvas');
var gameboy = require('./gameboy');

var canvas = new Canvas(160, 144);
var ctx = canvas.getContext('2d');
var gb = gameboy(canvas, rom, {
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

process.on('SIGINT', function() {
    console.log('caught SIGINT, saving state and quitting...');
    var saveState = JSON.stringify(gb.saveState());
    fs.writeFileSync(romName + '.state', saveState);
    process.exit();
});
