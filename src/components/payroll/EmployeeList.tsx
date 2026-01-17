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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-5 w-5" />
              <span className="hidden xs:inline">Employees ({activeCount} active / {employees.length} total)</span>
              <span className="xs:hidden">Employees ({activeCount}/{employees.length})</span>
            </CardTitle>
          </div>
          <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 xs:flex-none">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full xs:w-48"
              />
            </div>
            <Button onClick={onAddEmployee} className="w-full xs:w-auto">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden xs:inline">Add Employee</span>
              <span className="xs:hidden">Add</span>
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
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-2 px-4">
              {filteredEmployees.map((employee) => (
                <div key={employee.id} className={`bg-muted/30 rounded-lg p-3 space-y-2 ${!employee.is_active ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{employee.full_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{employee.employee_id}</p>
                      <p className="text-sm text-muted-foreground">{employee.job_title}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">{formatKES(employee.basic_salary)}</p>
                      <Badge variant={employee.is_active ? "default" : "secondary"} className="mt-1">
                        {employee.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 pt-2 border-t border-border/50">
                    <Button variant="ghost" size="sm" onClick={() => onEditEmployee(employee)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive(employee)}>
                      {employee.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        setEmployeeToDelete(employee);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block px-4 sm:px-0">
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
