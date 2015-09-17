# tgameboy

silly gameboy telegram bot

## setup

first create a new telegram bot with the `BotFather` telegram user. store your
token somewhere temporarily. then:

    npm install
    cp tgameboy-token.js.example ~/.tgameboy-token.js
    $EDITOR ~/.tgameboy-token.js
    node index.js <path-to-rom>.gb
