-- Migration: 021_drop_pdf_extraction_jobs
-- Description: Remove PDF extraction job tables (now handled by Sidequest)
-- Created: 2026-01-20

DROP TABLE IF EXISTS pdf_page_extraction_jobs;
DROP TABLE IF EXISTS pdf_extraction_jobs;
