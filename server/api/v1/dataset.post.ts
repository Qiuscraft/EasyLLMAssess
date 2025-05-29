import {createDataset} from "~/server/db/dataset";

export default defineEventHandler(async (event) => {
    try {
        // 读取请求体
        const body = await readBody(event)

        const datasetName: string = body.dataset_name;
        const versionName: string = body.version_name;
        const id: number[] = body.std_questions;

        // 调用导入函数处理数据
        await createDataset(datasetName, versionName, id);

        // 返回成功响应
        return {
        }
    } catch (error) {
        throw error;
    }
})