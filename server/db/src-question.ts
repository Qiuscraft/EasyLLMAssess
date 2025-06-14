import {withConnection} from "~/server/db/connection";
import mysql from "mysql2/promise";
import {SrcAnswer, SrcQuestion} from "~/server/types/mysql";
import {getStdQuestionBySrcQuestionId} from "~/server/db/std-question";

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

        const srcQuestions: SrcQuestion[] = [];
        for (const question of srcRows as any[]) {
            srcQuestions.push({
                id: question.id,
                content: question.content,
                stdQuestions: await getStdQuestionBySrcQuestionId(question.id, conn),
                answers: await getSrcAnswersBySrcQuestionId(question.id, conn),
            });
        }

        return {
            total: total,
            "src-questions": srcQuestions,
        };
    });
}

export async function getSrcAnswersBySrcQuestionId(srcQuestionId: number, conn: mysql.Connection): Promise<SrcAnswer[]> {
    const [rows] = await conn.execute(`
        SELECT id, content
        FROM src_answer
        WHERE src_question_id = ?
    `, [srcQuestionId]);

    return (rows as any[]).map((row: any) => ({
        id: row.id,
        content: row.content,
    }));
}
