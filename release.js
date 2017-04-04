var fs = require('fs');

require('total.js').http('release', {
    port: process.env.PORT || 3000
});
