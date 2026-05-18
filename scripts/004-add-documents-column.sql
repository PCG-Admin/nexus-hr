-- Add document_url column to leave_requests table
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN leave_requests.document_url IS 'URL to supporting document (medical certificate, etc.)';
