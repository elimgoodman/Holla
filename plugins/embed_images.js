exports.plugin = {
    'hooks': {
        'message': function(message) {
            if(message.message.indexOf(".png") > -1) {
                message.message = "Changed! <img src='foo.png' />";
            }
        }
    }
}
