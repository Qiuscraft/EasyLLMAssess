import {InsertingScoringPoint} from "~/server/types/inserting";
import {setStandardAnswer} from "~/server/db/std-question";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)

        const standardQuestionId = body.std_question_id as number;
        const answer = body.answer as string;
        const scoringPoints = body.scoring_points as InsertingScoringPoint[];

        await setStandardAnswer(standardQuestionId, answer, scoringPoints);
    } catch (error) {
        console.error(error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Unknown Error',
        });
    }
})