import {getSourceQuestions} from "~/server/db/src-question";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    return await getSourceQuestions(query.id !== undefined ? Number(query.id) : undefined,
        query.content as string || '',
        query.order_field as string || 'id',
        query.order_by as string || 'desc',
        query.page !== undefined ? Number(query.page) : 1,
        query.page_size !== undefined ? Number(query.page_size) : 5);
})