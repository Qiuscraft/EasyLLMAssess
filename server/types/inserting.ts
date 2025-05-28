/**
 * 评分点接口 - 对应数据库中的 point 表
 */
export interface InsertingPoint {
    content: string;  // 评分点内容
    score: number;    // 评分点分数
}

/**
 * 标准问题接口 - 对应数据库中的 std_question 和 std_answer 表
 */
export interface InsertingStdQuestion {
    question: string;  // 问题内容
    answer: string;    // 答案内容
    points: InsertingPoint[];   // 评分点数组
}

/**
 * 源问题接口 - 对应数据库中的 src_question 表
 */
export interface InsertingSrcQuestion {
    content: string;         // 源问题内容
    stdQuestions: InsertingStdQuestion[]; // 标准问题数组
}
