export interface InsertingSrcQuestion {
    content: string;         // 源问题内容
    stdQuestions: InsertingStdQuestion[]; // 标准问题数组
    answers: string[];
}

export interface InsertingStdQuestion {
    versions: InsertingStdQuestionVersion[];
}

export interface InsertingStdQuestionVersion {
    content: string;  // 问题内容
    version: string;
    category: string | undefined;
    tags: string[] | undefined;
    answer: InsertingStdAnswer;
}

export interface InsertingStdAnswer {
    content: string;  // 标准答案内容
    scoringPoints: InsertingScoringPoint[]; // 评分点数组
}

export interface InsertingScoringPoint {
    content: string;  // 评分点内容
    score: number;    // 评分点分数
}
