import { withConnection } from './connection';
import { ResultSetHeader } from 'mysql2';
import { getDatasetVersionByVersionId } from './dataset';
import { getModelAnswersByAssessmentId } from './model-answers';

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

export async function getAssessments(page: number = 1, pageSize: number = 5, sortOrder: 'asc' | 'desc' = 'desc'): Promise<any[]> {
  return withConnection(async (conn) => {
    const offset = (page - 1) * pageSize;

    // 获取评测列表
    const [assessments] = await conn.execute(`
      SELECT 
        a.id, 
        a.model, 
        a.total_score as totalScore, 
        a.dataset_version_id as datasetVersionId,
        d.name as datasetName
      FROM assessment a
      JOIN dataset_version dv ON a.dataset_version_id = dv.id
      JOIN dataset d ON dv.dataset_id = d.id
      ORDER BY a.id ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    // 如果没有评测记录，直接返回空数组
    if (!Array.isArray(assessments) || assessments.length === 0) {
      return [];
    }

    // 获取所有评测ID
    const assessmentIds = (assessments as any[]).map(a => a.id);

    // 使用 getDatasetVersionByVersionId 获取完整的���据集版本信息
    const datasetVersionsPromises = (assessments as any[]).map(a =>
      getDatasetVersionByVersionId(conn, a.datasetVersionId)
    );
    const datasetVersions = await Promise.all(datasetVersionsPromises);

    // 构建数据集版本ID到数据集版本的映射
    const datasetVersionMap = new Map();
    (assessments as any[]).forEach((a, index) => {
      datasetVersionMap.set(a.datasetVersionId, datasetVersions[index]);
    });

    // 使用 getModelAnswersByAssessmentId 获取每个评测的模型回答
    const modelAnswersPromises = (assessments as any[]).map(a =>
      getModelAnswersByAssessmentId(conn, a.id)
    );
    const allModelAnswers = await Promise.all(modelAnswersPromises);

    // 构建评测ID到模型回答的映射
    const modelAnswersMap = new Map();
    (assessments as any[]).forEach((a, index) => {
      modelAnswersMap.set(a.id, allModelAnswers[index]);
    });

    // 构建最终返回的评测列表
    return (assessments as any[]).map(a => {
      return {
        id: a.id,
        model: a.model,
        totalScore: a.totalScore,
        datasetName: a.datasetName,
        datasetVersionId: a.datasetVersionId,
        datasetVersion: datasetVersionMap.get(a.datasetVersionId),
        modelAnswers: modelAnswersMap.get(a.id) || [] // 使用从函数获取的模型回答
      };
    });
  });
}
