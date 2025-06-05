import {withConnection} from "~/server/db/connection";
import {ResultSetHeader} from "mysql2";

export async function postCandidateAnswer(std_question_id: number, answer: string, username: string): Promise<number> {
    return await withConnection(async (conn) => {
        const [result] = await conn.execute(
            'INSERT INTO candidate_answer (author, content, std_question_id) VALUES (?, ?, ?)',
            [username, answer, std_question_id]
        );

        return (result as ResultSetHeader).insertId;
    });
}