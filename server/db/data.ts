import {withConnection} from "~/server/db/connection";
import mysql from "mysql2/promise";
import {SrcQuestion, StdQuestion, ScoringPoint, SrcAnswer} from "~/server/types/mysql";

export async function getData(): Promise<SrcQuestion[]> {
    return await withConnection(async (conn: mysql.Connection) => {
        // 1. 获取所有源问题
        const [srcRows] = await conn.execute('SELECT id, content FROM src_question');
        const srcQuestions: {[key: number]: SrcQuestion} = {};

        // 初始化源问题映射
        for (const row of srcRows as any[]) {
            srcQuestions[row.id] = {
                id: row.id,
                content: row.content,
                stdQuestions: [],
                answers: [],
            };
        }

        // 2. 获取所有标准问题
        const [stdRows] = await conn.execute(`
            SELECT
                sq.id, sq.content, sq.answer, sq.src_id
            FROM
                std_question sq
                    JOIN
                src_question src ON sq.src_id = src.id
        `);

        const stdQuestions: {[key: number]: StdQuestion} = {};

        // 处理标准问题并关联到源问题
        for (const row of stdRows as any[]) {
            const stdQuestion: StdQuestion = {
                id: row.id,
                content: row.content,
                answer: row.answer,
                points: []
            };

            stdQuestions[row.id] = stdQuestion;

            // 将标准问题添加到对应的源问题中
            if (srcQuestions[row.src_id]) {
                srcQuestions[row.src_id].stdQuestions.push(stdQuestion);
            }
        }

        // 3. 获取所有评分点和关联
        const [pointRows] = await conn.execute(`
            SELECT
                p.id, p.content, p.score, sqp.std_question_id
            FROM
                point p
                    JOIN
                std_question_point sqp ON p.id = sqp.point_id
        `);

        // 处理评分点并关联到标准问题
        for (const row of pointRows as any[]) {
            const point: ScoringPoint = {
                id: row.id,
                content: row.content,
                score: row.score
            };

            // 将评分点添加到对应的标准问题中
            if (stdQuestions[row.std_question_id]) {
                stdQuestions[row.std_question_id].points.push(point);
            }
        }

        // 4. get src answer
        const [answerRows] = await conn.execute(`
            SELECT
                sa.id, sa.content, sa.src_question_id
            FROM
                src_answer sa
                    JOIN
                src_question src ON sa.src_question_id = src.id
        `);

        for (const row of answerRows as any[]) {
            const answer: SrcAnswer = {
                id: row.id,
                content: row.content,
            };

            // 将标准问题添加到对应的源问题中
            if (srcQuestions[row.src_question_id]) {
                srcQuestions[row.src_question_id].answers.push(answer);
            }
        }

        // 返回所有源问题的数组
        return Object.values(srcQuestions);
    });
}