import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Employee } from "@/types/payroll";
import { getEmployees, deleteEmployee, updateEmployee } from "@/lib/payrollStorage";
import { formatKES } from "@/lib/kenyanPayrollCalculator";
import { Plus, Search, MoreHorizontal, Edit, Trash2, UserX, UserCheck, Users } from "lucide-react";

interface EmployeeListProps {
  onAddEmployee: () => void;
  onEditEmployee: (employee: Employee) => void;
}

export function EmployeeList({ onAddEmployee, onEditEmployee }: EmployeeListProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (error: any) {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await deleteEmployee(employeeToDelete.id);
      toast.success("Employee deleted successfully");
      loadEmployees();
    } catch (error: any) {
      toast.error("Failed to delete employee");
    } finally {
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const handleToggleActive = async (employee: Employee) => {
    try {
      await updateEmployee(employee.id, { is_active: !employee.is_active });
      toast.success(`Employee ${employee.is_active ? 'deactivated' : 'activated'} successfully`);
      loadEmployees();
    } catch (error: any) {
      toast.error("Failed to update employee status");
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.job_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = employees.filter((e) => e.is_active).length;

  if (loading) {
    return <div className="flex justify-center p-8">Loading employees...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employees ({activeCount} active / {employees.length} total)
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button onClick={onAddEmployee}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "No employees found matching your search" : "No employees yet. Add your first employee to get started."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Basic Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id} className={!employee.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-mono text-sm">{employee.employee_id}</TableCell>
                    <TableCell className="font-medium">{employee.full_name}</TableCell>
                    <TableCell>{employee.job_title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {employee.employment_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatKES(employee.basic_salary)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.is_active ? "default" : "secondary"}>
                        {employee.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEditEmployee(employee)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(employee)}>
                            {employee.is_active ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setEmployeeToDelete(employee);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {employeeToDelete?.full_name}? This will also delete all their payroll records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
