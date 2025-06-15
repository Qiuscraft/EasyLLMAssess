import {getStandardQuestions} from "~/server/db/std-question";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);

    // 处理tags参数，可以是字符串或字符串数组
    let tags: string[] = [];
    if (query.tags) {
        if (Array.isArray(query.tags)) {
            tags = query.tags as string[];
        } else {
            // 如果是单个字符串，则可能是逗号分隔的多个标签
            tags = (query.tags as string).split(',').map(tag => tag.trim()).filter(tag => tag);
        }
    }

    const startTime = performance.now(); // 记录开始时间
    const result = await getStandardQuestions(
        query.id !== undefined ? Number(query.id) : undefined,
        query.content as string || '',
        query.answer as string || '',
        query.sort_by as string || 'desc',
        query.page !== undefined ? Number(query.page) : 1,
        query.page_size !== undefined ? Number(query.page_size) : 5,
        query.only_show_answered === 'true',
        query.only_show_no_answered === 'true',
        query.category as string || '',
        tags
    );
    const endTime = performance.now(); // 记录结束时间
    const delay = (endTime - startTime).toFixed(2); // 计算运行时间

    return {
        ...result,
        delay: Number(delay) // 返回运行时间，单位：毫秒
    };
})