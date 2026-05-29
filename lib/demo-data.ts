import type { Employee, LeaveRequestWithEmployee } from "@/lib/supabase/leave-service"
import type { DisciplinaryRecord, AuditEntry } from "@/lib/supabase/disciplinary-service"

export const DEMO_EMPLOYEES: Employee[] = [
  { id: "demo-admin-001",     email: "admin@nexushr.com",     firstName: "Tricia",  lastName: "Williams",     employeeNumber: "EMP001", role: "system_admin", department: "Administration",   grade: 5, hireDate: "2021-01-01", jobTitle: "System Administrator", employmentType: "permanent", phone: "+27 86 000 0001", personalEmail: "tricia.williams@gmail.com",  address: "33 Pine Road, Midrand",       city: "Midrand",      postalCode: "1685", emergencyContactName: "Derek Williams",      emergencyContactPhone: "+27 75 000 0055", emergencyContactRelationship: "Husband", managerId: null,               idNumber: "8507180000089", dateOfBirth: "1985-07-18", postalAddress: null, gender: null, maritalStatus: null, language: null, numberOfDependants: null, spouseName: null, passportNumber: null, taxNumber: null, taxOffice: null, bankName: null, bankBranchCode: null, bankAccountNumber: null, bankAccountType: null, bankAccountHolderName: null, bankAccountRelationship: null, eeaGroup: null, eeaHasDisability: false, eeaDisabilityDescription: null, isActive: true },
  { id: "demo-manager-001",   email: "manager@nexushr.com",   firstName: "James",   lastName: "Naidoo",       employeeNumber: "EMP002", role: "line_manager", department: "Sales",            grade: 4, hireDate: "2023-06-01", jobTitle: "Sales Team Lead",      employmentType: "permanent", phone: "+27 83 000 0002", personalEmail: "james.naidoo@gmail.com",     address: "45 Elm Avenue, Rosebank",     city: "Johannesburg", postalCode: "2196", emergencyContactName: "Kavita Naidoo",       emergencyContactPhone: "+27 72 000 0088", emergencyContactRelationship: "Spouse",  managerId: null,               idNumber: "8805150000085", dateOfBirth: "1988-05-15", postalAddress: null, gender: null, maritalStatus: null, language: null, numberOfDependants: null, spouseName: null, passportNumber: null, taxNumber: null, taxOffice: null, bankName: null, bankBranchCode: null, bankAccountNumber: null, bankAccountType: null, bankAccountHolderName: null, bankAccountRelationship: null, eeaGroup: null, eeaHasDisability: false, eeaDisabilityDescription: null, isActive: true },
  { id: "demo-employee-001",  email: "employee@nexushr.com",  firstName: "Sarah",   lastName: "Dlamini",      employeeNumber: "EMP003", role: "employee",     department: "Sales",            grade: 2, hireDate: "2024-03-01", jobTitle: "Sales Consultant",     employmentType: "permanent", phone: "+27 82 000 0003", personalEmail: "sarah.dlamini@gmail.com",    address: "12 Oak Street, Sandton",      city: "Johannesburg", postalCode: "2196", emergencyContactName: "Thabo Dlamini",       emergencyContactPhone: "+27 71 000 0099", emergencyContactRelationship: "Brother", managerId: "demo-manager-001", idNumber: "9901010000083", dateOfBirth: "1999-01-01", postalAddress: null, gender: null, maritalStatus: null, language: null, numberOfDependants: null, spouseName: null, passportNumber: null, taxNumber: null, taxOffice: null, bankName: null, bankBranchCode: null, bankAccountNumber: null, bankAccountType: null, bankAccountHolderName: null, bankAccountRelationship: null, eeaGroup: null, eeaHasDisability: false, eeaDisabilityDescription: null, isActive: true },
  { id: "demo-hr-001",        email: "hr@nexushr.com",        firstName: "Priya",   lastName: "Patel",        employeeNumber: "EMP004", role: "hr_manager",   department: "Human Resources",  grade: 5, hireDate: "2022-09-01", jobTitle: "HR Manager",           employmentType: "permanent", phone: "+27 84 000 0004", personalEmail: "priya.patel@gmail.com",      address: "7 Maple Lane, Fourways",      city: "Johannesburg", postalCode: "2055", emergencyContactName: "Raj Patel",           emergencyContactPhone: "+27 73 000 0077", emergencyContactRelationship: "Husband", managerId: null,               idNumber: "9203220000086", dateOfBirth: "1992-03-22", postalAddress: null, gender: null, maritalStatus: null, language: null, numberOfDependants: null, spouseName: null, passportNumber: null, taxNumber: null, taxOffice: null, bankName: null, bankBranchCode: null, bankAccountNumber: null, bankAccountType: null, bankAccountHolderName: null, bankAccountRelationship: null, eeaGroup: null, eeaHasDisability: false, eeaDisabilityDescription: null, isActive: true },
  { id: "demo-executive-001", email: "executive@nexushr.com", firstName: "Michael", lastName: "van der Berg", employeeNumber: "EMP005", role: "executive",    department: "Executive",        grade: 6, hireDate: "2020-01-01", jobTitle: "General Manager",      employmentType: "permanent", phone: "+27 85 000 0005", personalEmail: "michael.vdberg@gmail.com",   address: "1 Acacia Drive, Morningside", city: "Johannesburg", postalCode: "2057", emergencyContactName: "Linda van der Berg",  emergencyContactPhone: "+27 74 000 0066", emergencyContactRelationship: "Spouse",  managerId: null,               idNumber: "7011290000087", dateOfBirth: "1970-11-29", postalAddress: null, gender: null, maritalStatus: null, language: null, numberOfDependants: null, spouseName: null, passportNumber: null, taxNumber: null, taxOffice: null, bankName: null, bankBranchCode: null, bankAccountNumber: null, bankAccountType: null, bankAccountHolderName: null, bankAccountRelationship: null, eeaGroup: null, eeaHasDisability: false, eeaDisabilityDescription: null, isActive: true },
]

