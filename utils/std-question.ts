import type {StdQuestion, StdQuestionVersion} from "~/server/types/mysql";

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