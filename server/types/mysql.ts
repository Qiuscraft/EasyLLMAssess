import { InsertingPoint, InsertingStdQuestion, InsertingSrcQuestion } from "~/server/types/inserting";

/**
 * 评分点接口 - 对应数据库中的 point 表
 */
export interface Point extends InsertingPoint {
    id: number;
}

/**
 * 标准问题接口 - 对应数据库中的 std_question 表
 */
export interface StdQuestion extends InsertingStdQuestion {
    id: number;
    src_id: number;   // 关联的源问题ID
}

/**
 * 源问题接口 - 对应数据库中的 src_question 表
 */
export interface SrcQuestion extends InsertingSrcQuestion {
    id: number;
}