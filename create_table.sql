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

CREATE TABLE tag(
    id INT AUTO_INCREMENT PRIMARY KEY,
    tag VARCHAR(63) NOT NULL UNIQUE
);

CREATE TABLE question_tag(
    std_question_version_id INT NOT NULL REFERENCES std_question_version(id),
    tag_id INT NOT NULL REFERENCES tag(id),
    PRIMARY KEY (std_question_version_id, tag_id)
);

CREATE TABLE std_answer(
    id INT AUTO_INCREMENT PRIMARY KEY,
    std_question_version_id INT NOT NULL REFERENCES std_question_version(id),
    content TEXT NOT NULL
);

CREATE TABLE scoring_point(
    content TEXT NOT NULL,
    score DECIMAL NOT NULL,
    std_answer_id INT NOT NULL REFERENCES std_answer(id)
);

CREATE TABLE candidate_answer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author VARCHAR(63) NOT NULL,
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
