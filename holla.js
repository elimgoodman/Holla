var objs = require('./lib/objects');
var Emitter = require('./lib/emitter').Emitter;

var irc = require('irc');

var express = require('express')
  , app = express.createServer()
  , io = require('socket.io').listen(app)
  , fs = require('fs');

app.use(express.static(__dirname));

//FIXME: use embeds instead of plugins
//Load all plugins
var plugins = [];

var plugin_dir = "./plugins/"
var plugin_names = fs.readdirSync(plugin_dir);
plugin_names.forEach(function(fname){
    var plugin = require(plugin_dir + fname).plugin;
    var plugin_name = fname.split('.')[0];

    plugins.push(plugin);
});

//Load all channels
var channel_configs = {};

var channel_dir = "./channels/"
var channel_names = fs.readdirSync(channel_dir);
channel_names.forEach(function(fname){
    var channel_config = require(channel_dir + fname).channel;
    var channel_name = "#" + fname.split('.')[0];

    channel_configs[channel_name] = channel_config;
});

var MockClient = function(){};
MockClient.prototype = {
    addListener: function(type, fn){},
    say: function(channel, msg){},
    part: function(channel){}
};

io.sockets.on('connection', function (socket) {
    
    var emitter = new Emitter(socket, plugins);

    var client, name, channels;

    socket.on('init', function(data){
        name = data.name;
        channel = data.channels;

        //client = new irc.Client('irc.freenode.net', name, {
            //channels: channels
        //});
        
        client = new MockClient();
        
        client.addListener('message', function (from, channel, message) {
            var msg = new objs.Message(from, channel, message);
            emitter.emit('message', msg);
        });

        client.addListener('topic', function (channel, topic) {
            emitter.emit('topic', {
                channel: channel,
                topic: topic
            });
        });

        client.addListener('join', function (channel) {
            var channel_config = channel_configs[channel];
            emitter.emit('join', {
                channel: channel,
                config: channel_config
            });
        });

        //MOCK STUFF
        emitter.emit('topic', {
            channel: "#testing-irc-proxy",
            topic: "Foo"
        });

        emitter.emit('topic', {
            channel: "#testing-irc-proxy-2",
            topic: "Bar"
        });

        emitter.emit('message', new objs.Message("foo", "#testing-irc-proxy", "hi"));
        emitter.emit('message', new objs.Message("bar", "#testing-irc-proxy", "http://www.foo.com/img.png"));

        emitter.emit('join', {
            channel: channel,
            config: channel_config
        });
    });

    socket.on('say', function(data){
        client.say(data.channel, data.msg);
        emitter.emit('message', {
            from: name,
            channel: data.channel,
            message: data.message
        });
    });

    socket.on('disconnect', function () {
        if(channels != undefined) {
            channels.forEach(function(channel){
                client.part(channel);
            });
        }
    });

});

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.listen(3000);


