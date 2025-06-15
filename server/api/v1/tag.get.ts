import { searchTags } from "~/server/db/tag";

/**
 * 获取标签API接口
 * GET /api/v1/tag
 *
 * 查询参数:
 * tag - 可选，用于搜索相关标签的关键词
 * size - 可选，返回结果的最大数量，默认为10
 *
 * 返回:
 * 匹配的标签及其问题数量数组，按问题数量降序排序
 */
export default defineEventHandler(async (event) => {
  try {
    // 获取查询参数
    const query = getQuery(event);
    const searchTag = query.tag as string || '';

    // 获取size参数，默认为10
    let size = 10;
    if (query.size !== undefined) {
      const parsedSize = parseInt(query.size as string, 10);
      if (!isNaN(parsedSize) && parsedSize > 0) {
        size = parsedSize;
      }
    }

    // 调用数据库函数搜索标签
    const tags = await searchTags(searchTag, size);

    return tags;
  } catch (error) {
    console.error("Error fetching tags:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "服务器内部错误，无法获取标签列表",
    });
  }
});
