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

/**
 * 源问题接口 - 对应数据库中的 src_question 表
 */
export interface SrcQuestion {
    id: number;
    content: string;
    stdQuestions: StdQuestion[]; // 标准问题数组
}