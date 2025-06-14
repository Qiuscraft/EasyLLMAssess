import {withConnection} from "~/server/db/connection";
import mysql from "mysql2/promise";
import {ScoringPoint, SrcAnswer, SrcQuestion, StdAnswer, StdQuestion, StdQuestionVersion} from "~/server/types/mysql";

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

async function getTagsByQuestionVersionId(versionId: number, conn: mysql.Connection) {
    const [rows] = await conn.execute(`
        SELECT t.id, t.tag
        FROM tag t
        JOIN question_tag qt ON t.id = qt.tag_id
        WHERE qt.std_question_version_id = ?
        `, [versionId]
    );

    return (rows as any[]).map((row: any) => row.tag);
}

async function getStdQuestionByStdQuestionId(stdQuestionId: number, conn: mysql.Connection) {
    let question: StdQuestion = {
        id: stdQuestionId,
        versions: [],
    }

    const [versionRows] = await conn.execute(`
                SELECT id, version, created_at, content, category
                FROM std_question_version
                WHERE std_question_id = ?
            `, [stdQuestionId])
    for (const versionRow of versionRows as any[]) {
        const stdQuestionVersionId = versionRow.id;

        const [answerRows] = await conn.execute(`
                    SELECT id, content
                    FROM std_answer
                    WHERE std_question_version_id = ?
                `, [stdQuestionVersionId]);
        const answerRow = (answerRows as any[])[0];

        const [scoringPointsRows] = await conn.execute(`
                    SELECT content, score
                    FROM scoring_point
                    WHERE std_answer_id = ?
                `, [answerRow.id]);

        const scoringPoints: ScoringPoint[] = (scoringPointsRows as any[]).map((pointRow: any) => ({
            content: pointRow.content,
            score: pointRow.score,
        }));

        const answer: StdAnswer = {
            id: answerRow.id,
            content: answerRow.content,
            scoringPoints: scoringPoints,
        }

        const tags = await getTagsByQuestionVersionId(stdQuestionVersionId, conn);

        let version: StdQuestionVersion = {
            id: stdQuestionVersionId,
            version: versionRow.version,
            createdAt: versionRow.created_at,
            content: versionRow.content,
            category: versionRow.category || undefined,
            tags: tags,
            answer: answer,
        }
        question.versions.push(version);
    }
    return question;
}

async function getStdQuestionBySrcQuestionId(srcQuestionId: number, conn: mysql.Connection): Promise<StdQuestion[]> {
    const [rows] = await conn.execute(`
        SELECT id
        FROM std_question
        WHERE src_id = ?
    `, [srcQuestionId]);

    const stdQuestions: StdQuestion[] = [];
    for (const row of rows as any[]) {
        const stdQuestion = await getStdQuestionByStdQuestionId(row.id, conn);
        stdQuestions.push(stdQuestion);
    }
    return stdQuestions;
}

async function getSrcAnswersBySrcQuestionId(srcQuestionId: number, conn: mysql.Connection): Promise<SrcAnswer[]> {
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
