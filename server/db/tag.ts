import { withConnection } from "~/server/db/connection";
import mysql from "mysql2/promise";
import { TagCount } from "~/server/types/mysql";

/**
 * 搜索标签并返回匹配的标签及其问题数量
 *
 * @param searchTag 要搜索的标签（可选），为空时返回所有标签
 * @param size 返回结果的最大数量，默认为10
 * @returns 匹配标签及其问题数量的数组
 */
export async function searchTags(searchTag: string = '', size: number = 10): Promise<TagCount[]> {
    return await withConnection(async (conn: mysql.Connection) => {
        let query = `
            SELECT tag, question_count as count 
            FROM tag 
            WHERE 1=1
        `;

        const params: any[] = [];

        // 如果提供了搜索参数，添加LIKE条件
        if (searchTag && searchTag.trim() !== '') {
            query += ` AND tag LIKE ?`;
            params.push(`%${searchTag}%`);
        }

        // 按问题数量降序排序，然后按标签名称升序排序
        query += ` ORDER BY question_count DESC, tag ASC`;

        // 限制返回结果数量
        if (size > 0) {
            query += ` LIMIT ${size}`;
        }

        const [rows] = await conn.execute(query, params);
        return (rows as any[]).map(row => ({
            tag: row.tag,
            count: row.count
        }));
    });
}
