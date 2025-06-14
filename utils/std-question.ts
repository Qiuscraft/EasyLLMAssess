import type {StdQuestion, StdQuestionVersion} from "~/server/types/mysql";
import type {SerializeObject} from "nitropack";

/**
 * 对单个标准问题的版本按创建时间排序
 * @param question 要排序版本的标准问题
 * @returns 版本已排序的标准问题
 */
export function sortStdQuestionVersionsByCreationTime(question: StdQuestion): StdQuestion {
    if (!question || !question.versions) {
        return question;
    }

    const sortedVersions = [...question.versions].sort((a, b) => {
        return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return { ...question, versions: sortedVersions };
}

/**
 * 对多个标准问题的版本按创建时间排序
 * @param questions 要排序版本的标准问题数组
 * @returns 版本已排序的标准问题数组
 */
export function sortStdQuestionsVersionsByCreationTime(questions: StdQuestion[]): StdQuestion[] {
    if (!questions) {
        return [];
    }
    return questions.map(question => sortStdQuestionVersionsByCreationTime(question));
}

export function getVersionByString(question: StdQuestion, versionString: string): StdQuestionVersion | undefined {
    return question.versions.find(v => v.version === versionString);
}

export function responseToStdQuestions(questions: SerializeObject<StdQuestion>[]): StdQuestion[] {
    if (!questions) {
        return [];
    }
    return questions.map(question => {
        // question is of type SerializeObject<StdQuestion>
        // question.versions should be of type SerializeObject<StdQuestionVersion>[]
        const deserializedVersions = question.versions.map(version => {
            // version is of type SerializeObject<StdQuestionVersion>
            // version.createdAt is expected to be a string
            return {
                ...version,
                createdAt: new Date(version.createdAt as string),
            } as StdQuestionVersion;
        });

        return {
            ...question,
            versions: deserializedVersions,
        } as StdQuestion;
    });
}