const tricia  = DEMO_EMPLOYEES[0]  // demo-admin-001
const james   = DEMO_EMPLOYEES[1]  // demo-manager-001
const sarah   = DEMO_EMPLOYEES[2]  // demo-employee-001
const priya   = DEMO_EMPLOYEES[3]  // demo-hr-001
const michael = DEMO_EMPLOYEES[4]  // demo-executive-001

export const DEMO_LEAVE_REQUESTS: LeaveRequestWithEmployee[] = [
  // Sarah Dlamini — Sales
  { id: "demo-req-001", userId: "demo-employee-001", leaveTypeId: "demo-annual",  leaveTypeName: "Annual Leave",          startDate: "2026-05-26", endDate: "2026-05-29", daysRequested: 4, reason: "Family holiday",                          status: "pending",     reviewerId: null,               reviewerNotes: null,                                               reviewedAt: null,               managerReviewerId: null,               managerReviewedAt: null,               documentUrl: null, createdAt: "2026-05-20T08:00:00Z", updatedAt: "2026-05-20T08:00:00Z", employee: sarah, isOverride: true },
  { id: "demo-req-002", userId: "demo-employee-001", leaveTypeId: "demo-annual",  leaveTypeName: "Annual Leave",          startDate: "2026-06-10", endDate: "2026-06-13", daysRequested: 4, reason: "Mid-year break",                          status: "pending_hr", reviewerId: null,               reviewerNotes: null,                                               reviewedAt: null,               managerReviewerId: "demo-manager-001", managerReviewedAt: "2026-05-19T11:00:00Z", documentUrl: null, createdAt: "2026-05-15T09:00:00Z", updatedAt: "2026-05-19T11:00:00Z", employee: sarah },
  { id: "demo-req-003", userId: "demo-employee-001", leaveTypeId: "demo-sick",    leaveTypeName: "Sick Leave",            startDate: "2026-04-10", endDate: "2026-04-11", daysRequested: 2, reason: "Flu — medical certificate on file",       status: "approved",    reviewerId: "demo-hr-001",      reviewerNotes: "Approved. Get well soon.",                         reviewedAt: "2026-04-09T14:00:00Z", managerReviewerId: "demo-manager-001", managerReviewedAt: "2026-04-09T12:00:00Z", documentUrl: null, createdAt: "2026-04-09T09:00:00Z", updatedAt: "2026-04-09T14:00:00Z", employee: sarah },
  { id: "demo-req-004", userId: "demo-employee-001", leaveTypeId: "demo-annual",  leaveTypeName: "Annual Leave",          startDate: "2026-07-14", endDate: "2026-07-17", daysRequested: 4, reason: "Annual family trip",                      status: "approved",    reviewerId: "demo-hr-001",      reviewerNotes: "Approved.",                                        reviewedAt: "2026-06-01T10:00:00Z", managerReviewerId: "demo-manager-001", managerReviewedAt: "2026-05-31T09:00:00Z", documentUrl: null, createdAt: "2026-05-28T08:00:00Z", updatedAt: "2026-06-01T10:00:00Z", employee: sarah },
  { id: "demo-req-005", userId: "demo-employee-001", leaveTypeId: "demo-family",  leaveTypeName: "Family Responsibility", startDate: "2026-03-15", endDate: "2026-03-15", daysRequested: 1, reason: "Sick child",                              status: "rejected",    reviewerId: "demo-manager-001", reviewerNotes: "Please resubmit with supporting documentation.",   reviewedAt: "2026-03-14T16:00:00Z", managerReviewerId: null,               managerReviewedAt: null,               documentUrl: null, createdAt: "2026-03-14T10:00:00Z", updatedAt: "2026-03-14T16:00:00Z", employee: sarah },
  // James Naidoo — Sales (line manager)
  { id: "demo-req-006", userId: "demo-manager-001", leaveTypeId: "demo-annual",  leaveTypeName: "Annual Leave",           startDate: "2026-05-04", endDate: "2026-05-08", daysRequested: 5, reason: "Annual leave",                            status: "approved",    reviewerId: "demo-hr-001",      reviewerNotes: "Approved.",                                        reviewedAt: "2026-04-25T10:00:00Z", managerReviewerId: null,               managerReviewedAt: null,               documentUrl: null, createdAt: "2026-04-24T09:00:00Z", updatedAt: "2026-04-25T10:00:00Z", employee: james },
  // Priya Patel — Human Resources
  { id: "demo-req-007", userId: "demo-hr-001",      leaveTypeId: "demo-annual",  leaveTypeName: "Annual Leave",           startDate: "2026-02-16", endDate: "2026-02-18", daysRequested: 3, reason: "Personal leave",                          status: "approved",    reviewerId: "demo-admin-001",   reviewerNotes: "Approved.",                                        reviewedAt: "2026-02-10T10:00:00Z", managerReviewerId: null,               managerReviewedAt: null,               documentUrl: null, createdAt: "2026-02-09T09:00:00Z", updatedAt: "2026-02-10T10:00:00Z", employee: priya },
  // Michael van der Berg — Executive
  { id: "demo-req-008", userId: "demo-executive-001", leaveTypeId: "demo-annual", leaveTypeName: "Annual Leave",          startDate: "2026-01-12", endDate: "2026-01-21", daysRequested: 8, reason: "New Year break",                          status: "approved",    reviewerId: "demo-hr-001",      reviewerNotes: "Approved.",                                        reviewedAt: "2025-12-20T10:00:00Z", managerReviewerId: null,               managerReviewedAt: null,               documentUrl: null, createdAt: "2025-12-19T09:00:00Z", updatedAt: "2025-12-20T10:00:00Z", employee: michael },
  // Tricia Williams — Administration
  { id: "demo-req-009", userId: "demo-admin-001",   leaveTypeId: "demo-sick",    leaveTypeName: "Sick Leave",             startDate: "2026-03-03", endDate: "2026-03-04", daysRequested: 2, reason: "Flu",                                    status: "approved",    reviewerId: "demo-hr-001",      reviewerNotes: "Approved. Get well soon.",                         reviewedAt: "2026-03-02T10:00:00Z", managerReviewerId: null,               managerReviewedAt: null,               documentUrl: null, createdAt: "2026-03-02T09:00:00Z", updatedAt: "2026-03-02T10:00:00Z", employee: tricia },
]

