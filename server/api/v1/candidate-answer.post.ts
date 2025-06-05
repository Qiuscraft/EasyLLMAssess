import {postCandidateAnswer} from "~/server/db/candidate-answer";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  return await postCandidateAnswer(body.std_question_id, body.answer, body.username);
})