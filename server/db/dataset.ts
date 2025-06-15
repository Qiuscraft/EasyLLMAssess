import mysql from "mysql2/promise";
import {withConnection} from "~/server/db/connection";
import { StdQuestionVersion } from "~/server/types/mysql";

export async function createDataset(name: string, version: string, idList: number[]) {
  return await withConnection(async (conn: mysql.Connection) => {
    try {
      await conn.beginTransaction();

      // 插入数据集
      const [result] = await conn.execute(
        'INSERT INTO dataset (name) VALUES (?)',
        [name]
      );
      const datasetId = (result as mysql.ResultSetHeader).insertId;

      // 插入版本信息
      const [versionResult] = await conn.execute(
          'INSERT INTO dataset_version (name, dataset_id) VALUES (?, ?)',
          [version, datasetId]
      );
      const versionId = (versionResult as mysql.ResultSetHeader).insertId;

      // 插入数据集与题目版本ID的关联
      for (const id of idList) {
        await conn.execute(
          'INSERT INTO dataset_question (version_id, std_question_version_id) VALUES (?, ?)',
          [versionId, id]
        );
      }

      await conn.commit();
      return {
        dataset_id: datasetId,
        dataset_version_id: versionId,
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    }
  });
}

export async function getDatasets(id: number | undefined = undefined,
                                  name: string | undefined = undefined, version: string | undefined = undefined,
                                  order_field: string = 'created_at', order_by: string = 'desc',
                                  page: number = 1, page_size: number = 10){
  return await withConnection(async (conn: mysql.Connection) => {
    // 构建查询条件
    const conditions = [];
    const params = [];

    if (id !== undefined) {
      conditions.push('d.id = ?');
      params.push(id);
    }

    if (name !== undefined) {
      conditions.push('d.name LIKE ?');
      params.push(`%${name}%`);
    }

    if (version !== undefined) {
      conditions.push('dv.name LIKE ?');
      params.push(`%${version}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 处理排序
    const orderDirection = order_by === 'desc' ? 'DESC' : 'ASC';

    // 计算分页
    const offset = (page - 1) * page_size;

    // 查询总数
    const countQuery = `
      SELECT COUNT(DISTINCT d.id) as total
      FROM dataset d
      JOIN dataset_version dv ON d.id = dv.dataset_id
      ${whereClause}
    `;

    const [countResult] = await conn.execute(countQuery, params);
    const total = (countResult as any)[0].total;

    // 查询数据集基本信息
    const datasetsQuery = `
      SELECT DISTINCT d.id, d.name, MAX(dv.created_at) as latest_created_at
      FROM dataset d
      JOIN dataset_version dv ON d.id = dv.dataset_id
      ${whereClause}
      GROUP BY d.id, d.name
      ORDER BY latest_created_at ${orderDirection}
      LIMIT ${page_size} OFFSET ${offset}
    `;

    const [datasetsResult] = await conn.execute(datasetsQuery, [...params]);
    const datasetsMap = new Map();

    // 创建数据集对象
    for (const row of datasetsResult as any[]) {
      datasetsMap.set(row.id, {
        id: row.id,
        name: row.name,
        versions: []
      });
    }

    // 查询每个数据集的所有版本
    for (const datasetId of datasetsMap.keys()) {
      const versionsQuery = `
        SELECT 
          dv.id,
          dv.name as version,
          dv.created_at as createdAt
        FROM dataset_version dv
        WHERE dv.dataset_id = ?
        ORDER BY dv.created_at DESC
      `;

      const [versionsResult] = await conn.execute(versionsQuery, [datasetId]);
      const versions = [];

      // 处理每个版本
      for (const versionRow of versionsResult as any[]) {
        const versionId = versionRow.id;

        // 查询该版本关联的问题
        const questionsQuery = `
          SELECT 
            sq.id,
            sqv.id as version_id, 
            sqv.content,
            sqv.version,
            sqv.category,
            sqv.created_at,
            sqv.std_question_id
          FROM std_question sq
          JOIN std_question_version sqv ON sq.id = sqv.std_question_id
          JOIN dataset_question dq ON sqv.id = dq.std_question_version_id
          WHERE dq.version_id = ?
        `;

        const [questionsResult] = await conn.execute(questionsQuery, [versionId]);
        const stdQuestionVersions: StdQuestionVersion[] = [];

        for (const row of questionsResult as any[]) {
          // 为每个问题查询标签
          const tagsQuery = `
            SELECT t.tag
            FROM tag t
            JOIN question_tag qt ON t.id = qt.tag_id
            WHERE qt.std_question_version_id = ?
          `;

          const [tagsResult] = await conn.execute(tagsQuery, [row.version_id]);
          const tags = (tagsResult as any[]).map(tag => tag.tag);

          // 查询标准答案
          const answerQuery = `
            SELECT
              sa.id,
              sa.content
            FROM std_answer sa
            WHERE sa.std_question_version_id = ?
          `;

          const [answerResult] = await conn.execute(answerQuery, [row.version_id]);
          let answer = undefined;

          if ((answerResult as any[]).length > 0) {
            const answerRow = (answerResult as any[])[0];

            // 查询评分点
            const pointsQuery = `
              SELECT
                content,
                score
              FROM scoring_point
              WHERE std_answer_id = ?
            `;

            const [pointsResult] = await conn.execute(pointsQuery, [answerRow.id]);
            const scoringPoints = (pointsResult as any[]).map(point => ({
              content: point.content,
              score: point.score
            }));

            answer = {
              id: answerRow.id,
              content: answerRow.content,
              scoringPoints: scoringPoints
            };
          }

          // 构建符合 StdQuestionVersion 接口的对象
          const questionVersion: StdQuestionVersion = {
            id: row.version_id,
            version: row.version,
            createdAt: row.created_at,
            content: row.content,
            answer: answer,
            category: row.category || undefined,
            tags: tags.length > 0 ? tags : undefined,
            stdQuestionId: row.std_question_id
          };

          stdQuestionVersions.push(questionVersion);
        }

        // 构建版本对象
        versions.push({
          id: versionRow.id,
          version: versionRow.version,
          createdAt: versionRow.createdAt,
          stdQuestionVersions: stdQuestionVersions
        });
      }

      // 将版本数组添加到数据集对象
      datasetsMap.get(datasetId).versions = versions;
    }

    // 将 Map 转换为数组
    const datasets = Array.from(datasetsMap.values());

    return {
      datasets,
      total
    };
  });
}

export async function getDatasetVersionByVersionId(conn: mysql.Connection, versionId: number) {
  // 获取数据集版本的基础信息
  const [versionRows] = await conn.execute(
    `SELECT dv.id, dv.name as version, dv.created_at, d.id as dataset_id, d.name as dataset_name
     FROM dataset_version dv
     JOIN dataset d ON dv.dataset_id = d.id
     WHERE dv.id = ?`,
    [versionId]
  );

  // 如果没有找到数据集版本
  if (!Array.isArray(versionRows) || versionRows.length === 0) {
    return null;
  }

  const versionRow = versionRows[0] as any;

  // 获取与该版本关联的所有标准问题版本
  const [questionRows] = await conn.execute(
    `SELECT sqv.id, sqv.std_question_id, sqv.version, sqv.created_at, sqv.content, sqv.category
     FROM dataset_question dq
     JOIN std_question_version sqv ON dq.std_question_version_id = sqv.id
     WHERE dq.version_id = ?`,
    [versionId]
  );

  const stdQuestionVersions: StdQuestionVersion[] = [];

  // 对于每个标准问题版本，获取其答案和评分点
  if (Array.isArray(questionRows)) {
    for (const row of questionRows as any[]) {
      // 获取标准答案
      const [answerRows] = await conn.execute(
        `SELECT id, content
         FROM std_answer
         WHERE std_question_version_id = ?`,
        [row.id]
      );

      let stdAnswer = undefined;

      if (Array.isArray(answerRows) && answerRows.length > 0) {
        const answerRow = answerRows[0] as any;

        // 获取评分点
        const [scoringPointRows] = await conn.execute(
          `SELECT content, score
           FROM scoring_point
           WHERE std_answer_id = ?`,
          [answerRow.id]
        );

        const scoringPoints = Array.isArray(scoringPointRows)
          ? (scoringPointRows as any[]).map(sp => ({
              content: sp.content,
              score: sp.score
            }))
          : [];

        stdAnswer = {
          id: answerRow.id,
          content: answerRow.content,
          scoringPoints
        };
      }

      // 获取标签
      const [tagRows] = await conn.execute(
        `SELECT t.tag
         FROM question_tag qt
         JOIN tag t ON qt.tag_id = t.id
         WHERE qt.std_question_version_id = ?`,
        [row.id]
      );

      const tags = Array.isArray(tagRows)
        ? (tagRows as any[]).map(t => t.tag)
        : undefined;

      // 构建标准问题版本对象
      stdQuestionVersions.push({
        id: row.id,
        version: row.version,
        createdAt: row.created_at,
        content: row.content,
        answer: stdAnswer,
        category: row.category || undefined,
        tags,
        stdQuestionId: row.std_question_id
      });
    }
  }

  // 构建并返回完整的数据集版本对象
  return {
    id: versionRow.id,
    version: versionRow.version,
    createdAt: versionRow.created_at,
    stdQuestionVersions
  };
}
