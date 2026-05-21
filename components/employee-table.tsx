"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Employee } from "@/lib/supabase/leave-service"
import { Pencil, Trash2 } from "lucide-react"

type EmployeeTableProps = {
  employees: Employee[]
  onEditEmployee: (employee: Employee) => void
  onDeleteEmployee: (employee: Employee) => void
}

export function EmployeeTable({ employees, onEditEmployee, onDeleteEmployee }: EmployeeTableProps) {
  const ROLE_LABELS: Record<string, string> = {
    employee:     "Employee",
    line_manager: "Line Manager",
    hr_manager:   "HR Manager",
    executive:    "Executive",
    system_admin: "System Admin",
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "system_admin": return "bg-red-100 text-red-800 border-red-300"
      case "hr_manager":   return "bg-purple-100 text-purple-800 border-purple-300"
      case "executive":    return "bg-amber-100 text-amber-800 border-amber-300"
      case "line_manager": return "bg-blue-100 text-blue-800 border-blue-300"
      case "employee":     return "bg-slate-100 text-slate-800 border-slate-300"
      default:             return "bg-slate-100 text-slate-800 border-slate-300"
    }
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Employee Number</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Hire Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell>
                <div>
                  <p className="font-medium">
                    {employee.firstName} {employee.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{employee.email}</p>
                </div>
              </TableCell>
              <TableCell>
                <code className="text-sm">{employee.employeeNumber || "N/A"}</code>
              </TableCell>
              <TableCell>{employee.department || "N/A"}</TableCell>
              <TableCell>
                <Badge className={getRoleBadgeClass(employee.role)} variant="outline">
                  {ROLE_LABELS[employee.role] ?? employee.role}
                </Badge>
              </TableCell>
              <TableCell>
                {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : "N/A"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEditEmployee(employee)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onDeleteEmployee(employee)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
