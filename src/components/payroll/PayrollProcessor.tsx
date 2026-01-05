import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Employee, PayrollRecord } from "@/types/payroll";
import { getActiveEmployees, getPayrollRecords, addPayrollRecord, getEmployeeDeductions } from "@/lib/payrollStorage";
import { calculatePayroll, formatKES, getMonthName } from "@/lib/kenyanPayrollCalculator";
import { Calculator, Play, CheckCircle, AlertCircle } from "lucide-react";

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

export function PayrollProcessor() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [existingRecords, setExistingRecords] = useState<PayrollRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [processing, setProcessing] = useState(false);
  const [payrollResults, setPayrollResults] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [emps, records] = await Promise.all([
        getActiveEmployees(),
        getPayrollRecords(selectedMonth, selectedYear),
      ]);
      setEmployees(emps);
      setExistingRecords(records);
      
      // Pre-calculate payroll for display
      const results = new Map();
      for (const emp of emps) {
        const deductions = await getEmployeeDeductions(emp.id);
        const otherDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
        
        const calculation = calculatePayroll({
          basicSalary: emp.basic_salary,
          housingAllowance: emp.housing_allowance,
          transportAllowance: emp.transport_allowance,
          otherTaxableAllowances: emp.other_taxable_allowances,
          nonTaxableAllowances: emp.non_taxable_allowances,
          overtimePay: 0,
          bonus: 0,
          otherDeductions,
        });
        
        results.set(emp.id, {
          ...calculation,
          hasExisting: records.some(r => r.employee_id === emp.id),
          otherDeductionsList: deductions,
        });
      }
      setPayrollResults(results);
    } catch (error: any) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const runPayroll = async () => {
    setProcessing(true);
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    try {
      for (const emp of employees) {
        const existing = existingRecords.find(r => r.employee_id === emp.id);
        if (existing) {
          skipCount++;
          continue;
        }

        const result = payrollResults.get(emp.id);
        if (!result) continue;

        try {
          await addPayrollRecord({
            employee_id: emp.id,
            pay_period_month: selectedMonth,
            pay_period_year: selectedYear,
            basic_salary: emp.basic_salary,
            housing_allowance: emp.housing_allowance,
            transport_allowance: emp.transport_allowance,
            other_taxable_allowances: emp.other_taxable_allowances,
            non_taxable_allowances: emp.non_taxable_allowances,
            overtime_pay: 0,
            bonus: 0,
            gross_pay: result.grossPay,
            taxable_income: result.taxableIncome,
            paye: result.paye,
            nssf_employee: result.nssfEmployee,
            nssf_employer: result.nssfEmployer,
            sha_deduction: result.shaDeduction,
            housing_levy_employee: result.housingLevyEmployee,
            housing_levy_employer: result.housingLevyEmployer,
            other_deductions: result.breakdown.deductions.otherDeductions,
            total_deductions: result.totalDeductions,
            net_pay: result.netPay,
            personal_relief: result.personalRelief,
            insurance_relief: result.insuranceRelief,
            is_locked: false,
            approved_by: null,
            approved_at: null,
            created_by: null,
          });
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Payroll processed for ${successCount} employee(s)`);
      }
      if (skipCount > 0) {
        toast.info(`${skipCount} employee(s) already had payroll records`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to process ${errorCount} employee(s)`);
      }

      loadData();
    } catch (error: any) {
      toast.error("Failed to run payroll");
    } finally {
      setProcessing(false);
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: getMonthName(i + 1),
  }));

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (loading) {
    return <div className="flex justify-center p-8">Loading payroll data...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Run Monthly Payroll
          </CardTitle>
          <CardDescription>
            Process payroll for all active employees for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex gap-4">
              <div>
                <Label>Month</Label>
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(v) => setSelectedMonth(parseInt(v))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="md:ml-auto flex items-end">
              <Button onClick={runPayroll} disabled={processing || employees.length === 0}>
                <Play className="h-4 w-4 mr-2" />
                {processing ? "Processing..." : "Run Payroll"}
              </Button>
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active employees found. Add employees first to run payroll.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Gross Pay</TableHead>
                    <TableHead className="text-right">PAYE</TableHead>
                    <TableHead className="text-right">NSSF</TableHead>
                    <TableHead className="text-right">SHA</TableHead>
                    <TableHead className="text-right">Housing Levy</TableHead>
                    <TableHead className="text-right">Other</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => {
                    const result = payrollResults.get(emp.id);
                    if (!result) return null;

                    return (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{emp.full_name}</div>
                            <div className="text-sm text-muted-foreground">{emp.employee_id}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatKES(result.grossPay)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          {formatKES(result.paye)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatKES(result.nssfEmployee)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatKES(result.shaDeduction)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatKES(result.housingLevyEmployee)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatKES(result.breakdown.deductions.otherDeductions)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">
                          {formatKES(result.netPay)}
                        </TableCell>
                        <TableCell>
                          {result.hasExisting ? (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              <CheckCircle className="h-3 w-3" />
                              Processed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <AlertCircle className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
