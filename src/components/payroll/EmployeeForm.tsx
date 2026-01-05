import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Employee } from "@/types/payroll";
import { addEmployee, updateEmployee, generateEmployeeId } from "@/lib/payrollStorage";
import { validateKRAPin, validateNationalID, validateNSSFNumber } from "@/lib/kenyanPayrollCalculator";
import { User, Briefcase, CreditCard } from "lucide-react";

interface EmployeeFormProps {
  employee?: Employee | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EmployeeForm({ employee, onSuccess, onCancel }: EmployeeFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: employee?.employee_id || generateEmployeeId(),
    full_name: employee?.full_name || "",
    national_id: employee?.national_id || "",
    kra_pin: employee?.kra_pin || "",
    nssf_number: employee?.nssf_number || "",
    sha_number: employee?.sha_number || "",
    job_title: employee?.job_title || "",
    employment_type: employee?.employment_type || "permanent",
    basic_salary: employee?.basic_salary || 0,
    housing_allowance: employee?.housing_allowance || 0,
    transport_allowance: employee?.transport_allowance || 0,
    other_taxable_allowances: employee?.other_taxable_allowances || 0,
    non_taxable_allowances: employee?.non_taxable_allowances || 0,
    hire_date: employee?.hire_date || "",
    bank_name: employee?.bank_name || "",
    bank_account: employee?.bank_account || "",
    is_active: employee?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }

    if (!validateNationalID(formData.national_id)) {
      toast.error("Invalid National ID format (7-8 digits required)");
      return;
    }

    if (!validateKRAPin(formData.kra_pin)) {
      toast.error("Invalid KRA PIN format (e.g., A123456789B)");
      return;
    }

    if (formData.nssf_number && !validateNSSFNumber(formData.nssf_number)) {
      toast.error("Invalid NSSF number format (9-10 digits)");
      return;
    }

    setLoading(true);
    try {
      if (employee) {
        await updateEmployee(employee.id, formData);
        toast.success("Employee updated successfully");
      } else {
        await addEmployee(formData as Omit<Employee, 'id' | 'created_at' | 'updated_at'>);
        toast.success("Employee added successfully");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="employee_id">Employee ID</Label>
            <Input
              id="employee_id"
              value={formData.employee_id}
              disabled
              className="bg-muted"
            />
          </div>
          <div>
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="national_id">National ID *</Label>
            <Input
              id="national_id"
              value={formData.national_id}
              onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
              placeholder="12345678"
              required
            />
          </div>
          <div>
            <Label htmlFor="kra_pin">KRA PIN *</Label>
            <Input
              id="kra_pin"
              value={formData.kra_pin}
              onChange={(e) => setFormData({ ...formData, kra_pin: e.target.value.toUpperCase() })}
              placeholder="A123456789B"
              required
            />
          </div>
          <div>
            <Label htmlFor="nssf_number">NSSF Number</Label>
            <Input
              id="nssf_number"
              value={formData.nssf_number}
              onChange={(e) => setFormData({ ...formData, nssf_number: e.target.value })}
              placeholder="1234567890"
            />
          </div>
          <div>
            <Label htmlFor="sha_number">SHA Number</Label>
            <Input
              id="sha_number"
              value={formData.sha_number}
              onChange={(e) => setFormData({ ...formData, sha_number: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="hire_date">Hire Date</Label>
            <Input
              id="hire_date"
              type="date"
              value={formData.hire_date}
              onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Employment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="job_title">Job Title *</Label>
            <Input
              id="job_title"
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="employment_type">Employment Type</Label>
            <Select
              value={formData.employment_type}
              onValueChange={(value) => setFormData({ ...formData, employment_type: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permanent">Permanent</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="basic_salary">Basic Salary (KES)</Label>
            <Input
              id="basic_salary"
              type="number"
              min="0"
              step="0.01"
              value={formData.basic_salary}
              onChange={(e) => setFormData({ ...formData, basic_salary: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="housing_allowance">Housing Allowance (KES)</Label>
            <Input
              id="housing_allowance"
              type="number"
              min="0"
              step="0.01"
              value={formData.housing_allowance}
              onChange={(e) => setFormData({ ...formData, housing_allowance: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="transport_allowance">Transport Allowance (KES)</Label>
            <Input
              id="transport_allowance"
              type="number"
              min="0"
              step="0.01"
              value={formData.transport_allowance}
              onChange={(e) => setFormData({ ...formData, transport_allowance: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="other_taxable_allowances">Other Taxable Allowances (KES)</Label>
            <Input
              id="other_taxable_allowances"
              type="number"
              min="0"
              step="0.01"
              value={formData.other_taxable_allowances}
              onChange={(e) => setFormData({ ...formData, other_taxable_allowances: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="non_taxable_allowances">Non-Taxable Allowances (KES)</Label>
            <Input
              id="non_taxable_allowances"
              type="number"
              min="0"
              step="0.01"
              value={formData.non_taxable_allowances}
              onChange={(e) => setFormData({ ...formData, non_taxable_allowances: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Bank Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bank_name">Bank Name</Label>
            <Input
              id="bank_name"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="bank_account">Bank Account Number</Label>
            <Input
              id="bank_account"
              value={formData.bank_account}
              onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : employee ? "Update Employee" : "Add Employee"}
        </Button>
      </div>
    </form>
  );
}