export const DEMO_DISCIPLINARY_RECORDS: DisciplinaryRecord[] = [
  {
    id: "demo-dis-001",
    employeeId: "demo-employee-001",
    type: "written_warning",
    incidentDate: "2026-02-10",
    hearingDate: "2026-02-14",
    description: "Employee was absent without authorisation for 2 consecutive days (3–4 February 2026) and failed to notify her line manager or HR prior to or during the absence. A formal hearing was conducted on 14 February 2026.",
    outcome: "Written warning issued. Employee acknowledged receipt. Valid for 12 months from date of issue.",
    status: "finalised",
    documentUrl: null,
    createdBy: "demo-manager-001",
    createdByName: "James Naidoo",
    createdAt: "2026-02-14T15:00:00Z",
    updatedAt: "2026-02-14T16:30:00Z",
  },
  {
    id: "demo-dis-002",
    employeeId: "demo-employee-001",
    type: "verbal_warning",
    incidentDate: "2026-04-22",
    hearingDate: null,
    description: "Employee was 45 minutes late to a client-facing team briefing on 22 April 2026 without prior notice. This is the second instance of tardiness in the current quarter.",
    outcome: null,
    status: "draft",
    documentUrl: null,
    createdBy: "demo-manager-001",
    createdByName: "James Naidoo",
    createdAt: "2026-04-22T14:00:00Z",
    updatedAt: "2026-04-22T14:00:00Z",
  },
]

