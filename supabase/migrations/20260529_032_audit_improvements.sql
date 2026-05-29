-- ============================================================
-- Migration 032 — Audit improvements
-- 1. Fix performance_audit action CHECK (add acknowledged + gm_approved)
-- 2. Create admin_audit_unified VIEW for the admin audit log tab
-- ============================================================

-- 1. Fix performance_audit CHECK constraint
-- Drop and recreate — PostgreSQL has no ALTER CONSTRAINT
ALTER TABLE public.performance_audit
  DROP CONSTRAINT IF EXISTS performance_audit_action_check;

ALTER TABLE public.performance_audit
  ADD CONSTRAINT performance_audit_action_check
  CHECK (action IN (
    'created',
    'draft_saved',
    'submitted',
    'manager_reviewed',
    'hr_approved',
    'acknowledged',
    'gm_approved'
  ));

-- ============================================================
-- 2. Unified audit view — normalises all 4 audit tables into
--    a single chronological feed for the admin audit log UI.
--    security_invoker = true means RLS on underlying tables
--    is enforced — only hr_manager / system_admin can read.
-- ============================================================
DROP VIEW IF EXISTS public.admin_audit_unified;

CREATE VIEW public.admin_audit_unified
  WITH (security_invoker = true)
AS

-- admin_audit: admin panel actions, leave lifecycle, employee lifecycle etc.
SELECT
  aa.id,
  aa.timestamp,
  aa.actor_id,
  aa.actor_name,
  CASE aa.action
    WHEN 'balance_adjusted'      THEN 'leave'
    WHEN 'leave_type_updated'    THEN 'config'
    WHEN 'holiday_created'       THEN 'config'
    WHEN 'holiday_deleted'       THEN 'config'
    WHEN 'policy_uploaded'       THEN 'policy'
    WHEN 'policy_archived'       THEN 'policy'
    WHEN 'policy_restored'       THEN 'policy'
    WHEN 'employee_deleted'      THEN 'employee'
    WHEN 'employee_created'      THEN 'employee'
    WHEN 'employee_deactivated'  THEN 'employee'
    WHEN 'employee_reactivated'  THEN 'employee'
    WHEN 'document_uploaded'     THEN 'employee'
    WHEN 'leave_submitted'       THEN 'leave'
    WHEN 'leave_approved'        THEN 'leave'
    WHEN 'leave_rejected'        THEN 'leave'
    WHEN 'leave_cancelled'       THEN 'leave'
    WHEN 'announcement_published' THEN 'announcement'
    WHEN 'announcement_deleted'  THEN 'announcement'
    WHEN 'department_added'      THEN 'config'
    WHEN 'department_removed'    THEN 'config'
    WHEN 'grade_added'           THEN 'config'
    WHEN 'grade_removed'         THEN 'config'
    WHEN 'role_changed'          THEN 'config'
    WHEN 'report_exported'       THEN 'config'
    WHEN 'leave_accrual_run'     THEN 'leave'
    ELSE                              'config'
  END                          AS module,
  aa.action,
  aa.entity_label,
  aa.changes
FROM public.admin_audit aa

UNION ALL

-- employee_audit: profile field changes
SELECT
  ea.id,
  ea.timestamp,
  ea.actor_id,
  ea.actor_name,
  'employee'                                              AS module,
  'profile_changed'                                       AS action,
  CONCAT(e.first_name, ' ', e.last_name)                 AS entity_label,
  ea.changes
FROM public.employee_audit ea
LEFT JOIN public.employees e ON e.id = ea.employee_id

UNION ALL

-- performance_audit: review lifecycle events
SELECT
  pa.id,
  pa.timestamp,
  pa.actor_id,
  pa.actor_name,
  'performance'                                           AS module,
  pa.action,
  COALESCE(
    pa.employee_name || ' — ' || pa.cycle_name,
    pa.employee_name,
    pa.cycle_name
  )                                                       AS entity_label,
  '[]'::jsonb                                             AS changes
FROM public.performance_audit pa

UNION ALL

-- disciplinary_audit: disciplinary record events
SELECT
  da.id,
  da.timestamp,
  da.actor_id,
  da.actor_name,
  'disciplinary'                                          AS module,
  da.action,
  CONCAT(e.first_name, ' ', e.last_name)                 AS entity_label,
  da.changes
FROM public.disciplinary_audit da
LEFT JOIN public.disciplinary_records dr ON dr.id = da.record_id
LEFT JOIN public.employees e ON e.id = dr.employee_id;
