CREATE TABLE src_question (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL
);

CREATE TABLE std_question (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    answer TEXT NOT NULL,
    src_id INT NOT NULL REFERENCES src_question(id)
);

CREATE TABLE tag (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(63) NOT NULL UNIQUE
);

CREATE TABLE std_question_tag (
    std_question_id INT NOT NULL REFERENCES std_question(id),
    tag_id INT NOT NULL REFERENCES tag(id),
    PRIMARY KEY (std_question_id, tag_id)
);

CREATE TABLE point (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    score DECIMAL NOT NULL
);

CREATE TABLE std_question_point (
    std_question_id INT NOT NULL REFERENCES std_question(id),
    point_id INT NOT NULL REFERENCES point(id),
    PRIMARY KEY (std_question_id, point_id)
);

CREATE TABLE candidate_answer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author VARCHAR(63) NOT NULL,
    content TEXT NOT NULL,
    std_question_id INT NOT NULL REFERENCES std_question(id)
);

CREATE TABLE model_answer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    std_question_id INT NOT NULL REFERENCES std_question(id)
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
    std_question_id INT NOT NULL REFERENCES std_question(id),
    PRIMARY KEY (version_id, std_question_id)
);

CREATE TABLE model (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(63) NOT NULL UNIQUE
);

CREATE TABLE assess (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id INT NOT NULL REFERENCES model(id),
    dataset_version_id INT NOT NULL REFERENCES dataset_version(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    score DECIMAL NOT NULL
);

CREATE TABLE model_answer_assess (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assess_id INT NOT NULL REFERENCES assess(id),
    model_answer_id INT NOT NULL REFERENCES model_answer(id),
    score DECIMAL NOT NULL
);

CREATE TABLE model_answer_assess_process (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_answer_assess_id INT NOT NULL REFERENCES model_answer_assess(id),
    point_id INT NOT NULL REFERENCES point(id),
    score DECIMAL NOT NULL
);
