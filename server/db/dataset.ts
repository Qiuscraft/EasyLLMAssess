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