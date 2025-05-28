import {withConnection} from "~/server/db/connection";
import mysql from "mysql2/promise";
import {Point, SrcQuestion, StdQuestion} from "~/server/types/inserting";

export async function importFromJsonString(json: string) {
  const data = JSON.parse(json);
  let srcQuestions: SrcQuestion[] = [];

  for (const item of data) {
    let stdQuestions: StdQuestion[] = [];
    for (const stdQuestionItem of item.std_questions) {
      let stdQuestion: StdQuestion = {
        question: stdQuestionItem.question,
        answer: stdQuestionItem.answer,
        points: stdQuestionItem.points.map((point: Point) => ({
          content: point.content,
          score: point.score
        }))
      };
      stdQuestions.push(stdQuestion);
    }

    let srcQuestion: SrcQuestion = {
      content: item.content,
      stdQuestions: stdQuestions
    }
    srcQuestions.push(srcQuestion);
  }

  return await importSrcQuestions(srcQuestions);
}

async function importSrcQuestion(srcQuestion: SrcQuestion) {
  return await importSrcQuestions([srcQuestion]);
}

async function importSrcQuestions(srcQuestions: SrcQuestion[]) {
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
        for (const stdQuestion of srcQuestion.stdQuestions) {
          // 插入标准问题
          const [stdQuestionResult] = await conn.execute(
              'INSERT INTO std_question (content, src_id) VALUES (?, ?)',
              [stdQuestion.question, srcId]
          );
          const stdQuestionId = (stdQuestionResult as mysql.ResultSetHeader).insertId;

          // 插入标准答案
          const [stdAnswerResult] = await conn.execute(
              'INSERT INTO std_answer (std_question_id, content) VALUES (?, ?)',
              [stdQuestionId, stdQuestion.answer]
          );
          const stdAnswerId = (stdAnswerResult as mysql.ResultSetHeader).insertId;

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
                'INSERT INTO std_answer_point (std_answer_id, point_id) VALUES (?, ?)',
                [stdAnswerId, pointId]
            );
          }
        }
      }
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    }
  });
}
