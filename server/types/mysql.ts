import {InsertingPoint} from "~/server/types/inserting";

/**
 * 评分点接口 - 对应数据库中的 point 表
 */
export interface Point extends InsertingPoint {
    id: number;
}

/**
 * 标准问题接口 - 对应数据库中的 std_question 表
 */
export interface StdQuestion {
    id: number;
    content: string;  // 问题内
    answer: string;    // 答案内容
    points: Point[];   // 评分点数组
}

export interface SrcAnswer {
    id: number;
    content: string;
}

/**
 * 源问题接口 - 对应数据库中的 src_question 表
 */
export interface SrcQuestion {
    id: number;
    content: string;
    stdQuestions: StdQuestion[]; // 标准问题数组
    answers: SrcAnswer[];
}

export interface Dataset {
    id: number;
    name: string;
    version: string;
    created_at: string;
    questions: StdQuestion[];
}

export interface CandidateAnswer {
    id: number;
    std_question_id: number; // 标准问题 ID
    content: string;          // 答案内容
    author: string;       // 用户名
}
