export interface SrcQuestion {
    id: number;
    content: string;
    stdQuestions: StdQuestion[]; // 标准问题数组
    answers: SrcAnswer[];
}

export interface SrcAnswer {
    id: number;
    content: string;
}

export interface StdQuestion {
    id: number;
    versions: StdQuestionVersion[];
}

export interface StdQuestionVersion {
    id: number;
    version: string;
    createdAt: Date;
    content: string; // 问题内容
    answer: StdAnswer | undefined;
    category: string | undefined;
    tags: string[] | undefined;
    stdQuestionId: number;
}

export interface StdAnswer {
    id: number;
    content: string;
    scoringPoints: ScoringPoint[]; // 评分点数组
}

export interface ScoringPoint {
    content: string;  // 评分点内容
    score: number;    // 评分点分数
}

export interface StdQuestionWithoutAnswer {
    id: number;
    content: string;  // 问题内
}

export interface Dataset {
    id: number;
    name: string;
    version: string;
    created_at: string;
    questionVersions: StdQuestionVersion[];
}

export interface CandidateAnswer {
    id: number;
    std_question: StdQuestionWithoutAnswer;
    content: string;          // 答案内容
    author: string;       // 用户名
}
