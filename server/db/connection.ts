import mysql from 'mysql2/promise';

let connection: mysql.Connection;
(async () => {
    // 创建 MySQL 连接
    connection = await mysql.createConnection({
        host: runtimeConfig.mysql.host,
        user: runtimeConfig.mysql.user,
        password: runtimeConfig.mysql.password,
        database: runtimeConfig.mysql.database,
    });
})()

export default connection;
