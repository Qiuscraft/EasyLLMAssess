import { getAssessments } from "~/server/db/assessment";

export default defineEventHandler(async (event) => {
  try {
    // 获取查询参数
    const query = getQuery(event);

    // 解析分页和排序参数
    const page = query.page ? parseInt(query.page as string) : 1;
    const pageSize = query.page_size ? parseInt(query.page_size as string) : 5;
    const sortOrder = (query.sort_order as string || 'desc') === 'asc' ? 'asc' : 'desc';

    // 验证参数
    if (isNaN(page) || page < 1) {
      throw createError({
        statusCode: 400,
        statusMessage: '页码必须是大于0的整数'
      });
    }

    if (isNaN(pageSize) || pageSize < 1) {
      throw createError({
        statusCode: 400,
        statusMessage: '每页条数必须是大于0的整数'
      });
    }

    // 调用数据库方法获取评测列表
    const assessments = await getAssessments(page, pageSize, sortOrder);

    // 返回结果
    return assessments;
  } catch (error: any) {
    console.error('获取评测列表失败:', error);

    // 如果是自定义错误，直接抛出
    if (error.statusCode) {
      throw error;
    }

    // 否则创建一个通用的500错误
    throw createError({
      statusCode: 500,
      statusMessage: '获取评测列表失败',
      data: error.message
    });
  }
});
