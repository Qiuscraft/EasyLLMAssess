import {withConnection} from "~/server/db/connection";
import mysql from "mysql2/promise";
import {InsertingPoint, InsertingSrcQuestion, InsertingStdQuestion} from "~/server/types/inserting";

export async function importFromJsonString(json: string) {
  const data = JSON.parse(json);
  let srcQuestions: InsertingSrcQuestion[] = [];

  for (const item of data) {
    let stdQuestions: InsertingStdQuestion[] = [];
    for (const stdQuestionItem of item.std_questions) {
      let stdQuestion: InsertingStdQuestion = {
        content: stdQuestionItem.question,
        answer: stdQuestionItem.answer || "", // 添加默认空字符串
        points: (stdQuestionItem.points || []).map((point: any) => ({
          content: point.content || "",
          score: point.score || 0
        }))
      };
      stdQuestions.push(stdQuestion);
    }

    const answers: string[] = item.answers || [];

    let srcQuestion: InsertingSrcQuestion = {
      content: item.content,
      std_questions: stdQuestions,
      answers: answers,
    }
    srcQuestions.push(srcQuestion);
  }

  return await importSrcQuestions(srcQuestions);
}

async function importSrcQuestions(srcQuestions: InsertingSrcQuestion[]) {
  return await withConnection(async (conn: mysql.Connection) => {
    try {
      await conn.beginTransaction();
      for (const srcQuestion of srcQuestions) {
        // 插入源问题
        const [srcResult] = await conn.execute(
            'INSERT INTO src_question (content) VALUES (?)',
            [srcQuestion.content]
        );
        const srcId = (srcResult as mysql.ResultSetHeader).insertId;

        // 处理每个标准问题
        for (const stdQuestion of srcQuestion.std_questions) {
          // 插入标准问题
          const [stdQuestionResult] = await conn.execute(
              'INSERT INTO std_question (content, answer, src_id) VALUES (?, ?, ?)',
              [stdQuestion.content, stdQuestion.answer, srcId]
          );
          const stdQuestionId = (stdQuestionResult as mysql.ResultSetHeader).insertId;

          // 处理每个评分点
          for (const point of stdQuestion.points) {
            // 插入评分点
            const [pointResult] = await conn.execute(
                'INSERT INTO point (content, score) VALUES (?, ?)',
                [point.content, point.score]
            );
            const pointId = (pointResult as mysql.ResultSetHeader).insertId;

            // 建立标准答案和评分点的关联
            await conn.execute(
                'INSERT INTO std_question_point (std_question_id, point_id) VALUES (?, ?)',
                [stdQuestionId, pointId]
            );
          }
        }

        // 插入源问题的答案
        for (const answer of srcQuestion.answers) {
          await conn.execute(
            'INSERT INTO src_answer (src_question_id, content) VALUES (?, ?)',
            [srcId, answer]
          );
        }
      }
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    }
  });
}
