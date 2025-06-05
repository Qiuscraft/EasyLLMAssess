import {withConnection} from "~/server/db/connection";
import mysql from "mysql2/promise";
import {StdQuestion, Point} from "~/server/types/mysql";

/**
 * 处理标准问题查询并关联评分点的辅助函数
 */
async function processStandardQuestions(
    conn: mysql.Connection,
    whereClause: string,
    params: any[],
    order_by: string = 'desc',
    page: number = 1,
    page_size: number = 5
): Promise<{ total: number; total_no_filter: number; std_questions: StdQuestion[] }> {
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
            WHERE ${whereClause}
        `,
        params
    );
    const total = (totalRows as any[])[0].total;

    // 3. 获取所有标准问题，支持筛选和排序
    const [stdRows] = await conn.execute(
        `
            SELECT id, content, answer
            FROM std_question
            WHERE ${whereClause}
            ORDER BY id ${order_by}
            LIMIT ${page_size} OFFSET ${(page - 1) * page_size}
        `,
        params
    );
    const stdQuestions: { [key: number]: StdQuestion } = {};
    const questionIds: number[] = [];

    for (const row of stdRows as any[]) {
        const questionId = row.id;
        questionIds.push(questionId);
        stdQuestions[questionId] = {
            id: questionId,
            content: row.content,
            answer: row.answer,
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
}

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
        const whereClause = '(? IS NULL OR id = ?) AND content LIKE ? AND answer LIKE ?';
        const params = [idParam, idParam, `%${content}%`, `%${answer}%`];

        return await processStandardQuestions(conn, whereClause, params, order_by, page, page_size);
    });
}

export async function getStandardQuestionsNoAnswer(
    id: number | undefined = undefined,
    content: string = '',
    order_by: string = 'desc',
    page: number = 1,
    page_size: number = 5
): Promise<{ total: number; total_no_filter: number; std_questions: StdQuestion[] }> {
    return await withConnection(async (conn: mysql.Connection) => {
        // 将 undefined 转换为 null
        const idParam = id === undefined ? null : id;
        const whereClause = '(? IS NULL OR id = ?) AND content LIKE ? AND answer = \'\'';
        const params = [idParam, idParam, `%${content}%`];

        return await processStandardQuestions(conn, whereClause, params, order_by, page, page_size);
    });
}

