import {withConnection} from "~/server/db/connection";
import mysql from "mysql2/promise";
import {SrcQuestion, StdQuestion, Point} from "~/server/types/mysql";

export async function getSourceQuestions(
    id: number | undefined = undefined,
    content: string = '',
    order_field: string = 'id',
    order_by: string = 'desc',
    page: number = 1,
    page_size: number = 5
): Promise<{ total: number; "src-questions": SrcQuestion[] }> {
    return await withConnection(async (conn: mysql.Connection) => {
        // 将 undefined 转换为 null
        const idParam = id === undefined ? null : id;

        // 1. 获取总数
        const [totalRows] = await conn.execute(
            `
                SELECT COUNT(*) as total
                FROM src_question
                WHERE (? IS NULL OR id = ?) AND content LIKE ?
            `,
            [idParam, idParam, `%${content}%`]
        );
        const total = (totalRows as any[])[0].total;

        // 2. 获取所有源问题，支持筛选和排序
        const [srcRows] = await conn.execute(
            `
                SELECT id, content
                FROM src_question
                WHERE (? IS NULL OR id = ?) AND content LIKE ?
                ORDER BY ${order_field} ${order_by}
                LIMIT ${page_size} OFFSET ${(page - 1) * page_size}
            `,
            [idParam, idParam, `%${content}%`]
        );
        const srcQuestions: { [key: number]: SrcQuestion } = {};

        for (const row of srcRows as any[]) {
            srcQuestions[row.id] = {
                id: row.id,
                content: row.content,
                stdQuestions: []
            };
        }

        // 3. 获取所有标准问题
        const [stdRows] = await conn.execute(`
            SELECT sq.id, sq.content, sq.answer, sq.src_id
            FROM std_question sq
                     JOIN src_question src ON sq.src_id = src.id
        `);

        const stdQuestions: { [key: number]: StdQuestion } = {};

        for (const row of stdRows as any[]) {
            const stdQuestion: StdQuestion = {
                id: row.id,
                content: row.content,
                answer: row.answer,
                points: []
            };

            stdQuestions[row.id] = stdQuestion;

            if (srcQuestions[row.src_id]) {
                srcQuestions[row.src_id].stdQuestions.push(stdQuestion);
            }
        }

        // 4. 获取所有评分点和关联
        const [pointRows] = await conn.execute(`
            SELECT p.id, p.content, p.score, sqp.std_question_id
            FROM point p
                     JOIN std_question_point sqp ON p.id = sqp.point_id
        `);

        for (const row of pointRows as any[]) {
            const point: Point = {
                id: row.id,
                content: row.content,
                score: row.score
            };

            if (stdQuestions[row.std_question_id]) {
                stdQuestions[row.std_question_id].points.push(point);
            }
        }

        return {
            total: total,
            "src-questions": Object.values(srcQuestions),
        };
    });
}