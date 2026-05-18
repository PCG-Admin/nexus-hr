// Database client for SQL queries (mock implementation without integration)
// In production, this would use the actual database connection

export type User = {
  id: string
  email: string
  firstName: string
  lastName: string
  employeeNumber: string
  role: "employee" | "manager" | "admin"
  managerId: string | null
  department: string | null
  hireDate: string
  createdAt: string
  updatedAt: string
}

export type LeaveBalance = {
  id: string
  userId: string
  leaveType: string
  totalDays: number
  usedDays: number
  availableDays: number
  year: number
}

export type LeaveRequest = {
  id: string
  userId: string
  leaveType: string
  startDate: string
  endDate: string
  daysRequested: number
  reason: string | null
  status: "pending" | "approved" | "rejected" | "cancelled"
  managerId: string | null
  managerNotes: string | null
  reviewedAt: string | null
  documentUrl: string | null
  createdAt: string
  updatedAt: string
}

export type LeaveType = {
  id: string
  name: string
  description: string | null
  defaultDaysPerYear: number
  accrualType: "annual" | "monthly" | "fixed"
  requiresDocumentation: boolean
  color: string | null
}

// Mock data for demo (would be replaced with actual DB queries)
export const mockUsers: User[] = [
  {
    id: "1",
    email: "john.doe@company.co.za",
    firstName: "John",
    lastName: "Doe",
    employeeNumber: "EMP004",
    role: "employee",
    managerId: "2",
    department: "Engineering",
    hireDate: "2021-02-01",
    createdAt: "2021-02-01T00:00:00Z",
    updatedAt: "2021-02-01T00:00:00Z",
  },
  {
    id: "2",
    email: "manager1@company.co.za",
    firstName: "David",
    lastName: "Smith",
    employeeNumber: "EMP002",
    role: "manager",
    managerId: null,
    department: "Engineering",
    hireDate: "2020-03-01",
    createdAt: "2020-03-01T00:00:00Z",
    updatedAt: "2020-03-01T00:00:00Z",
  },
  {
    id: "3",
    email: "admin@company.co.za",
    firstName: "Sarah",
    lastName: "Johnson",
    employeeNumber: "EMP001",
    role: "admin",
    managerId: null,
    department: "Human Resources",
    hireDate: "2020-01-15",
    createdAt: "2020-01-15T00:00:00Z",
    updatedAt: "2020-01-15T00:00:00Z",
  },
  {
    id: "4",
    email: "jane.smith@company.co.za",
    firstName: "Jane",
    lastName: "Smith",
    employeeNumber: "EMP005",
    role: "employee",
    managerId: "2",
    department: "Engineering",
    hireDate: "2021-05-10",
    createdAt: "2021-05-10T00:00:00Z",
    updatedAt: "2021-05-10T00:00:00Z",
  },
  {
    id: "5",
    email: "mike.brown@company.co.za",
    firstName: "Mike",
    lastName: "Brown",
    employeeNumber: "EMP006",
    role: "employee",
    managerId: "2",
    department: "Engineering",
    hireDate: "2022-01-20",
    createdAt: "2022-01-20T00:00:00Z",
    updatedAt: "2022-01-20T00:00:00Z",
  },
]

export const mockLeaveTypes: LeaveType[] = [
  {
    id: "1",
    name: "Annual Leave",
    description: "Paid annual leave as per BCEA - minimum 21 consecutive days per year",
    defaultDaysPerYear: 21,
    accrualType: "annual",
    requiresDocumentation: false,
    color: "#10b981",
  },
  {
    id: "2",
    name: "Sick Leave",
    description: "Paid sick leave - 30 days per 3-year cycle",
    defaultDaysPerYear: 10,
    accrualType: "annual",
    requiresDocumentation: true,
    color: "#ef4444",
  },
  {
    id: "3",
    name: "Family Responsibility Leave",
    description: "Paid leave for family matters - 3 days per year",
    defaultDaysPerYear: 3,
    accrualType: "annual",
    requiresDocumentation: false,
    color: "#f59e0b",
  },
]

export const mockLeaveBalances: LeaveBalance[] = [
  {
    id: "1",
    userId: "1",
    leaveType: "Annual Leave",
    totalDays: 21,
    usedDays: 0,
    availableDays: 21,
    year: 2025,
  },
  {
    id: "2",
    userId: "1",
    leaveType: "Sick Leave",
    totalDays: 10,
    usedDays: 0,
    availableDays: 10,
    year: 2025,
  },
  {
    id: "3",
    userId: "1",
    leaveType: "Family Responsibility Leave",
    totalDays: 3,
    usedDays: 0,
    availableDays: 3,
    year: 2025,
  },
]

export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: "1",
    userId: "1",
    leaveType: "Annual Leave",
    startDate: "2025-02-10",
    endDate: "2025-02-14",
    daysRequested: 5,
    reason: "Family vacation",
    status: "pending",
    managerId: "2",
    managerNotes: null,
    reviewedAt: null,
    documentUrl: null,
    createdAt: "2025-01-07T10:00:00Z",
    updatedAt: "2025-01-07T10:00:00Z",
  },
  {
    id: "2",
    userId: "4",
    leaveType: "Sick Leave",
    startDate: "2025-02-05",
    endDate: "2025-02-06",
    daysRequested: 2,
    reason: "Medical appointment",
    status: "pending",
    managerId: "2",
    managerNotes: null,
    reviewedAt: null,
    documentUrl: "/documents/medical-cert-sample.pdf",
    createdAt: "2025-01-06T14:30:00Z",
    updatedAt: "2025-01-06T14:30:00Z",
  },
  {
    id: "3",
    userId: "5",
    leaveType: "Annual Leave",
    startDate: "2025-03-15",
    endDate: "2025-03-22",
    daysRequested: 6,
    reason: "Personal travel",
    status: "approved",
    managerId: "2",
    managerNotes: "Approved - no conflicts with project deadlines",
    reviewedAt: "2025-01-05T09:15:00Z",
    documentUrl: null,
    createdAt: "2025-01-04T11:00:00Z",
    updatedAt: "2025-01-05T09:15:00Z",
  },
  {
    id: "4",
    userId: "1",
    leaveType: "Family Responsibility Leave",
    startDate: "2024-12-20",
    endDate: "2024-12-20",
    daysRequested: 1,
    reason: "Child care emergency",
    status: "approved",
    managerId: "2",
    managerNotes: "Approved under BCEA family responsibility provisions",
    reviewedAt: "2024-12-19T16:00:00Z",
    documentUrl: null,
    createdAt: "2024-12-19T15:30:00Z",
    updatedAt: "2024-12-19T16:00:00Z",
  },
]
