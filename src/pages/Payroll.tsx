import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { EmployeeList } from "@/components/payroll/EmployeeList";
import { EmployeeForm } from "@/components/payroll/EmployeeForm";
import { PayrollProcessor } from "@/components/payroll/PayrollProcessor";
import { PayslipGenerator } from "@/components/payroll/PayslipGenerator";
import { P9FormGenerator } from "@/components/payroll/P9FormGenerator";
import { PayrollReports } from "@/components/payroll/PayrollReports";
import { Employee } from "@/types/payroll";
import { Users, Calculator, FileText, FileSpreadsheet, BarChart3 } from "lucide-react";

export default function Payroll() {
  const [activeTab, setActiveTab] = useState("employees");
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setShowEmployeeForm(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowEmployeeForm(true);
  };

  const handleEmployeeFormSuccess = () => {
    setShowEmployeeForm(false);
    setEditingEmployee(null);
  };

  const handleEmployeeFormCancel = () => {
    setShowEmployeeForm(false);
    setEditingEmployee(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calculator className="h-8 w-8 text-primary" />
            Payroll Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage employees, process payroll, and generate statutory reports
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="process" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Run Payroll
            </TabsTrigger>
            <TabsTrigger value="payslips" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Payslips
            </TabsTrigger>
            <TabsTrigger value="p9" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              P9 Forms
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            {showEmployeeForm ? (
              <EmployeeForm
                employee={editingEmployee}
                onSuccess={handleEmployeeFormSuccess}
                onCancel={handleEmployeeFormCancel}
              />
            ) : (
              <EmployeeList
                onAddEmployee={handleAddEmployee}
                onEditEmployee={handleEditEmployee}
              />
            )}
          </TabsContent>

          <TabsContent value="process">
            <PayrollProcessor />
          </TabsContent>

          <TabsContent value="payslips">
            <PayslipGenerator />
          </TabsContent>

          <TabsContent value="p9">
            <P9FormGenerator />
          </TabsContent>

          <TabsContent value="reports">
            <PayrollReports />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
