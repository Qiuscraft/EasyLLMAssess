import {withConnection} from "~/server/db/connection";
import mysql from "mysql2/promise";
import {
  InsertingScoringPoint,
  InsertingSrcQuestion,
  InsertingStdAnswer,
  InsertingStdQuestion,
  InsertingStdQuestionVersion
} from "~/server/types/inserting";

export async function importFromJsonString(json: string) {
  const data = JSON.parse(json);
  let srcQuestions: InsertingSrcQuestion[] = [];

  for (const item of data) {
    let stdQuestions: InsertingStdQuestion[] = [];
    for (const stdQuestionItem of item.std_questions) {
      let stdQuestion: InsertingStdQuestion = {versions: []};

      for (const stdQuestionVersionItem of stdQuestionItem.versions) {
        let scoringPoints = (stdQuestionVersionItem.answer.scoring_points || []).map((scoringPoint: InsertingScoringPoint) => ({
          content: scoringPoint.content,
          score: scoringPoint.score,
        }));

        let answer: InsertingStdAnswer = {
          content: stdQuestionVersionItem.answer.content,
          scoringPoints: scoringPoints,
        }

        let stdQuestionVersion: InsertingStdQuestionVersion = {
          content: stdQuestionVersionItem.content,
          version: stdQuestionVersionItem.version,
          category: stdQuestionVersionItem.category || undefined,
          tags: stdQuestionVersionItem.tags || undefined,
          answer: answer,
        }

        stdQuestion.versions.push(stdQuestionVersion);
      }

      stdQuestions.push(stdQuestion);
    }

    let srcQuestion: InsertingSrcQuestion = {
      content: item.content,
      stdQuestions: stdQuestions,
      answers: item.answers,
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
        for (const stdQuestion of srcQuestion.stdQuestions) {

          // 插入标准问题
          const [stdQuestionResult] = await conn.execute(
              'INSERT INTO std_question (src_id) VALUES (?)',
              [srcId]
          );
          const stdQuestionId = (stdQuestionResult as mysql.ResultSetHeader).insertId;

          // 处理每个标准问题版本
          for (const stdQuestionVersion of stdQuestion.versions) {

            // 插入标准问题版本
            const [stdQuestionVersionResult] = await conn.execute(
                'INSERT INTO std_question_version (std_question_id, version, content, category) VALUES (?, ?, ?, ?)',
                [stdQuestionId, stdQuestionVersion.version, stdQuestionVersion.content, stdQuestionVersion.category || null]
            );
            const stdQuestionVersionId = (stdQuestionVersionResult as mysql.ResultSetHeader).insertId;

            // 插入答案
            const answer = stdQuestionVersion.answer;
            const [answerResult] = await conn.execute(
                'INSERT INTO std_answer (std_question_version_id, content) VALUES (?, ?)',
                [stdQuestionVersionId, answer.content]
            );
            const answerId = (answerResult as mysql.ResultSetHeader).insertId;

            // 插入评分点
            for (const scoringPoint of answer.scoringPoints) {
              await conn.execute(
                  'INSERT INTO scoring_point (content, score, std_answer_id) VALUES (?, ?, ?)',
                  [scoringPoint.content, scoringPoint.score, answerId]
              );
            }

            if (stdQuestionVersion.tags && stdQuestionVersion.tags.length > 0) {
              for (const tagName of stdQuestionVersion.tags) {
                // 检查标签是否存在，不存在则插入
                let tagId: number;
                const [tagRows] = await conn.execute(
                    'SELECT id FROM tag WHERE tag = ?',
                    [tagName]
                ) as [any[], any];

                if (tagRows.length === 0) {
                  // 标签不存在，创建新标签
                  const [tagResult] = await conn.execute(
                      'INSERT INTO tag (tag) VALUES (?)',
                      [tagName]
                  );
                  tagId = (tagResult as mysql.ResultSetHeader).insertId;
                } else {
                  // 标签已存在，获取ID
                  tagId = tagRows[0].id;
                }

                // 创建问题与标签的关联
                await conn.execute(
                    'INSERT INTO question_tag (std_question_version_id, tag_id) VALUES (?, ?)',
                    [stdQuestionVersionId, tagId]
                );
              }
            }
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
