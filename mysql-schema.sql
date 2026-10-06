CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(32) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  role ENUM('admin','team','validator','kaprodi','asesor') NOT NULL,
  active TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS criteria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(300) NOT NULL,
  sort_order INT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  expires_at VARCHAR(35) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(100) PRIMARY KEY,
  value LONGTEXT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS instrument_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(300) NOT NULL,
  source_url VARCHAR(2000) NOT NULL,
  source_sha256 CHAR(64) NOT NULL DEFAULT '',
  expected_indicators INT NOT NULL DEFAULT 58,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dimensions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  criterion_id INT NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(300) NOT NULL,
  sort_order INT NOT NULL,
  FOREIGN KEY (criterion_id) REFERENCES criteria(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS indicators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dimension_id INT NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  text TEXT NOT NULL,
  standard_type VARCHAR(50) NOT NULL DEFAULT 'LAM',
  source_ref VARCHAR(300) NOT NULL DEFAULT '',
  owner_user_id INT NULL,
  is_required_unggul TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dimension_id) REFERENCES dimensions(id),
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS evidence_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  source_unit VARCHAR(200) NOT NULL DEFAULT '',
  pic_label VARCHAR(100) NOT NULL DEFAULT '',
  validator_label VARCHAR(100) NOT NULL DEFAULT '',
  source_sheet VARCHAR(300) NOT NULL DEFAULT '',
  status ENUM('needed','collecting','uploaded','verified','revision') NOT NULL DEFAULT 'needed',
  due_date DATE NULL,
  notes VARCHAR(5000) NOT NULL DEFAULT '',
  owner_user_id INT NULL,
  validator_user_id INT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  FOREIGN KEY (validator_user_id) REFERENCES users(id),
  INDEX idx_evidence_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS evidence_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  evidence_id INT NOT NULL,
  stored_name VARCHAR(100) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime VARCHAR(100) NOT NULL,
  size INT NOT NULL,
  version INT NOT NULL,
  uploaded_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (evidence_id) REFERENCES evidence_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS evidence_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  url TEXT NOT NULL,
  url_hash CHAR(64) NOT NULL UNIQUE,
  title VARCHAR(300) NOT NULL,
  status ENUM('pending','verified','revision') NOT NULL DEFAULT 'pending',
  review_note VARCHAR(2000) NOT NULL DEFAULT '',
  created_by INT NOT NULL,
  reviewed_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS evidence_link_usage (
  evidence_id INT NOT NULL,
  link_id INT NOT NULL,
  PRIMARY KEY (evidence_id, link_id),
  FOREIGN KEY (evidence_id) REFERENCES evidence_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (link_id) REFERENCES evidence_links(id) ON DELETE CASCADE,
  INDEX idx_evidence_link_usage_link (link_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS indicator_evidence (
  indicator_id INT NOT NULL,
  evidence_id INT NOT NULL,
  mapping_note VARCHAR(2000) NOT NULL DEFAULT '',
  PRIMARY KEY (indicator_id, evidence_id),
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_id) REFERENCES evidence_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS narratives (
  indicator_id INT PRIMARY KEY,
  body LONGTEXT NOT NULL,
  source_url VARCHAR(2000) NOT NULL DEFAULT '',
  version INT NOT NULL DEFAULT 1,
  updated_by INT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  indicator_id INT NOT NULL,
  result ENUM('met','not_met') NOT NULL,
  rationale TEXT NOT NULL,
  status ENUM('submitted','revision','reviewed','approved') NOT NULL DEFAULT 'submitted',
  proposed_by INT NOT NULL,
  reviewed_by INT NULL,
  review_note VARCHAR(2000) NOT NULL DEFAULT '',
  approved_by INT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  approved_at DATETIME NULL,
  FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE,
  FOREIGN KEY (proposed_by) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  INDEX idx_assessments_indicator (indicator_id, id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS eligibility_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(300) NOT NULL,
  operator ENUM('>=','>','<=','<','=') NOT NULL,
  threshold DOUBLE NOT NULL,
  value DOUBLE NULL,
  unit VARCHAR(50) NOT NULL DEFAULT '',
  source_ref VARCHAR(500) NOT NULL,
  category ENUM('eligibility','qualification','publication') NOT NULL DEFAULT 'eligibility',
  metric VARCHAR(50) NOT NULL DEFAULT 'count',
  period_years INT NOT NULL DEFAULT 0,
  numerator INT NULL,
  denominator INT NULL,
  period_start DATE NULL,
  period_end DATE NULL,
  data_source VARCHAR(2000) NOT NULL DEFAULT '',
  evidence_id INT NULL,
  submitted_by INT NULL,
  approved_by INT NULL,
  approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (evidence_id) REFERENCES evidence_requests(id),
  FOREIGN KEY (submitted_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_id INT NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id INT NULL,
  details VARCHAR(1000) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_criteria (
  user_id INT NOT NULL,
  criterion_id INT NOT NULL,
  assigned_by INT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, criterion_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (criterion_id) REFERENCES criteria(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  INDEX idx_user_criteria_criterion (criterion_id)
) ENGINE=InnoDB;
