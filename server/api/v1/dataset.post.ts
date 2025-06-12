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
        let message: string | undefined = undefined;
        // 处理特定类型的错误
        if (error.code === 'ER_DUP_ENTRY') {
            message = 'Dataset creation failed due to duplicate dataset name.'
        }

        return {
            error_message: message || 'An error occurred.',
        }
    }
})