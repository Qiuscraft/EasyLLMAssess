import {getCandidateAnswer} from "~/server/db/candidate-answer";

export default defineEventHandler(async (event) => {
    // 获取所有查询参数
    const query = getQuery(event);

    // 解析并转换查询参数
    const id = query.id ? parseInt(query.id as string) : undefined;
    const std_question = query.std_question as string || '';
    const author = query.author as string || '';
    const content = query.content as string || '';

    // 处理排序参数
    const validOrderFields = ['id', 'std_question_id', 'author', 'content'];
    const sort_field = validOrderFields.includes(query.sort_field as string)
        ? query.sort_field as string
        : 'id';

    const sort_by = query.sort_by === 'asc' ? 'asc' : 'desc';

    // 处理分页参数
    const page = query.page ? Math.max(1, parseInt(query.page as string)) : 1;
    const page_size = query.page_size ? Math.max(1, parseInt(query.page_size as string)) : 10;

    const onlyShowNoStandardAnswer = query.only_show_no_std_answer === 'true';

    try {
        // 调用数据库函数获取候选回答
        const result = await getCandidateAnswer(
            id,
            std_question,
            author,
            content,
            sort_field,
            sort_by,
            page,
            page_size,
            onlyShowNoStandardAnswer,
        );

        return {
            total: result.total,
            candidate_answers: result.candidate_answers,
        };
    } catch (error) {
        console.log(error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Unknown Error',
        });
    }
});
