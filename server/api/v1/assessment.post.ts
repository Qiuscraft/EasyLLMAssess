import { createAssessment } from '~/server/db/assessment';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // 添加调试日志，打印请求体
  console.log('请求体内容:', JSON.stringify(body, null, 2));

  try {
    // 调用数据库函数创建评测
    const assessmentId = await createAssessment({
      dataset_version_id: body.dataset_version_id,
      model: body.model,
      model_answers: body.model_answers,
    });

    // 返回创建的评测ID
    return {
      assessment_id: assessmentId
    };
  } catch (error: any) {
    console.error('Error creating assessment:', error);

    // 设置适当的HTTP状态码并返回错误信息
    event.node.res.statusCode = 500;
    return {
      error: 'Failed to create assessment',
      message: error.message
    };
  }
});
