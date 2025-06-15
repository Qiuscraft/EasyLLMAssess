import {InsertingScoringPoint} from "~/server/types/inserting";
import {setStandardAnswer} from "~/server/db/std-question";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)

        // 验证必要的参数存在
        if (!body.std_question_version_id || !body.answer) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Missing required parameters: std_question_version_id and answer are required',
            });
        }

        const standardQuestionVersionId = parseInt(body.std_question_version_id);
        const answer = body.answer as string;
        const scoringPoints = body.scoring_points as InsertingScoringPoint[];

        // 验证 scoringPoints 格式是否正确
        if (!Array.isArray(scoringPoints) || scoringPoints.some(point =>
            point.content.trim() === '')) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Invalid scoring points format. Each scoring point must have a non-empty content string and a numeric score.',
            });
        }

        await setStandardAnswer(standardQuestionVersionId, answer, scoringPoints);

        return { success: true };
    } catch (error) {
        console.error(error);
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || 'Unknown Error',
        });
    }
})