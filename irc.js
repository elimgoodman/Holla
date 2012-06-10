var irc = require('irc');

var express = require('express')
  , app = express.createServer()
  , io = require('socket.io').listen(app);

app.use(express.static(__dirname));

var config = {
    '#testing-irc-proxy': {
        actions: {
            'Join': function() {

            },
            'Never Mind': function() {
            
            }
        }
    }
};

var MockClient = function(){};
MockClient.prototype = {
    addListener: function(type, fn){},
    say: function(channel, msg){},
    part: function(channel){}
};

io.sockets.on('connection', function (socket) {
    
    var client, name, channels;

    socket.on('init', function(data){
        name = data.name;
        channel = data.channels;

        //client = new irc.Client('irc.freenode.net', name, {
            //channels: channels
        //});
        
        client = new MockClient();
        
        client.addListener('message', function (from, channel, message) {
            socket.emit('message', {
                from: from,
                channel: channel,
                message: message
            });
        });

        client.addListener('topic', function (channel, topic) {
            socket.emit('topic', {
                channel: channel,
                topic: topic
            });
        });

        client.addListener('join', function (channel) {
            var room_config = config[channel];
            socket.emit('join', {
                channel: channel,
                config: room_config
            });
        });

        //MOCK STUFF
        socket.emit('topic', {
            channel: "#testing-irc-proxy",
            topic: "Foo"
        });

        socket.emit('topic', {
            channel: "#testing-irc-proxy-2",
            topic: "Bar"
        });

        socket.emit('message', {
            from: "foo",
            channel: "#testing-irc-proxy",
            message: "hello world!"
        });

        socket.emit('message', {
            from: "bar",
            channel: "#testing-irc-proxy",
            message: "goodbye world!"
        });
    });

    socket.on('say', function(data){
        client.say(data.channel, data.msg);
        socket.emit('message', {
            from: name,
            channel: data.channel,
            message: data.message
        });
    });

    socket.on('disconnect', function () {
        client.part(channel);
    });

});

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.listen(3000);


