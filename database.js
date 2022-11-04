var mysql = require('mysql');
var config = require('config');
// var connection = mysql.createConnection(config.get('mysql'));
// connection.connect(function (error) {
//     if (!!error) {
//         console.log(error);
//     } else {
//         console.log('Database Connected!');
//     }
// });

const pool  = mysql.createPool({
    connectionLimit : 10,
    ...config.get('mysql')
});
module.exports = pool; 