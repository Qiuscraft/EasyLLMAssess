import mysql from 'mysql2/promise';

let connection: mysql.Connection;
(async () => {
    const config = useRuntimeConfig()
    // 创建 MySQL 连接
    connection = await mysql.createConnection({
        host: config.mysql.host,
        user: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database,
    });
})()

export default connection;
