class Parser {

    handleMessage(bot, message, callback) {
        if (message.type === 'message' && message.text) {
            if (message.text.includes('sprint')) {
                U.projectResponse('Fris-kill', callback);
            }
        }
    }
}

module.exports = Parser;
