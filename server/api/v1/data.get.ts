import {getData} from "~/server/db/data";

export default defineEventHandler(async () => {
    try {
        // 调用导入函数处理数据
        const data = await getData();

        // 返回成功响应
        return {
            success: true,
            message: 'success',
            data: data
        }
    } catch (error) {
        // 返回错误响应
        return {
            success: false,
            message: error instanceof Error
                ? `${error.message}`
                : 'error',
        }
    }
})