import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
import { getActiveEmployees, getEmployeePayrollRecords, getEmployee } from "@/lib/payrollStorage";
import { formatKES, getMonthName } from "@/lib/kenyanPayrollCalculator";
import { FileSpreadsheet, Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

const currentYear = new Date().getFullYear();

interface CompanySettings {
  company_name: string;
  address: string;
  phone: string;
  email: string;
}

export function P9FormGenerator() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState(currentYear - 1);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId && selectedYear) {
      loadPayrollRecords();
    }
  }, [selectedEmployeeId, selectedYear]);

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
      setPayrollRecords(records.sort((a, b) => a.pay_period_month - b.pay_period_month));
      setEmployee(emp);
    } catch (error) {
      toast.error("Failed to load payroll records");
    }
  };

  const calculateTotals = () => {
    return payrollRecords.reduce(
      (acc, record) => ({
        grossPay: acc.grossPay + record.gross_pay,
        taxableIncome: acc.taxableIncome + record.taxable_income,
        paye: acc.paye + record.paye,
        personalRelief: acc.personalRelief + record.personal_relief,
        insuranceRelief: acc.insuranceRelief + record.insurance_relief,
        nssfEmployee: acc.nssfEmployee + record.nssf_employee,
        housingLevy: acc.housingLevy + record.housing_levy_employee,
      }),
      {
        grossPay: 0,
        taxableIncome: 0,
        paye: 0,
        personalRelief: 0,
        insuranceRelief: 0,
        nssfEmployee: 0,
        housingLevy: 0,
      }
    );
  };

  const generatePDF = async () => {
    if (!employee || payrollRecords.length === 0) {
      toast.error("No data available for P9 form");
      return;
    }

    const doc = new jsPDF("landscape");
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 15;

    const totals = calculateTotals();

    // Header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("REPUBLIC OF KENYA", pageWidth / 2, y, { align: "center" });
    y += 6;
    doc.text("KENYA REVENUE AUTHORITY", pageWidth / 2, y, { align: "center" });
    y += 6;
    doc.setFontSize(14);
    doc.text("TAX DEDUCTION CARD (P9) FORM", pageWidth / 2, y, { align: "center" });
    y += 6;
    doc.setFontSize(10);
    doc.text(`Year ${selectedYear}`, pageWidth / 2, y, { align: "center" });
    y += 10;

    // Employer & Employee Details
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    // Left side - Employer
    doc.text("EMPLOYER'S NAME:", margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(companySettings?.company_name || "N/A", margin + 35, y);
    doc.setFont("helvetica", "normal");
    
    // Right side - Employee
    doc.text("EMPLOYEE'S NAME:", pageWidth / 2 + 10, y);
    doc.setFont("helvetica", "bold");
    doc.text(employee.full_name, pageWidth / 2 + 45, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.text("EMPLOYER'S PIN:", margin, y);
    doc.text("____________", margin + 35, y);
    
    doc.text("EMPLOYEE'S PIN:", pageWidth / 2 + 10, y);
    doc.setFont("helvetica", "bold");
    doc.text(employee.kra_pin, pageWidth / 2 + 45, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.text("EMPLOYEE ID:", pageWidth / 2 + 10, y);
    doc.text(employee.employee_id, pageWidth / 2 + 45, y);
    y += 10;

    // Monthly breakdown table
    const tableData = payrollRecords.map((record) => [
      getMonthName(record.pay_period_month).substring(0, 3),
      formatKES(record.gross_pay).replace("KES", "").trim(),
      formatKES(record.nssf_employee + record.housing_levy_employee).replace("KES", "").trim(),
      formatKES(record.taxable_income).replace("KES", "").trim(),
      formatKES(record.paye + record.personal_relief + record.insurance_relief).replace("KES", "").trim(),
      formatKES(record.personal_relief).replace("KES", "").trim(),
      formatKES(record.insurance_relief).replace("KES", "").trim(),
      formatKES(record.paye).replace("KES", "").trim(),
    ]);

    // Add totals row
    tableData.push([
      "TOTAL",
      formatKES(totals.grossPay).replace("KES", "").trim(),
      formatKES(totals.nssfEmployee + totals.housingLevy).replace("KES", "").trim(),
      formatKES(totals.taxableIncome).replace("KES", "").trim(),
      formatKES(totals.paye + totals.personalRelief + totals.insuranceRelief).replace("KES", "").trim(),
      formatKES(totals.personalRelief).replace("KES", "").trim(),
      formatKES(totals.insuranceRelief).replace("KES", "").trim(),
      formatKES(totals.paye).replace("KES", "").trim(),
    ]);

    autoTable(doc, {
      startY: y,
      head: [
        [
          "Month",
          "Gross Pay\n(Col A)",
          "Benefits\nNSSF & Levy\n(Col B)",
          "Taxable Pay\n(Col C)",
          "Tax Charged\n(Col D)",
          "Personal\nRelief\n(Col E)",
          "Insurance\nRelief\n(Col F)",
          "PAYE Tax\n(Col G)",
        ],
      ],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 8,
        halign: "center",
        valign: "middle",
      },
      bodyStyles: {
        fontSize: 8,
        halign: "right",
      },
      columnStyles: {
        0: { halign: "left", fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });

    // Footer notes
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(8);
    doc.text("Notes:", margin, finalY);
    doc.text("Col A: Basic Salary + All Allowances", margin, finalY + 5);
    doc.text("Col B: NSSF Contribution + Housing Levy (Allowable Deductions)", margin, finalY + 10);
    doc.text("Col C: Taxable Pay = Col A - Col B", margin, finalY + 15);
    doc.text("Col G: PAYE = Col D - Col E - Col F", margin, finalY + 20);

    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth - margin, finalY + 20, { align: "right" });

    // Signature section
    doc.text("_______________________", margin, finalY + 35);
    doc.text("Employer's Signature & Stamp", margin, finalY + 40);
    doc.text("Date: _______________", margin, finalY + 45);

    doc.text("_______________________", pageWidth - margin - 50, finalY + 35);
    doc.text("Employee's Signature", pageWidth - margin - 50, finalY + 40);
    doc.text("Date: _______________", pageWidth - margin - 50, finalY + 45);

    doc.save(`P9_Form_${employee.employee_id}_${selectedYear}.pdf`);
    toast.success("P9 Form downloaded successfully");
  };

  const totals = calculateTotals();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            P9 Tax Deduction Card
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              <Label>Tax Year</Label>
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
            <div className="flex items-end gap-2">
              <Button onClick={generatePDF} disabled={payrollRecords.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Download P9
              </Button>
            </div>
          </div>

          {employee && payrollRecords.length > 0 && (
            <div className="border rounded-lg p-6 bg-card overflow-x-auto">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold">REPUBLIC OF KENYA</h2>
                <h3 className="font-semibold">KENYA REVENUE AUTHORITY</h3>
                <h4 className="text-lg font-bold">TAX DEDUCTION CARD (P9) FORM</h4>
                <p className="text-muted-foreground">Year {selectedYear}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <p><strong>Employer:</strong> {companySettings?.company_name}</p>
                </div>
                <div>
                  <p><strong>Employee:</strong> {employee.full_name}</p>
                  <p><strong>KRA PIN:</strong> {employee.kra_pin}</p>
                  <p><strong>Employee ID:</strong> {employee.employee_id}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Gross Pay (A)</TableHead>
                    <TableHead className="text-right">NSSF + Levy (B)</TableHead>
                    <TableHead className="text-right">Taxable Pay (C)</TableHead>
                    <TableHead className="text-right">Tax Charged (D)</TableHead>
                    <TableHead className="text-right">Personal Relief (E)</TableHead>
                    <TableHead className="text-right">Insurance Relief (F)</TableHead>
                    <TableHead className="text-right">PAYE (G)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {getMonthName(record.pay_period_month).substring(0, 3)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatKES(record.gross_pay)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatKES(record.nssf_employee + record.housing_levy_employee)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatKES(record.taxable_income)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatKES(record.paye + record.personal_relief + record.insurance_relief)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatKES(record.personal_relief)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatKES(record.insurance_relief)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatKES(record.paye)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right font-mono">{formatKES(totals.grossPay)}</TableCell>
                    <TableCell className="text-right font-mono">{formatKES(totals.nssfEmployee + totals.housingLevy)}</TableCell>
                    <TableCell className="text-right font-mono">{formatKES(totals.taxableIncome)}</TableCell>
                    <TableCell className="text-right font-mono">{formatKES(totals.paye + totals.personalRelief + totals.insuranceRelief)}</TableCell>
                    <TableCell className="text-right font-mono">{formatKES(totals.personalRelief)}</TableCell>
                    <TableCell className="text-right font-mono">{formatKES(totals.insuranceRelief)}</TableCell>
                    <TableCell className="text-right font-mono">{formatKES(totals.paye)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="mt-6 text-sm text-muted-foreground">
                <p><strong>Column Notes:</strong></p>
                <p>A: Basic Salary + All Allowances | B: NSSF + Housing Levy | C: Taxable = A - B</p>
                <p>G: PAYE = D - E - F</p>
              </div>
            </div>
          )}

          {selectedEmployeeId && payrollRecords.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No payroll records found for {selectedYear}. Process payroll first to generate P9 form.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
