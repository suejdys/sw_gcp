// db.js
const mysql = require('mysql');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '3433',
    database: 'userDB'
});

db.connect((err) => {
    if (err) throw err;
    console.log('MySQL 연결됨');
});

module.exports = db;
