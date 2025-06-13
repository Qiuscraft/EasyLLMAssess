import {getStandardQuestions} from "~/server/db/std-question";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    return await getStandardQuestions(
        query.id !== undefined ? Number(query.id) : undefined,
        query.content as string || '',
        query.answer as string || '',
        query.sort_by as string || 'desc',
        query.page !== undefined ? Number(query.page) : 1,
        query.page_size !== undefined ? Number(query.page_size) : 5,
        query.only_show_answered === 'true',
    );
})