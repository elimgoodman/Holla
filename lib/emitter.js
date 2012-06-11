exports.Emitter = function(socket, plugins) {
    this.socket = socket;
    this.plugins = plugins;
};

exports.Emitter.prototype = {
    emit: function(type, payload) {
        this.plugins.forEach(function(plugin){
            if(plugin.hooks && plugin.hooks[type]) {
                plugin.hooks[type](payload);
            }
        });
        this.socket.emit(type, payload);
    }
};
