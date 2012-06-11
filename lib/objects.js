exports.Message = function(from, channel, message) {
    this.from = from;
    this.channel = channel;
    this.message = message;
};

exports.Message.prototype = {

};
