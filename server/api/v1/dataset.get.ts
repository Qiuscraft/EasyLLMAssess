import {getDatasets} from "~/server/db/dataset";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);

    return await getDatasets(
        query.id !== undefined ? Number(query.id) : undefined,
        query.name as string,
        query.version as string,
        query.order_field as string || 'created_at',
        query.order_by as string || 'desc',
        query.page !== undefined ? Number(query.page) : 1,
        query.page_size !== undefined ? Number(query.page_size) : 10
    );
})