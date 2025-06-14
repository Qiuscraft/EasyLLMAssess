import {withConnection} from "~/server/db/connection";
import mysql from "mysql2/promise";
import {ScoringPoint, StdAnswer, StdQuestion, StdQuestionVersion} from "~/server/types/mysql";
import {InsertingScoringPoint} from "~/server/types/inserting";

export async function getStandardQuestions(
    id: number | undefined = undefined,
    content: string = '',
    answer: string = '',
    order_by: string = 'desc',
    page: number = 1,
    page_size: number = 5,
    onlyShowAnswered: boolean = false,
    onlyShowNoAnswered: boolean = false,
): Promise<{ total: number; total_no_filter: number; std_questions: StdQuestion[] }> {
    return await withConnection(async (conn: mysql.Connection) => {
        return {
            total: await getTotalStandardQuestionsAfterFiltered(conn, id, content, answer, onlyShowAnswered, onlyShowNoAnswered),
            total_no_filter: await getTotalStandardQuestionsNoFilter(conn),
            std_questions: await getStandardQuestionsAfterFiltered(conn, id, content, answer, onlyShowAnswered, onlyShowNoAnswered, order_by, page, page_size),
        }
    });
}

export async function setStandardAnswer(
    id: number,
    answer: string,
    scoringPoints: InsertingScoringPoint[],
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

                // 获取新插�����的评分点ID
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

export async function getTotalStandardQuestionsNoFilter(conn: mysql.Connection): Promise<number> {
    const query = `SELECT COUNT(*) as total FROM std_question`;
    const [rows] = await conn.execute(query);
    return (rows as any[])[0].total;
}

// 辅助函数：构建标准问题筛选条件
function buildStdQuestionFilter(
    id: number | undefined,
    content: string,
    answer: string,
    onlyShowAnswered: boolean,
    onlyShowNoAnswered: boolean = false
): { conditions: string[], params: any[], whereClause: string } {
    const idParam = id === undefined ? null : id;
    const filterConditions: string[] = [];
    const filterParams: any[] = [];

    const baseTableAlias = 'sq_filter'; // 用于 std_question 的别名
    const versionTableAlias = 'sqv_filter'; // 用于 std_question_version 的别名
    const answerTableAlias = 'sa_filter'; // 用于 std_answer 的别名


    if (idParam !== null) {
        filterConditions.push(`${baseTableAlias}.id = ?`);
        filterParams.push(idParam);
    }

    if (content) {
        filterConditions.push(`${versionTableAlias}.content LIKE ?`);
        filterParams.push(`%${content}%`);
    }

    if (onlyShowAnswered) {
        filterConditions.push(`${answerTableAlias}.id IS NOT NULL`);
        filterConditions.push(`${answerTableAlias}.content IS NOT NULL AND ${answerTableAlias}.content != ''`);
        if (answer) {
            filterConditions.push(`${answerTableAlias}.content LIKE ?`);
            filterParams.push(`%${answer}%`);
        }
    } else if (onlyShowNoAnswered) {
        filterConditions.push(`${answerTableAlias}.id IS NULL`);
    } else {
        if (answer) {
            filterConditions.push(`${answerTableAlias}.content LIKE ?`);
            filterParams.push(`%${answer}%`);
        }
    }

    let whereClause = '';
    if (filterConditions.length > 0) {
        whereClause = 'WHERE ' + filterConditions.join(' AND ');
    }

    return { conditions: filterConditions, params: filterParams, whereClause };
}

export async function getStandardQuestionsAfterFiltered(
    conn: mysql.Connection,
    id: number | undefined = undefined,
    content: string = '',
    answer: string = '',
    onlyShowAnswered: boolean = false,
    onlyShowNoAnswered: boolean = false,
    order_by: string = 'desc',
    page: number = 1,
    page_size: number = 5,
): Promise<StdQuestion[]> {
    const { whereClause: whereClauseForSubQuery, params: subQueryFilterParams } = buildStdQuestionFilter(
        id,
        content,
        answer,
        onlyShowAnswered,
        onlyShowNoAnswered
    );

    const orderDirection = order_by.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * page_size;

    // 第一步：获取满足条件的问题ID和版本ID
    const paginatedStdQuestionAndVersionQuery = `
        SELECT DISTINCT sq_filter.id AS question_id, sqv_filter.id AS version_id
        FROM std_question sq_filter
        JOIN std_question_version sqv_filter ON sq_filter.id = sqv_filter.std_question_id
        LEFT JOIN std_answer sa_filter ON sqv_filter.id = sa_filter.std_question_version_id
        ${whereClauseForSubQuery}
        ORDER BY sq_filter.id ${orderDirection}
        LIMIT ${page_size}
        OFFSET ${offset}
    `;

    const [idRows] = await conn.execute(paginatedStdQuestionAndVersionQuery, [...subQueryFilterParams]);

    if (!idRows || (idRows as any[]).length === 0) {
        return [];
    }

    // 提取问题ID和版本ID
    const filteredPairs = (idRows as any[]).map(row => ({
        questionId: row.question_id,
        versionId: row.version_id
    }));

    // 获取唯一的问题ID列表
    const stdQuestionIds = [...new Set(filteredPairs.map(pair => pair.questionId))];

    // 创建问题ID到其符合条件的版本ID的映射
    const questionToVersionsMap = new Map<number, number[]>();
    for (const pair of filteredPairs) {
        if (!questionToVersionsMap.has(pair.questionId)) {
            questionToVersionsMap.set(pair.questionId, []);
        }
        questionToVersionsMap.get(pair.questionId)!.push(pair.versionId);
    }

    const mainQuery = `
        SELECT sq.id          AS std_q_id,
               sqv.id         AS version_id,
               sqv.version    AS version_name,
               sqv.created_at AS version_created_at,
               sqv.content    AS version_content,
               sqv.category   AS version_category,
               t.tag          AS tag_name,
               sa.id          AS answer_id,
               sa.content     AS answer_content,
               sp.content     AS sp_content,
               sp.score       AS sp_score
        FROM std_question sq
                 JOIN
             std_question_version sqv ON sq.id = sqv.std_question_id
                 LEFT JOIN
             question_tag qt ON sqv.id = qt.std_question_version_id
                 LEFT JOIN
             tag t ON qt.tag_id = t.id
                 LEFT JOIN
             std_answer sa ON sqv.id = sa.std_question_version_id
                 LEFT JOIN
             scoring_point sp ON sa.id = sp.std_answer_id
        WHERE sq.id IN (${stdQuestionIds.map(() => '?').join(',')})
        AND sqv.id IN (${filteredPairs.map(() => '?').join(',')})
        ORDER BY FIELD(sq.id, ${stdQuestionIds.map(() => '?').join(',')}),
                 sqv.id,
                 sa.id,
                 t.tag,
                 sp.content, sp.score
    `;

    // 构建查询参数：问题ID + 版本ID + 问题ID（用于ORDER BY FIELD）
    const mainQueryParams = [
        ...stdQuestionIds,
        ...filteredPairs.map(pair => pair.versionId),
        ...stdQuestionIds
    ];

    const [detailRows] = await conn.execute(mainQuery, mainQueryParams);

    const questionsMap = new Map<number, StdQuestion>();
    const versionsMap = new Map<number, StdQuestionVersion>();
    const answersMap = new Map<number, StdAnswer>();

    for (const row of (detailRows as any[])) {
        let stdQuestion = questionsMap.get(row.std_q_id);
        if (!stdQuestion) {
            stdQuestion = {
                id: row.std_q_id,
                versions: [],
            };
            questionsMap.set(row.std_q_id, stdQuestion);
        }

        let version = versionsMap.get(row.version_id);
        if (!version) {
            version = {
                id: row.version_id,
                version: row.version_name,
                createdAt: new Date(row.version_created_at),
                content: row.version_content,
                category: row.version_category,
                tags: [],
                answer: undefined,
                stdQuestionId: row.std_q_id,
            };
            versionsMap.set(row.version_id, version);
            stdQuestion.versions.push(version);
        }

        if (row.tag_name && version.tags && !version.tags.includes(row.tag_name)) {
            version.tags.push(row.tag_name);
        }

        if (row.answer_id) {
            let stdAnswer = answersMap.get(row.answer_id);
            if (!stdAnswer) {
                stdAnswer = {
                    id: row.answer_id,
                    content: row.answer_content,
                    scoringPoints: [],
                };
                answersMap.set(row.answer_id, stdAnswer);
                if (version) {
                    version.answer = stdAnswer;
                }
            }

            if (row.sp_content !== null && row.sp_score !== null && stdAnswer) {
                const scoringPoint: ScoringPoint = {
                    content: row.sp_content,
                    score: Number(row.sp_score),
                };
                if (!stdAnswer.scoringPoints.some(sp => sp.content === scoringPoint.content && sp.score === scoringPoint.score)) {
                    stdAnswer.scoringPoints.push(scoringPoint);
                }
            }
        }
    }

    return stdQuestionIds
        .map(id => questionsMap.get(id))
        .filter((q): q is StdQuestion => q !== undefined);
}

export async function getTotalStandardQuestionsAfterFiltered(
    conn: mysql.Connection,
    id: number | undefined = undefined,
    content: string = '',
    answer: string = '',
    onlyShowAnswered: boolean = false,
    onlyShowNoAnswered: boolean = false,
): Promise<number> {
    const { whereClause, params } = buildStdQuestionFilter(
        id,
        content,
        answer,
        onlyShowAnswered,
        onlyShowNoAnswered
    );

    // 在 buildStdQuestionFilter 中，我们为表使用了别名 sq_filter, sqv_filter, sa_filter
    // 在这个 COUNT 查询中，我们需要确保 JOIN 的表和 WHERE 子句中的���名一致。
    // 或者，我们可以让 buildStdQuestionFilter 接受别名作为参数，或者不使用别名。
    // 为了简单起见，这里直接替换查询中的别名以匹配 buildStdQuestionFilter 的输出。
    // 一个更���壮的解决方案是让 buildStdQuestionFilter 更灵活或调整其内部别名。

    // 当前 buildStdQuestionFilter 使用的别名是：
    // std_question -> sq_filter
    // std_question_version -> sqv_filter
    // std_answer -> sa_filter

    // 因此，这里的 JOIN 子句也需要使用这些别名
    let query = `
        SELECT COUNT(DISTINCT sq_filter.id) as total
        FROM std_question sq_filter
        JOIN std_question_version sqv_filter ON sq_filter.id = sqv_filter.std_question_id
        LEFT JOIN std_answer sa_filter ON sqv_filter.id = sa_filter.std_question_version_id
        ${whereClause}
    `;

    const [rows] = await conn.execute(query, params);
    return (rows as any[])[0].total;
}

export async function getTagsByQuestionVersionId(versionId: number, conn: mysql.Connection) {
    const [rows] = await conn.execute(`
        SELECT t.id, t.tag
        FROM tag t
        JOIN question_tag qt ON t.id = qt.tag_id
        WHERE qt.std_question_version_id = ?
        `, [versionId]
    );

    return (rows as any[]).map((row: any) => row.tag);
}

export async function getStdQuestionByStdQuestionId(stdQuestionId: number, conn: mysql.Connection) {
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
            stdQuestionId: stdQuestionId,
        }
        question.versions.push(version);
    }
    return question;
}

export async function getStdQuestionBySrcQuestionId(srcQuestionId: number, conn: mysql.Connection): Promise<StdQuestion[]> {
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
