import {withConnection} from "~/server/db/connection";
import mysql from "mysql2/promise";
import {StdQuestion, Point} from "~/server/types/mysql";

export async function getStandardQuestions(
    id: number | undefined = undefined,
    content: string = '',
    answer: string = '',
    order_by: string = 'desc',
    page: number = 1,
    page_size: number = 5
): Promise<{ total: number; total_no_filter: number; std_questions: StdQuestion[] }> {
    return await withConnection(async (conn: mysql.Connection) => {
        // 将 undefined 转换为 null
        const idParam = id === undefined ? null : id;

        // 1. 获取筛选前的总数
        const [totalNoFilterRows] = await conn.execute(
            `
                SELECT COUNT(*) as total
                FROM std_question
            `
        );
        const total_no_filter = (totalNoFilterRows as any[])[0].total;

        // 2. 获取筛选后的总数
        const [totalRows] = await conn.execute(
            `
                SELECT COUNT(*) as total
                FROM std_question
                WHERE (? IS NULL OR id = ?) AND content LIKE ? AND answer LIKE ?
            `,
            [idParam, idParam, `%${content}%`, `%${answer}%`]
        );
        const total = (totalRows as any[])[0].total;

        // 3. 获取所有标准问题，支持筛选和排序
        const [stdRows] = await conn.execute(
            `
                SELECT id, content, answer
                FROM std_question
                WHERE (? IS NULL OR id = ?) AND content LIKE ? AND answer LIKE ?
                ORDER BY id ${order_by}
                LIMIT ${page_size} OFFSET ${(page - 1) * page_size}
            `,
            [idParam, idParam, `%${content}%`, `%${answer}%`]
        );
        const stdQuestions: { [key: number]: StdQuestion } = {};
        const questionIds: number[] = [];

        for (const row of stdRows as any[]) {
            const questionId = row.id;
            questionIds.push(questionId);
            stdQuestions[questionId] = {
                id: questionId,
                content: row.content,
                answer: row.answer, // 修复这里的错误，之前是 row.content
                points: [],
            };
        }

        // 如果没有找到问题，直接返回
        if (questionIds.length === 0) {
            return {
                total: total,
                total_no_filter: total_no_filter,
                "std_questions": [],
            };
        }

        // 4. 只获取与筛选出的标准问题相关的评分点
        const [pointRows] = await conn.execute(
            `SELECT p.id, p.content, p.score, sqp.std_question_id
            FROM point p
            JOIN std_question_point sqp ON p.id = sqp.point_id
            WHERE sqp.std_question_id IN (${questionIds.map(() => '?').join(',')})`,
            questionIds
        );

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
            total_no_filter: total_no_filter,
            "std_questions": Object.values(stdQuestions),
        };
    });
}

