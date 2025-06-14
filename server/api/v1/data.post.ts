import { importFromJsonString } from '~/server/db/import'

export default defineEventHandler(async (event) => {
    try {
        // 读取请求体
        const body = await readBody(event)

        // 将请求体转换为JSON字符串
        const jsonString = JSON.stringify(body)

        // 调用导入函数处理数据
        await importFromJsonString(jsonString)

        // 返回成功响应
        return {
            success: true,
            message: 'success',
        }
    } catch (error) {
        console.error(error);
        // 返回错误响应
        return {
            success: false,
            message: error instanceof Error
                ? `${error.message}`
                : 'error',
        }
    }
})