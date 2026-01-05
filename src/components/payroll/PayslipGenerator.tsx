import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Employee, PayrollRecord } from "@/types/payroll";
import { getActiveEmployees, getEmployeePayrollRecords, getEmployee } from "@/lib/payrollStorage";
import { formatKES, getMonthName } from "@/lib/kenyanPayrollCalculator";
import { FileText, Printer, Download } from "lucide-react";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

const currentYear = new Date().getFullYear();

interface CompanySettings {
  company_name: string;
  company_tagline: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string | null;
}

export function PayslipGenerator() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadPayrollRecords();
    }
  }, [selectedEmployeeId, selectedYear]);

  useEffect(() => {
    if (selectedMonth && payrollRecords.length > 0) {
      const record = payrollRecords.find(r => r.pay_period_month === selectedMonth);
      setSelectedRecord(record || null);
    }
  }, [selectedMonth, payrollRecords]);

  const loadInitialData = async () => {
    try {
      const [emps, settings] = await Promise.all([
        getActiveEmployees(),
        supabase.from('company_settings').select('*').maybeSingle(),
      ]);
      setEmployees(emps);
      if (settings.data) {
        setCompanySettings(settings.data as CompanySettings);
      }
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollRecords = async () => {
    if (!selectedEmployeeId) return;
    try {
      const [records, emp] = await Promise.all([
        getEmployeePayrollRecords(selectedEmployeeId, selectedYear),
        getEmployee(selectedEmployeeId),
      ]);
      setPayrollRecords(records);
      setEmployee(emp);
      setSelectedMonth(null);
      setSelectedRecord(null);
    } catch (error) {
      toast.error("Failed to load payroll records");
    }
  };

  const generatePDF = async () => {
    if (!selectedRecord || !employee || !companySettings) {
      toast.error("Missing data for payslip generation");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(companySettings.company_name, pageWidth / 2, y, { align: "center" });
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(companySettings.address || "", pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.text(`${companySettings.phone} | ${companySettings.email}`, pageWidth / 2, y, { align: "center" });
    y += 10;

    // Title
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PAYSLIP", pageWidth / 2, y, { align: "center" });
    y += 3;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`For the month of ${getMonthName(selectedRecord.pay_period_month)} ${selectedRecord.pay_period_year}`, pageWidth / 2, y, { align: "center" });
    y += 10;

    // Line
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Employee Details
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("EMPLOYEE DETAILS", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const empDetails = [
      ["Employee ID:", employee.employee_id],
      ["Name:", employee.full_name],
      ["KRA PIN:", employee.kra_pin],
      ["NSSF No:", employee.nssf_number || "N/A"],
      ["Job Title:", employee.job_title],
    ];

    empDetails.forEach(([label, value]) => {
      doc.text(label, margin, y);
      doc.text(value, margin + 40, y);
      y += 6;
    });
    y += 5;

    // Earnings Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("EARNINGS", margin, y);
    doc.text("AMOUNT (KES)", pageWidth - margin - 40, y);
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const earnings = [
      ["Basic Salary", selectedRecord.basic_salary],
      ["Housing Allowance", selectedRecord.housing_allowance],
      ["Transport Allowance", selectedRecord.transport_allowance],
      ["Other Taxable Allowances", selectedRecord.other_taxable_allowances],
      ["Non-Taxable Allowances", selectedRecord.non_taxable_allowances],
      ["Overtime Pay", selectedRecord.overtime_pay],
      ["Bonus", selectedRecord.bonus],
    ];

    earnings.forEach(([label, amount]) => {
      if (Number(amount) > 0) {
        doc.text(label as string, margin, y);
        doc.text(formatKES(Number(amount)), pageWidth - margin, y, { align: "right" });
        y += 6;
      }
    });

    doc.setFont("helvetica", "bold");
    doc.text("GROSS PAY", margin, y);
    doc.text(formatKES(selectedRecord.gross_pay), pageWidth - margin, y, { align: "right" });
    y += 10;

    // Deductions Section
    doc.text("DEDUCTIONS", margin, y);
    doc.text("AMOUNT (KES)", pageWidth - margin - 40, y);
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");

    const deductions = [
      ["PAYE (Income Tax)", selectedRecord.paye],
      ["NSSF Contribution", selectedRecord.nssf_employee],
      ["SHA Contribution", selectedRecord.sha_deduction],
      ["Housing Levy", selectedRecord.housing_levy_employee],
      ["Other Deductions", selectedRecord.other_deductions],
    ];

    deductions.forEach(([label, amount]) => {
      if (Number(amount) > 0) {
        doc.text(label as string, margin, y);
        doc.text(formatKES(Number(amount)), pageWidth - margin, y, { align: "right" });
        y += 6;
      }
    });

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL DEDUCTIONS", margin, y);
    doc.text(formatKES(selectedRecord.total_deductions), pageWidth - margin, y, { align: "right" });
    y += 10;

    // Net Pay Box
    doc.setFillColor(34, 197, 94);
    doc.rect(margin, y, pageWidth - 2 * margin, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text("NET PAY", margin + 5, y + 10);
    doc.text(formatKES(selectedRecord.net_pay), pageWidth - margin - 5, y + 10, { align: "right" });
    y += 25;

    // Employer Contributions
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("EMPLOYER CONTRIBUTIONS", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`NSSF (Employer): ${formatKES(selectedRecord.nssf_employer)}`, margin, y);
    y += 5;
    doc.text(`Housing Levy (Employer): ${formatKES(selectedRecord.housing_levy_employer)}`, margin, y);
    y += 15;

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text("This is a computer-generated payslip and does not require a signature.", pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: "center" });

    // Save
    doc.save(`Payslip_${employee.employee_id}_${getMonthName(selectedRecord.pay_period_month)}_${selectedRecord.pay_period_year}.pdf`);
    toast.success("Payslip downloaded successfully");
  };

  const handlePrint = () => {
    window.print();
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: getMonthName(i + 1),
  }));

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Payslip
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label>Employee</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
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
            <div>
              <Label>Month</Label>
              <Select
                value={selectedMonth?.toString() || ""}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
                disabled={payrollRecords.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {payrollRecords.map((r) => (
                    <SelectItem key={r.pay_period_month} value={r.pay_period_month.toString()}>
                      {getMonthName(r.pay_period_month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={generatePDF} disabled={!selectedRecord}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>

          {selectedRecord && employee && (
            <div className="border rounded-lg p-6 bg-card print:shadow-none" id="payslip-preview">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">{companySettings?.company_name || "Company Name"}</h2>
                <p className="text-muted-foreground">{companySettings?.address}</p>
                <p className="text-muted-foreground">{companySettings?.phone} | {companySettings?.email}</p>
              </div>

              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold">PAYSLIP</h3>
                <p className="text-muted-foreground">
                  For the month of {getMonthName(selectedRecord.pay_period_month)} {selectedRecord.pay_period_year}
                </p>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p><strong>Employee ID:</strong> {employee.employee_id}</p>
                  <p><strong>Name:</strong> {employee.full_name}</p>
                  <p><strong>KRA PIN:</strong> {employee.kra_pin}</p>
                </div>
                <div>
                  <p><strong>NSSF No:</strong> {employee.nssf_number || "N/A"}</p>
                  <p><strong>Job Title:</strong> {employee.job_title}</p>
                  <p><strong>Employment Type:</strong> {employee.employment_type}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2 text-green-600">EARNINGS</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Basic Salary</span>
                      <span>{formatKES(selectedRecord.basic_salary)}</span>
                    </div>
                    {selectedRecord.housing_allowance > 0 && (
                      <div className="flex justify-between">
                        <span>Housing Allowance</span>
                        <span>{formatKES(selectedRecord.housing_allowance)}</span>
                      </div>
                    )}
                    {selectedRecord.transport_allowance > 0 && (
                      <div className="flex justify-between">
                        <span>Transport Allowance</span>
                        <span>{formatKES(selectedRecord.transport_allowance)}</span>
                      </div>
                    )}
                    {selectedRecord.other_taxable_allowances > 0 && (
                      <div className="flex justify-between">
                        <span>Other Allowances</span>
                        <span>{formatKES(selectedRecord.other_taxable_allowances)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Gross Pay</span>
                      <span>{formatKES(selectedRecord.gross_pay)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 text-red-600">DEDUCTIONS</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>PAYE</span>
                      <span>{formatKES(selectedRecord.paye)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>NSSF</span>
                      <span>{formatKES(selectedRecord.nssf_employee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SHA</span>
                      <span>{formatKES(selectedRecord.sha_deduction)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Housing Levy</span>
                      <span>{formatKES(selectedRecord.housing_levy_employee)}</span>
                    </div>
                    {selectedRecord.other_deductions > 0 && (
                      <div className="flex justify-between">
                        <span>Other Deductions</span>
                        <span>{formatKES(selectedRecord.other_deductions)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total Deductions</span>
                      <span>{formatKES(selectedRecord.total_deductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-primary text-primary-foreground rounded-lg">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>NET PAY</span>
                  <span>{formatKES(selectedRecord.net_pay)}</span>
                </div>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                <p><strong>Employer Contributions:</strong></p>
                <p>NSSF: {formatKES(selectedRecord.nssf_employer)} | Housing Levy: {formatKES(selectedRecord.housing_levy_employer)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
