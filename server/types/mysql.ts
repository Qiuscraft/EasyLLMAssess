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
    versions: DatasetVersion[];
}

export interface DatasetVersion {
    id: number;
    version: string;
    createdAt: Date;
    stdQuestionVersions: StdQuestionVersion[];
}

export interface CandidateAnswer {
    id: number;
    content: string; // 答案内容
    author: string; // 用户名
    questionVersion: StdQuestionVersion
}

export interface Category {
    id: number;
    name: string;
    count: number;  // 每个分类下的问题数量
}

export interface TagCount {
    tag: string;     // 标签名称
    count: number;   // 该标签下的问题数量
}
