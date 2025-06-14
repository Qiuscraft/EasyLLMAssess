import type {StdQuestion, StdQuestionVersion} from "~/server/types/mysql";
import type {SerializeObject} from "nitropack";

export function sortStdQuestionVersionsByCreationTime(questions: StdQuestion[]): StdQuestion[] {
    if (!questions) {
        return [];
    }
    return questions.map(question => {
        const sortedVersions = [...question.versions].sort((a, b) => {
            return a.createdAt.getTime() - b.createdAt.getTime();
        });
        return { ...question, versions: sortedVersions };
    });
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