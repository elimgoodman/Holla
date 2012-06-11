exports.channel = {
    'panels': [
        {
            name: 'push-queue',
            content_source: 'topic',
            content: function(topic) {
                return {
                    queue: topic.split("|")
                };
            }
        }
    ]
}
