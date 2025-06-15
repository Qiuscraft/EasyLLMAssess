import mysql from "mysql2/promise";
import { ModelAnswer, StdQuestionVersion, ScoreProcess } from "../types/mysql";

/**
 * 获取指定评测ID的所有模型回答
 * @param conn MySQL数据库连接
 * @param assessmentId 评测ID
 * @returns 模型回答数组
 */
export async function getModelAnswersByAssessmentId(conn: mysql.Connection, assessmentId: number): Promise<ModelAnswer[]> {
  // 获取所有模型回答
  const [modelAnswers] = await conn.execute(`
    SELECT 
      ma.id, 
      ma.content, 
      ma.total_score as totalScore, 
      ma.std_question_version_id as stdQuestionVersionId,
      ma.assessment_id as assessmentId
    FROM model_answer ma
    WHERE ma.assessment_id = ?
  `, [assessmentId]);

  // 如果没有模型回答，返回空数组
  if (!Array.isArray(modelAnswers) || modelAnswers.length === 0) {
    return [];
  }

  const modelAnswersArray = modelAnswers as any[];

  // 获取所有模型回答ID和问题版本ID
  const modelAnswerIds = modelAnswersArray.map(ma => ma.id);
  const questionVersionIds = modelAnswersArray.map(ma => ma.stdQuestionVersionId);

  // 获取所有问题版本详情
  const [questionVersions] = await conn.execute(`
    SELECT 
      sqv.id, 
      sqv.std_question_id as stdQuestionId, 
      sqv.version, 
      sqv.created_at as createdAt, 
      sqv.content, 
      sqv.category
    FROM std_question_version sqv
    WHERE sqv.id IN (?)
  `, [questionVersionIds]);

  // 获取所有标准答案
  const [standardAnswers] = await conn.execute(`
    SELECT 
      sa.id, 
      sa.content, 
      sa.std_question_version_id as stdQuestionVersionId
    FROM std_answer sa
    WHERE sa.std_question_version_id IN (?)
  `, [questionVersionIds]);

  // 获取所有评分点
  let scoringPoints: any[] = [];
  if (Array.isArray(standardAnswers) && standardAnswers.length > 0) {
    const standardAnswerIds = (standardAnswers as any[]).map(sa => sa.id);
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
      scoringPoints = scoringPointsResult as any[];
    }
  }

  // 获取所有问题标签
  const [questionTags] = await conn.execute(`
    SELECT 
      qt.std_question_version_id as stdQuestionVersionId,
      t.tag
    FROM question_tag qt
    JOIN tag t ON qt.tag_id = t.id
    WHERE qt.std_question_version_id IN (?)
  `, [questionVersionIds]);

  // 使��getScoreProcesses函数获取所有模型回答的评分过程
  // 创建一个Map来存储每个模型回答ID对应的评分过程数组
  const scoreProcessMap = new Map<number, ScoreProcess[]>();

  // 并行获取所有模型回答的评分过程
  await Promise.all(
    modelAnswerIds.map(async (modelAnswerId) => {
      const processes = await getScoreProcesses(conn, modelAnswerId);
      scoreProcessMap.set(modelAnswerId, processes);
    })
  );

  // 构建标签映射
  const tagsMap = new Map();
  if (Array.isArray(questionTags)) {
    (questionTags as any[]).forEach(qt => {
      if (!tagsMap.has(qt.stdQuestionVersionId)) {
        tagsMap.set(qt.stdQuestionVersionId, []);
      }
      tagsMap.get(qt.stdQuestionVersionId).push(qt.tag);
    });
  }

  // 构建答案和评分点映射
  const answersMap = new Map();
  if (Array.isArray(standardAnswers)) {
    (standardAnswers as any[]).forEach(sa => {
      answersMap.set(sa.stdQuestionVersionId, {
        id: sa.id,
        content: sa.content,
        scoringPoints: []
      });
    });

    // 为每个答案添加评分点
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

  // 构建问题版本映射
  const questionVersionMap = new Map();
  if (Array.isArray(questionVersions)) {
    (questionVersions as any[]).forEach(qv => {
      const stdQuestionVersion: StdQuestionVersion = {
        id: qv.id,
        stdQuestionId: qv.stdQuestionId,
        version: qv.version,
        createdAt: qv.createdAt,
        content: qv.content,
        category: qv.category || undefined,
        tags: tagsMap.get(qv.id) || undefined,
        answer: answersMap.get(qv.id) || undefined
      };
      questionVersionMap.set(qv.id, stdQuestionVersion);
    });
  }

  // 构建并返回完整的模型回答数组
  return modelAnswersArray.map(ma => {
    const modelAnswer: ModelAnswer = {
      id: ma.id,
      content: ma.content,
      totalScore: ma.totalScore,
      stdQuestionVersionId: ma.stdQuestionVersionId,
      assessmentId: ma.assessmentId,
      questionVersion: questionVersionMap.get(ma.stdQuestionVersionId),
      scoreProcesses: scoreProcessMap.get(ma.id) || []
    };
    return modelAnswer;
  });
}

/**
 * 获取指定模型回答ID的所有评分过程
 * @param conn MySQL数据��连接
 * @param modelAnswerId 模型回答ID
 * @returns 评分过程数组
 */
export async function getScoreProcesses(conn: mysql.Connection, modelAnswerId: number): Promise<ScoreProcess[]> {
  // 查询指定模型回答ID的所有评分过程
  const [scoreProcesses] = await conn.execute(`
    SELECT 
      id, 
      type, 
      description, 
      score, 
      scoring_point_content as scoringPointContent,
      scoring_point_max_score as scoringPointMaxScore,
      model_answer_id as modelAnswerId
    FROM score_process
    WHERE model_answer_id = ?
    ORDER BY id ASC
  `, [modelAnswerId]);

  // 如果没有评分过程，返回空数组
  if (!Array.isArray(scoreProcesses) || scoreProcesses.length === 0) {
    return [];
  }

  return scoreProcesses as ScoreProcess[];
}
