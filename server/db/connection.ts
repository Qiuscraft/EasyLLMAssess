import mysql from 'mysql2/promise';

let connection: mysql.Connection | null = null;

async function getConnection(): Promise<mysql.Connection> {
    if (!connection) {
        const config = useRuntimeConfig();
        connection = await mysql.createConnection({
            host: config.mysql.host,
            user: config.mysql.user,
            password: config.mysql.password,
            database: config.mysql.database,
        });
    }
    return connection;
}

async function closeConnection(): Promise<void> {
    if (connection) {
        await connection.end();
        connection = null;
    }
}

export async function withConnection<T>(callback: (conn: mysql.Connection) => Promise<T>): Promise<T> {
    const conn: mysql.Connection = await getConnection();

    const result = await callback(conn);
    await closeConnection();
    return result;
}
