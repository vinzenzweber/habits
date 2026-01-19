-- Migration: 020_pdf_extraction_jobs
-- Description: Add tables for tracking PDF extraction jobs and page-level extraction
-- Created: 2026-01-19

-- ============================================
-- PDF Extraction Jobs (parent table)
-- ============================================

CREATE TABLE pdf_extraction_jobs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sidequest_job_id VARCHAR(100) UNIQUE,
  total_pages INTEGER,
  pages_processed INTEGER NOT NULL DEFAULT 0,
  recipes_extracted INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CHECK (status IN ('pending', 'processing', 'pages_queued', 'completed', 'failed', 'cancelled'))
);

-- Index for user dashboard queries (find user's jobs by status, newest first)
CREATE INDEX idx_pdf_jobs_user_status ON pdf_extraction_jobs(user_id, status, created_at DESC);

-- Index for SideQuest job ID lookups
CREATE INDEX idx_pdf_jobs_sidequest_id ON pdf_extraction_jobs(sidequest_job_id)
  WHERE sidequest_job_id IS NOT NULL;

COMMENT ON TABLE pdf_extraction_jobs IS 'Tracks PDF recipe extraction jobs. Each job processes a single PDF file and spawns page-level jobs.';
COMMENT ON COLUMN pdf_extraction_jobs.sidequest_job_id IS 'SideQuest job ID for the parent PDF processing job';
COMMENT ON COLUMN pdf_extraction_jobs.status IS 'Job status: pending (created), processing (PDF being parsed), pages_queued (page jobs spawned), completed, failed, or cancelled';

-- ============================================
-- PDF Page Extraction Jobs (child table)
-- ============================================

CREATE TABLE pdf_page_extraction_jobs (
  id SERIAL PRIMARY KEY,
  pdf_job_id INTEGER NOT NULL REFERENCES pdf_extraction_jobs(id) ON DELETE CASCADE,
  sidequest_job_id VARCHAR(100) UNIQUE,
  page_number INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  recipe_slug VARCHAR(200),
  recipe_title TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(pdf_job_id, page_number),
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped'))
);

-- Index for aggregation queries (count by status for a PDF job)
CREATE INDEX idx_page_jobs_pdf_job ON pdf_page_extraction_jobs(pdf_job_id, status);

-- Index for SideQuest job ID lookups
CREATE INDEX idx_page_jobs_sidequest_id ON pdf_page_extraction_jobs(sidequest_job_id)
  WHERE sidequest_job_id IS NOT NULL;

COMMENT ON TABLE pdf_page_extraction_jobs IS 'Tracks individual page extractions within a PDF job. Each page may or may not contain a recipe.';
COMMENT ON COLUMN pdf_page_extraction_jobs.status IS 'Page status: pending, processing, completed (recipe extracted), failed (error), or skipped (no recipe on page)';
COMMENT ON COLUMN pdf_page_extraction_jobs.recipe_slug IS 'Slug of extracted recipe (only set when status=completed)';
