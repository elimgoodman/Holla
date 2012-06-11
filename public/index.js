$(function(){
    var msgs = $("#msgs");
    var socket = io.connect('http://localhost');
    var name = "_testbot_";

    var irc = {};

    _.extend(Backbone.Model.prototype, {
        update: function(field, xform) {
            var f = this.get(field);
            var new_f = xform(f);
            var xformed = {};
            xformed[field] = new_f;
            this.set(xformed);
        }
    });

    irc.MView = Backbone.View.extend({
        render: function() {
            this.$el.html(this.template(this.getTemplateContext()));
            this.$el.data('backbone-model', this.model);
            this.postRender();
            return this;
        },
        postRender: $.noop,
        getTemplateContext: function() {
            return this.model.toJSON();
        },
        initialize: function() {
            this.model.bind('change', this.render, this);
        }
    });

    irc.Message = Backbone.Model.extend({
        defaults: {
            from: null,
            channel: null,
            message: null
        }
    });

    irc.MessageCollection = Backbone.Collection.extend({
        model: irc.Message
    });
    
    irc.ChannelCollection = Backbone.Collection.extend({
        model: irc.Channel
    });

    irc.Channels = new irc.ChannelCollection();

    _.extend(irc.Channels, {
        getByName: function(channel) {
            return this.find(function(c){
                return c.get('name') == channel;
            });
        },
        updateByName: function(channel, fn) {
            var c = this.getByName(channel);
            return fn(c);
        }
    });
    
    irc.Channel = Backbone.Model.extend({
        defaults: {
            name: "",
            config: null,
            topic: null,
            messages: null
        },
        initialize: function() {
            this.set({
                messages: new irc.MessageCollection()
            });
        },
        addMessage: function(msg) {
            this.update('messages', function(m){
                m.push(msg);
                return m;
            });
        },
        connect: function() {
            socket.emit('connect', {
                name: name,
                channel: this.get('name')
            });
        }
    });

    irc.ChannelConfig = Backbone.Model.extend({});

    irc.MessageView = irc.MView.extend({
        tagName: "li",
        className: "message",
        template: _.template($('#message-tmpl').html())
    });

    irc.MessageListView = Backbone.View.extend({
        tagName: 'ul',
        className: 'message-list',
        initialize: function() {
            this.options.messages.bind('all', this.render, this);
        },
        render: function() {
            //FIXME: less awful rendering
            var self = this;

            this.$el.empty();
            this.options.messages.each(function(m){
                var v = new irc.MessageView({model: m});
                self.$el.append(v.render().el);
            });

            return this;
        }
    });

    irc.CurrentChannel = _.extend({
        c: null,
        set: function(c){
            this.c = c;
            this.trigger('change');
        },
        get: function(){
            return this.c;
        },
        getName: function() {
            return this.get().get('name');
        }
    }, Backbone.Events);


    irc.ChannelLiView = irc.MView.extend({
        tagName: "li",
        className: "channel-li",
        template: _.template($('#channel-li-tmpl').html()),
        events: {
            'click .channel-name': 'changeCurrentChannel'
        },
        changeCurrentChannel: function() {
            irc.CurrentChannel.set(this.model);
        }
    });

    irc.ChannelView = irc.MView.extend({
        tagName: "div",
        className: "channel",
        template: _.template($('#channel-tmpl').html()),
        postRender: function() {
            var msgs = this.model.get('messages');
            var v = new irc.MessageListView({messages: msgs});
            this.$(".message-list-container").html(v.render().el);
        }
    });

    irc.ChannelListView = Backbone.View.extend({
        el: $("#channels"),
        initialize: function() {
            irc.Channels.bind('add', this.render, this);
        },
        render: function() {
            this.$el.empty();
            var self = this;
            irc.Channels.each(function(m){
                var v = new irc.ChannelLiView({model: m});
                self.$el.append(v.render().el);
            });
        }
    });

    irc.MessageInputView = Backbone.View.extend({
        el: $("#message-input-container"),
        events: {
            'keyup #message-input': 'say'
        },
        say: function(e) {
            var code = (e.keyCode ? e.keyCode : e.which);
            if(code == 13) { //Enter keycode
                var msg = $(e.target).val();
                socket.emit('say', {
                    message: msg,
                    channel: irc.CurrentChannel.getName()
                });

                $(e.target).val("");
            }
        }
    });

    irc.CurrentChannelView = Backbone.View.extend({
        el: $("#current-channel"),
        initialize: function() {
            irc.CurrentChannel.bind('change', this.render, this);
        },
        render: function() {
            var channel = irc.CurrentChannel.get();
            var v = new irc.ChannelView({model: channel});
            this.$el.html(v.render().el);
        }
    });

    /*
    * Sockets
    */
    
    socket.on('message', function (data) {
        var msg = new irc.Message(data);
        irc.Channels.updateByName(data.channel, function(c){
            c.addMessage(msg);
        });
    });

    socket.on('topic', function (data) {
        irc.Channels.updateByName(data.channel, function(c){
            c.set({
                topic: data.topic
            });
        });
    });

    socket.on('join', function (data) {
        var channel = irc.Channels.getByName(data.channel);

        var config = new irc.ChannelConfig(data.config);
        channel.set({
            config: config
        });
    });

    new irc.ChannelListView();
    new irc.CurrentChannelView();
    new irc.MessageInputView();
   
    /*
    * Set up channels
    */

    var channels = [
        '#testing-irc-proxy',
        '#testing-irc-proxy-2'
    ];
    
    socket.emit('init', {
        name: name,
        channels: channels
    });

    irc.CurrentChannel.set(irc.Channels.first());

    window.irc = irc;
});
