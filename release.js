var fs = require('fs');

require('total.js').http('release', {
    ip: '0.0.0.0',
    port: process.env.PORT || 3000
});
