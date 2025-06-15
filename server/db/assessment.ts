import { withConnection } from './connection';
import { ResultSetHeader } from 'mysql2';

export interface ScoreProcess {
  type: string;
  description: string;
  score: number;
  scoring_point_content: string;
  scoring_point_max_score: number;
}

export interface ModelAnswer {
  content: string;
  std_question_version_id: number;
  score_processes: ScoreProcess[];
}

export interface Assessment {
  dataset_version_id: number;
  model: string;
  model_answers: ModelAnswer[];
}

export async function createAssessment(assessment: Assessment): Promise<number> {
  return withConnection(async (conn) => {
    // 开始事务
    await conn.beginTransaction();

    try {
      // 1. 插入assessment记录
      const [assessmentResult] = await conn.execute<ResultSetHeader>(
        'INSERT INTO assessment (model, total_score, dataset_version_id) VALUES (?, 0, ?)',
        [assessment.model, assessment.dataset_version_id]
      );

      const assessmentId = assessmentResult.insertId;

      // 2. 插入model_answer记录和score_process记录
      for (const modelAnswer of assessment.model_answers) {
        // 插入model_answer
        const [modelAnswerResult] = await conn.execute<ResultSetHeader>(
          'INSERT INTO model_answer (content, total_score, std_question_version_id, assessment_id) VALUES (?, 0, ?, ?)',
          [modelAnswer.content, modelAnswer.std_question_version_id, assessmentId]
        );

        const modelAnswerId = modelAnswerResult.insertId;

        // 插入score_process记录
        for (const scoreProcess of modelAnswer.score_processes) {

          // 检查是否有undefined值并提供默认值
          const type = scoreProcess.type || '';
          const description = scoreProcess.description || '';
          const score = scoreProcess.score || 0;
          const scoringPointContent = scoreProcess.scoring_point_content || '';
          // 如果scoring_point_max_score为undefined，则设��为0或合适的默认值
          const scoringPointMaxScore = scoreProcess.scoring_point_max_score !== undefined
            ? scoreProcess.scoring_point_max_score
            : 0;

          await conn.execute(
            'INSERT INTO score_process (type, description, score, scoring_point_content, scoring_point_max_score, model_answer_id) VALUES (?, ?, ?, ?, ?, ?)',
            [
              type,
              description,
              score,
              scoringPointContent,
              scoringPointMaxScore,
              modelAnswerId
            ]
          );
        }
      }

      // 提交事务
      await conn.commit();

      return assessmentId;
    } catch (error) {
      // 发生错误，回滚事务
      await conn.rollback();
      throw error;
    }
  });
}
