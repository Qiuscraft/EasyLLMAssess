import { withConnection } from "~/server/db/connection";
import { Category } from "~/server/types/mysql";

export default defineEventHandler(async (event) => {
  try {
    const categories = await withConnection(async (conn) => {
      // 查询所有分类及其问题数量
      const [rows] = await conn.execute(
        `SELECT id, name, question_count as count FROM category ORDER BY name`
      );

      return rows as Category[];
    });

    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "服务器内部错误，无法获取分类列表",
    });
  }
});
