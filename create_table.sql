CREATE TABLE src_question (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL
);

CREATE TABLE src_answer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    src_question_id INT NOT NULL REFERENCES src_question(id)
);

CREATE TABLE std_question (
    id INT AUTO_INCREMENT PRIMARY KEY,
    src_id INT NOT NULL REFERENCES src_question(id)
);

CREATE TABLE std_question_version(
    id INT AUTO_INCREMENT PRIMARY KEY,
    std_question_id INT NOT NULL REFERENCES std_question(id),
    version VARCHAR(63) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    content TEXT NOT NULL,
    category VARCHAR(63)
);

-- 创建category表，存储所有唯一的分类值
CREATE TABLE category (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(63) NOT NULL UNIQUE,
    question_count INT NOT NULL DEFAULT 0 -- 添加计数字段，记录每个分类下的问题数量
);

-- 创建触发器，在插入std_question_version时自动更新category表
DELIMITER //
CREATE TRIGGER after_std_question_version_insert
AFTER INSERT ON std_question_version
FOR EACH ROW
BEGIN
    IF NEW.category IS NOT NULL AND NEW.category != '' THEN
        -- 使用INSERT ... ON DUPLICATE KEY UPDATE语法，如果分类已存在则增加计数
        INSERT INTO category (name, question_count)
        VALUES (NEW.category, 1)
        ON DUPLICATE KEY UPDATE question_count = question_count + 1;
    END IF;
END//

-- 创建触发器，在更新std_question_version时自动更新category表
CREATE TRIGGER after_std_question_version_update
AFTER UPDATE ON std_question_version
FOR EACH ROW
BEGIN
    -- 如果分类发生了变化
    IF (OLD.category IS NULL AND NEW.category IS NOT NULL AND NEW.category != '')
       OR (OLD.category IS NOT NULL AND OLD.category != '' AND NEW.category IS NOT NULL AND NEW.category != '' AND OLD.category != NEW.category) THEN

        -- 如果旧分类存在，减少其计数
        IF OLD.category IS NOT NULL AND OLD.category != '' THEN
            UPDATE category SET question_count = question_count - 1 WHERE name = OLD.category;
            -- ��果计数变为0，删除该分类
            DELETE FROM category WHERE name = OLD.category AND question_count <= 0;
        END IF;

        -- 增加新分类的计数
        INSERT INTO category (name, question_count)
        VALUES (NEW.category, 1)
        ON DUPLICATE KEY UPDATE question_count = question_count + 1;
    END IF;
END//

-- 创建触发器，删除不再被引用的category（清理）
CREATE TRIGGER after_std_question_version_delete
AFTER DELETE ON std_question_version
FOR EACH ROW
BEGIN
    IF OLD.category IS NOT NULL AND OLD.category != '' THEN
        -- 减少对应分类的计数
        UPDATE category SET question_count = question_count - 1 WHERE name = OLD.category;
        -- 如果计数变为0，删除该分类
        DELETE FROM category WHERE name = OLD.category AND question_count <= 0;
    END IF;
END//
DELIMITER ;

CREATE TABLE tag(
    id INT AUTO_INCREMENT PRIMARY KEY,
    tag VARCHAR(63) NOT NULL UNIQUE,
    question_count INT NOT NULL DEFAULT 0 -- 添加计数字段，记录每个标签下的问题数量
);

CREATE TABLE question_tag(
    std_question_version_id INT NOT NULL REFERENCES std_question_version(id),
    tag_id INT NOT NULL REFERENCES tag(id),
    PRIMARY KEY (std_question_version_id, tag_id)
);

-- 创建触发器，在插入question_tag时自动更新tag表中的计数
DELIMITER //
CREATE TRIGGER after_question_tag_insert
    AFTER INSERT ON question_tag
    FOR EACH ROW
BEGIN
    -- 增加标签引用计数
    UPDATE tag SET question_count = question_count + 1 WHERE id = NEW.tag_id;
END//

-- 创建触发器，在删除question_tag时自动更新tag表中的计数
CREATE TRIGGER after_question_tag_delete
    AFTER DELETE ON question_tag
    FOR EACH ROW
BEGIN
    -- 减少标签引用计数
    UPDATE tag SET question_count = question_count - 1 WHERE id = OLD.tag_id;
    -- 如果计数变为0，可以选择删除该标签（可选）
    -- DELETE FROM tag WHERE id = OLD.tag_id AND question_count <= 0;
END//
DELIMITER ;

CREATE TABLE std_answer(
    id INT AUTO_INCREMENT PRIMARY KEY,
    std_question_version_id INT NOT NULL REFERENCES std_question_version(id),
    content TEXT NOT NULL
);

CREATE TABLE scoring_point(
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    score DECIMAL NOT NULL,
    std_answer_id INT NOT NULL REFERENCES std_answer(id)
);