export const DEMO_AUDIT_ENTRIES: AuditEntry[] = [
  {
    id: "audit-001",
    recordId: "demo-dis-001",
    action: "created",
    actorId: "demo-manager-001",
    actorName: "James Naidoo",
    timestamp: "2026-02-14T15:00:00Z",
    changes: [
      { field: "type",         label: "Incident Type", previousValue: null, newValue: "Written Warning" },
      { field: "incidentDate", label: "Incident Date", previousValue: null, newValue: "2026-02-10" },
      { field: "hearingDate",  label: "Hearing Date",  previousValue: null, newValue: "2026-02-14" },
      { field: "description",  label: "Description",   previousValue: null, newValue: "Employee was absent without authorisation for 2 consecutive days…" },
    ],
  },
  {
    id: "audit-002",
    recordId: "demo-dis-001",
    action: "edited",
    actorId: "demo-manager-001",
    actorName: "James Naidoo",
    timestamp: "2026-02-14T16:00:00Z",
    changes: [
      { field: "outcome", label: "Outcome", previousValue: null, newValue: "Written warning issued. Employee acknowledged receipt…" },
    ],
  },
  {
    id: "audit-003",
    recordId: "demo-dis-001",
    action: "finalised",
    actorId: "demo-manager-001",
    actorName: "James Naidoo",
    timestamp: "2026-02-14T16:30:00Z",
    changes: [
      { field: "status", label: "Status", previousValue: "Draft", newValue: "Finalised" },
    ],
  },
  {
    id: "audit-004",
    recordId: "demo-dis-002",
    action: "created",
    actorId: "demo-manager-001",
    actorName: "James Naidoo",
    timestamp: "2026-04-22T14:00:00Z",
    changes: [
      { field: "type",         label: "Incident Type", previousValue: null, newValue: "Verbal Warning" },
      { field: "incidentDate", label: "Incident Date", previousValue: null, newValue: "2026-04-22" },
      { field: "description",  label: "Description",   previousValue: null, newValue: "Employee was 45 minutes late to a client-facing team briefing…" },
    ],
  },
]
