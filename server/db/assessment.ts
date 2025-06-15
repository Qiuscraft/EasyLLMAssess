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
        dv.id as datasetVersion_id,
        dv.name as datasetVersion_version,
        dv.created_at as datasetVersion_createdAt,
        dv.dataset_id as datasetVersion_datasetId
      FROM assessment a
      JOIN dataset_version dv ON a.dataset_version_id = dv.id
      ORDER BY a.id ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
      LIMIT ? OFFSET ?
    `, [pageSize, offset]);

    // 如果没有评测记录，直接返回空数组
    if (!Array.isArray(assessments) || assessments.length === 0) {
      return [];
    }

    // 获取所有评测ID
    const assessmentIds = (assessments as any[]).map(a => a.id);

    // 获取所有模型回答
    const [modelAnswers] = await conn.execute(`
      SELECT 
        ma.id, 
        ma.content, 
        ma.total_score as totalScore, 
        ma.std_question_version_id as stdQuestionVersionId,
        ma.assessment_id as assessmentId,
        sqv.id as questionVersion_id,
        sqv.version as questionVersion_version,
        sqv.created_at as questionVersion_createdAt,
        sqv.content as questionVersion_content,
        sqv.category as questionVersion_category,
        sqv.std_question_id as questionVersion_stdQuestionId
      FROM model_answer ma
      JOIN std_question_version sqv ON ma.std_question_version_id = sqv.id
      WHERE ma.assessment_id IN (?)
    `, [assessmentIds]);

    // 如果没有模型回答，将评测记录转换为需要的格式并返回
    if (!Array.isArray(modelAnswers) || modelAnswers.length === 0) {
      return (assessments as any[]).map(a => ({
        id: a.id,
        model: a.model,
        totalScore: a.totalScore,
        datasetVersion: {
          id: a.datasetVersion_id,
          version: a.datasetVersion_version,
          createdAt: a.datasetVersion_createdAt,
          datasetId: a.datasetVersion_datasetId,
          stdQuestionVersions: []
        },
        modelAnswers: []
      }));
    }

    // 获取所有模型回答ID
    const modelAnswerIds = (modelAnswers as any[]).map(ma => ma.id);

    // 获取所有评分过程
    const [scoreProcesses] = await conn.execute(`
      SELECT 
        sp.id, 
        sp.type, 
        sp.description, 
        sp.score, 
        sp.scoring_point_content as scoringPointContent,
        sp.scoring_point_max_score as scoringPointMaxScore,
        sp.model_answer_id as modelAnswerId
      FROM score_process sp
      WHERE sp.model_answer_id IN (?)
    `, [modelAnswerIds]);

    // 获取所有问题版本的标准答案和评分点
    const questionVersionIds = (modelAnswers as any[]).map(ma => ma.stdQuestionVersionId);
    const [standardAnswers] = await conn.execute(`
      SELECT 
        sa.id, 
        sa.content, 
        sa.std_question_version_id as stdQuestionVersionId
      FROM std_answer sa
      WHERE sa.std_question_version_id IN (?)
    `, [questionVersionIds]);

    // 获取所有评分点
    const standardAnswerIds = Array.isArray(standardAnswers) ? (standardAnswers as any[]).map(sa => sa.id) : [];
    let scoringPoints: any[] = [];

    if (standardAnswerIds.length > 0) {
      const [scoringPointsResult] = await conn.execute(`
        SELECT 
          sp.id, 
          sp.content, 
          sp.score, 
          sp.std_answer_id as stdAnswerId
        FROM scoring_point sp
        WHERE sp.std_answer_id IN (?)
      `, [standardAnswerIds]);

      if (Array.isArray(scoringPointsResult)) {
        scoringPoints = scoringPointsResult;
      }
    }

    // 获取问题标签
    const [questionTags] = await conn.execute(`
      SELECT 
        qt.std_question_version_id as stdQuestionVersionId,
        t.tag
      FROM question_tag qt
      JOIN tag t ON qt.tag_id = t.id
      WHERE qt.std_question_version_id IN (?)
    `, [questionVersionIds]);

    // 将数据组织成所需的结构
    const tagsMap = new Map();
    if (Array.isArray(questionTags)) {
      (questionTags as any[]).forEach(qt => {
        if (!tagsMap.has(qt.stdQuestionVersionId)) {
          tagsMap.set(qt.stdQuestionVersionId, []);
        }
        tagsMap.get(qt.stdQuestionVersionId).push(qt.tag);
      });
    }

    // 将标准答案与评分点关联
    const answersMap = new Map();
    if (Array.isArray(standardAnswers)) {
      (standardAnswers as any[]).forEach(sa => {
        answersMap.set(sa.stdQuestionVersionId, {
          id: sa.id,
          content: sa.content,
          scoringPoints: []
        });
      });

      scoringPoints.forEach(sp => {
        const answer = Array.from(answersMap.values()).find(a => a.id === sp.stdAnswerId);
        if (answer) {
          answer.scoringPoints.push({
            content: sp.content,
            score: sp.score
          });
        }
      });
    }

    // 将评分过程与模型���答关联
    const scoreProcessesMap = new Map();
    if (Array.isArray(scoreProcesses)) {
      (scoreProcesses as any[]).forEach(sp => {
        if (!scoreProcessesMap.has(sp.modelAnswerId)) {
          scoreProcessesMap.set(sp.modelAnswerId, []);
        }
        scoreProcessesMap.get(sp.modelAnswerId).push({
          id: sp.id,
          type: sp.type,
          description: sp.description,
          score: sp.score,
          scoringPointContent: sp.scoringPointContent,
          scoringPointMaxScore: sp.scoringPointMaxScore
        });
      });
    }

    // 将模型回答与评测关联
    const modelAnswersMap = new Map();
    (modelAnswers as any[]).forEach(ma => {
      if (!modelAnswersMap.has(ma.assessmentId)) {
        modelAnswersMap.set(ma.assessmentId, []);
      }

      const questionVersion = {
        id: ma.questionVersion_id,
        version: ma.questionVersion_version,
        createdAt: ma.questionVersion_createdAt,
        content: ma.questionVersion_content,
        category: ma.questionVersion_category,
        stdQuestionId: ma.questionVersion_stdQuestionId,
        tags: tagsMap.get(ma.stdQuestionVersionId) || [],
        answer: answersMap.get(ma.stdQuestionVersionId) || undefined
      };

      modelAnswersMap.get(ma.assessmentId).push({
        id: ma.id,
        content: ma.content,
        totalScore: ma.totalScore,
        questionVersion,
        scoreProcesses: scoreProcessesMap.get(ma.id) || []
      });
    });

    // 构建最终返回的评测列表
    return (assessments as any[]).map(a => ({
      id: a.id,
      model: a.model,
      totalScore: a.totalScore,
      datasetVersion: {
        id: a.datasetVersion_id,
        version: a.datasetVersion_version,
        createdAt: a.datasetVersion_createdAt,
        datasetId: a.datasetVersion_datasetId
      },
      modelAnswers: modelAnswersMap.get(a.id) || []
    }));
  });
}