CREATE TABLE candidate_answer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author VARCHAR(63) NOT NULL,
    content TEXT NOT NULL,
    std_question_version_id INT NOT NULL REFERENCES std_question_version(id)
);

CREATE TABLE dataset (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(63) NOT NULL UNIQUE
);

CREATE TABLE dataset_version (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(63) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dataset_id INT NOT NULL REFERENCES dataset(id)
);

CREATE TABLE dataset_question (
    version_id INT NOT NULL REFERENCES dataset_version(id),
    std_question_version_id INT NOT NULL REFERENCES std_question_version(id),
    PRIMARY KEY (version_id, std_question_version_id)
);

CREATE TABLE assessment(
    id INT AUTO_INCREMENT PRIMARY KEY,
    model VARCHAR(63) NOT NULL,
    total_score DECIMAL NOT NULL,
    dataset_version_id INT NOT NULL REFERENCES dataset_version(id)
);

CREATE TABLE model_answer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    total_score DECIMAL NOT NULL,
    std_question_version_id INT NOT NULL REFERENCES std_question_version(id),
    assessment_id INT NOT NULL REFERENCES assessment(id)
);

CREATE TABLE score_process(
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(63) NOT NULL,
    description TEXT NOT NULL,
    score DECIMAL NOT NULL,
    scoring_point_content TEXT NOT NULL,
    scoring_point_max_score DECIMAL NOT NULL,
    model_answer_id INT NOT NULL REFERENCES model_answer(id)
);

-- 添加触发器来自动更新model_answer的total_score
DELIMITER //

-- 当添加新的score_process记录时，更新相关model_answer的total_score
CREATE TRIGGER after_score_process_insert
AFTER INSERT ON score_process
FOR EACH ROW
BEGIN
    UPDATE model_answer
    SET total_score = (
        SELECT SUM(score)
        FROM score_process
        WHERE model_answer_id = NEW.model_answer_id
    )
    WHERE id = NEW.model_answer_id;
END//

-- 当更新score_process记录时，更新相关model_answer的total_score
CREATE TRIGGER after_score_process_update
AFTER UPDATE ON score_process
FOR EACH ROW
BEGIN
    UPDATE model_answer
    SET total_score = (
        SELECT SUM(score)
        FROM score_process
        WHERE model_answer_id = NEW.model_answer_id
    )
    WHERE id = NEW.model_answer_id;
END//

-- 当删除score_process记录时，更新相关model_answer的total_score
CREATE TRIGGER after_score_process_delete
AFTER DELETE ON score_process
FOR EACH ROW
BEGIN
    UPDATE model_answer
    SET total_score = COALESCE((
        SELECT SUM(score)
        FROM score_process
        WHERE model_answer_id = OLD.model_answer_id
    ), 0)
    WHERE id = OLD.model_answer_id;
END//

-- 添加触发器来自动更新assessment的total_score
-- 当添加新的model_answer记录时，更新相关assessment的total_score
CREATE TRIGGER after_model_answer_insert
AFTER INSERT ON model_answer
FOR EACH ROW
BEGIN
    UPDATE assessment
    SET total_score = (
        SELECT SUM(total_score)
        FROM model_answer
        WHERE assessment_id = NEW.assessment_id
    )
    WHERE id = NEW.assessment_id;
END//

-- 当更新model_answer记录时，更新相关assessment的total_score
CREATE TRIGGER after_model_answer_update
AFTER UPDATE ON model_answer
FOR EACH ROW
BEGIN
    IF OLD.total_score != NEW.total_score OR OLD.assessment_id != NEW.assessment_id THEN
        -- 更新旧assessment的total_score（如果assessment_id发生了变化）
        IF OLD.assessment_id != NEW.assessment_id THEN
            UPDATE assessment
            SET total_score = COALESCE((
                SELECT SUM(total_score)
                FROM model_answer
                WHERE assessment_id = OLD.assessment_id
            ), 0)
            WHERE id = OLD.assessment_id;
        END IF;

        -- 更新新assessment的total_score
        UPDATE assessment
        SET total_score = (
            SELECT SUM(total_score)
            FROM model_answer
            WHERE assessment_id = NEW.assessment_id
        )
        WHERE id = NEW.assessment_id;
    END IF;
END//

-- 当删除model_answer记录时，更新相关assessment的total_score
CREATE TRIGGER after_model_answer_delete
AFTER DELETE ON model_answer
FOR EACH ROW
BEGIN
    UPDATE assessment
    SET total_score = COALESCE((
        SELECT SUM(total_score)
        FROM model_answer
        WHERE assessment_id = OLD.assessment_id
    ), 0)
    WHERE id = OLD.assessment_id;
END//

DELIMITER ;
