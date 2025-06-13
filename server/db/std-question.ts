import {withConnection} from "~/server/db/connection";
import mysql from "mysql2/promise";
import {StdQuestion, Point} from "~/server/types/mysql";
import {InsertingPoint} from "~/server/types/inserting";

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
    page_size: number = 5,
    onlyShowAnswered: boolean = false,
): Promise<{ total: number; total_no_filter: number; std_questions: StdQuestion[] }> {
    return await withConnection(async (conn: mysql.Connection) => {
        // 将 undefined 转换为 null
        const idParam = id === undefined ? null : id;

        // 构建基本的 where 子句
        let whereClause = '(? IS NULL OR id = ?) AND content LIKE ?';
        let params = [idParam, idParam, `%${content}%`];

        // 根据 onlyShowAnswered 参数调整查询条件
        if (onlyShowAnswered) {
            // 只显示已回答的问题
            whereClause += ' AND answer IS NOT NULL AND answer != \'\'';
        } else {
            // 使用原来的过滤条件
            whereClause += ' AND answer LIKE ?';
            params.push(`%${answer}%`);
        }

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

export async function setStandardAnswer(
    id: number,
    answer: string,
    scoringPoints: InsertingPoint[],
): Promise<void> {
    return await withConnection(async (conn: mysql.Connection) => {
        try {
            // 开始事务
            await conn.beginTransaction();

            // 1. 更新标准问题的答案
            await conn.execute(
                'UPDATE std_question SET answer = ? WHERE id = ?',
                [answer, id]
            );

            // 2. 删除该问题与所有评分点的关联
            await conn.execute(
                'DELETE FROM std_question_point WHERE std_question_id = ?',
                [id]
            );

            // 3. 处理新的评分点
            for (const point of scoringPoints) {
                // 插入新的评分点
                const [result] = await conn.execute(
                    'INSERT INTO point (content, score) VALUES (?, ?)',
                    [point.content, point.score]
                );

                // 获取新插入的评分点ID
                const pointId = (result as mysql.ResultSetHeader).insertId;

                // 建立问题与评分点的关联
                await conn.execute(
                    'INSERT INTO std_question_point (std_question_id, point_id) VALUES (?, ?)',
                    [id, pointId]
                );
            }

            // 提交事务
            await conn.commit();
        } catch (error) {
            // 发生错误时回滚事务
            await conn.rollback();
            throw error;
        }
    });
}