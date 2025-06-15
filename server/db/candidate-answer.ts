import {withConnection} from "~/server/db/connection";
import {ResultSetHeader} from "mysql2";
import {CandidateAnswer, StdQuestionWithoutAnswer} from "~/server/types/mysql";

export async function postCandidateAnswer(std_question_id: number, answer: string, username: string): Promise<number> {
    return await withConnection(async (conn) => {
        const [result] = await conn.execute(
            'INSERT INTO candidate_answer (author, content, std_question_id) VALUES (?, ?, ?)',
            [username, answer, std_question_id]
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
            conditions.push('NOT EXISTS (SELECT 1 FROM std_answer sa WHERE sa.std_question_version_id = sqv.id)');
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

        // 2. 获取分页数据
        const [rows] = await conn.execute(
            `SELECT ca.id, ca.author, ca.content, ca.std_question_version_id,
                    sq.id as sq_id, sqv.content as sq_content
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
            candidate_answers.push({
                id: row.id,
                author: row.author,
                content: row.content,
                std_question: {
                    id: row.sq_id,
                    content: row.sq_content,
                } as StdQuestionWithoutAnswer,
            });
        }

        return {
            total,
            candidate_answers
        };
    });
}