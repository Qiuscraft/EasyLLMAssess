import {withConnection} from "~/server/db/connection";
import {ResultSetHeader} from "mysql2";
import {CandidateAnswer, StdQuestionVersion} from "~/server/types/mysql";

export async function postCandidateAnswer(std_question_version_id: number, answer: string, username: string): Promise<number> {
    return await withConnection(async (conn) => {
        const [result] = await conn.execute(
            'INSERT INTO candidate_answer (author, content, std_question_version_id) VALUES (?, ?, ?)',
            [username, answer, std_question_version_id]
        );

        return (result as ResultSetHeader).insertId;
    });
}

export async function getCandidateAnswer(
    id: number | undefined = undefined,
    std_question: string = '',
    author: string = '',
    content: string = '',
    order_field: string = 'id',
    order_by: string = 'desc',
    page: number = 1,
    page_size: number = 10,
    onlyShowNoStandardAnswer: boolean = false,
): Promise<{
    total: number,
    candidate_answers: CandidateAnswer[],
}> {
    return await withConnection(async (conn) => {
        // 构建 WHERE 子句和参数
        const conditions = [];
        const params = [];

        if (id !== undefined) {
            conditions.push('ca.id = ?');
            params.push(id);
        }

        if (author) {
            conditions.push('ca.author LIKE ?');
            params.push(`%${author}%`);
        }

        if (content) {
            conditions.push('ca.content LIKE ?');
            params.push(`%${content}%`);
        }

        if (std_question) {
            conditions.push('sqv.content LIKE ?');
            params.push(`%${std_question}%`);
        }

        if (onlyShowNoStandardAnswer) {
            // 修正条件：显示���有标准答案或者标准答案为空的问题版本
            conditions.push('(NOT EXISTS (SELECT 1 FROM std_answer sa WHERE sa.std_question_version_id = sqv.id) OR EXISTS (SELECT 1 FROM std_answer sa WHERE sa.std_question_version_id = sqv.id AND (sa.content IS NULL OR sa.content = "")))');
        }

        // 构建完整的 WHERE 子句
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // 1. 获取总数
        const [totalRows] = await conn.execute(
            `SELECT COUNT(*) as total
             FROM candidate_answer ca
             LEFT JOIN std_question_version sqv ON ca.std_question_version_id = sqv.id
             LEFT JOIN std_question sq ON sqv.std_question_id = sq.id
             ${whereClause}`,
            params
        );
        const total = (totalRows as any[])[0].total;

        // 安全处理排序字段
        const safeOrderField = ['id', 'author', 'content', 'std_question_version_id'].includes(order_field)
            ? `ca.${order_field}`
            : 'ca.id';
        const safeOrderBy = order_by.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        // 2. 获取分页数据和相关联的问题版本详细信息
        const [rows] = await conn.execute(
            `SELECT 
                ca.id, ca.author, ca.content, ca.std_question_version_id,
                sqv.id as version_id, sqv.version as version_name, 
                sqv.content as question_content, sqv.created_at as version_created_at,
                sqv.category as version_category, sq.id as std_question_id
             FROM candidate_answer ca
             LEFT JOIN std_question_version sqv ON ca.std_question_version_id = sqv.id
             LEFT JOIN std_question sq ON sqv.std_question_id = sq.id
             ${whereClause}
             ORDER BY ${safeOrderField} ${safeOrderBy}
             LIMIT ${page_size} OFFSET ${(page - 1) * page_size}`,
            [...params]
        );

        // 3. 处理结果
        const candidate_answers: CandidateAnswer[] = [];
        for (const row of rows as any[]) {
            // 构造问题版本对象
            const questionVersion: StdQuestionVersion = {
                id: row.version_id,
                version: row.version_name,
                createdAt: new Date(row.version_created_at),
                content: row.question_content,
                category: row.version_category || undefined,
                tags: [], // 标签需要额外查询，但这里不是必需的
                answer: undefined, // 标准答案需要额外查询，但这里不是必需的
                stdQuestionId: row.std_question_id
            };

            candidate_answers.push({
                id: row.id,
                author: row.author,
                content: row.content,
                questionVersion: questionVersion
            });
        }

        return {
            total,
            candidate_answers
        };
    });
}