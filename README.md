# tgameboy

silly gameboy Telegram bot, taking spam on Telegram to whole new levels

## features

* accepts inputs via Telegram commands `/a`, `/b`, `/lt`, `/rt`, `/up`, `/dn`, `/str`, `/sel`
* commands are displayed on a keypad for ease of entry
* after inputs it replies with a game screenshot as a Telegram picture
* `/scr` command can be used for requesting a new screenshot without sending inputs
* chat messages are displayed as part of the screenshot, commands are not shown here
* every screenshot is saved on disk for easy time lapse generation
* game state is automatically saved on SIGINT and restored when the server is started
* additionally, backups are made of the game state every 10 minutes, but only if there has been activity
* why have i not been banned from Telegram yet?

## setup

first create a new Telegram bot with the `BotFather` Telegram user. store your
token somewhere temporarily. then:

    npm install
    cp tgameboy-token.js.example ~/.tgameboy-token.js
    $EDITOR ~/.tgameboy-token.js
    node index.js <path-to-rom>.gb

now you should be able to send the `/start` command to your bot and it will send back a keypad.
`/stop` can be used to hide the keypad.

you can invite the bot to groups in order to play with your friends!
note that game state is shared across all groups/private chats that the bot is in.

## screenshot

![screenshot](screenshot.png)
