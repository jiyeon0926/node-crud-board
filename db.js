const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '1234',
  database: 'crud',
});

connection.connect(); // DB 연동

module.exports = connection; // 모듈로 내보내기