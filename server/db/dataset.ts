import mysql from "mysql2/promise";
import {withConnection} from "~/server/db/connection";

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

      // 插入数据集与题目ID的关联
      for (const id of idList) {
        await conn.execute(
          'INSERT INTO dataset_question (version_id, std_question_id) VALUES (?, ?)',
          [versionId, id]
        );
      }

      await conn.commit();
      return datasetId;
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
    const orderFieldMap = {
      'id': 'd.id',
      'name': 'd.name',
      'version': 'dv.name',
      'created_at': 'dv.created_at'
    };

    const mappedOrderField = orderFieldMap[order_field] || 'd.created_at';
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

    // 查询数据集
    const datasetsQuery = `
      SELECT 
        d.id, 
        d.name, 
        dv.name as version, 
        dv.created_at
      FROM dataset d
      JOIN dataset_version dv ON d.id = dv.dataset_id
      ${whereClause}
      ORDER BY ${mappedOrderField} ${orderDirection}
      LIMIT ${page_size} OFFSET ${offset}
    `;

    const [datasetsResult] = await conn.execute(datasetsQuery, [...params]);
    const datasets = datasetsResult as any[];

    // 查询每个数据集关联的问题
    for (const dataset of datasets) {
      const questionsQuery = `
        SELECT 
          sq.id, 
          sq.content, 
          sq.answer 
        FROM std_question sq
        JOIN dataset_question dq ON sq.id = dq.std_question_id
        JOIN dataset_version dv ON dq.version_id = dv.id
        WHERE dv.dataset_id = ?
      `;

      const [questionsResult] = await conn.execute(questionsQuery, [dataset.id]);
      const questions = (questionsResult as any[]).map(row => ({
        id: row.id,
        content: row.content,
        answer: row.answer,
        points: [] // 初始化points数组
      }));

      // 为每个问题查询关联的评分点
      for (const question of questions) {
        const pointsQuery = `
          SELECT
            p.id,
            p.content,
            p.score
          FROM point p
          JOIN std_question_point sqp ON p.id = sqp.point_id
          WHERE sqp.std_question_id = ?
        `;

        const [pointsResult] = await conn.execute(pointsQuery, [question.id]);
        question.points = (pointsResult as any[]).map(point => ({
          id: point.id,
          content: point.content,
          score: point.score
        }));
      }

      dataset.questions = questions;
    }

    return {
      datasets,
      total
    };
  });
}

