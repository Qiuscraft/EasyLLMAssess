import {createDataset} from "~/server/db/dataset";

export default defineEventHandler(async (event) => {
    try {
        // 读取请求体
        const body = await readBody(event)

        const datasetName: string = body.dataset_name;
        const versionName: string = body.version_name;
        const id: number[] = body.std_questions;

        // 调用导入函数处理数据
        return await createDataset(datasetName, versionName, id);
    } catch (error) {
        let message: string = 'Unknown error.';

        // 检查是否为 MySQL 错误
        if (error &&
            typeof error === 'object' &&
            'code' in error &&
            typeof error.code === 'string') {

            // 现在可以安全地检查 MySQL 的错误代码
            if (error.code === 'ER_DUP_ENTRY') {
                message = 'Dataset creation failed due to duplicate dataset name.'
            }
        }

        if (message === 'Unknown error.') {
            console.log(error);
        }

        return {
            error_message: message,
        }
    }
})