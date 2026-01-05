import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { PayrollRecord } from "@/types/payroll";
import { getPayrollRecords } from "@/lib/payrollStorage";
import { formatKES, getMonthName } from "@/lib/kenyanPayrollCalculator";
import { FileText, Download, TrendingUp, Building2, Heart, Home } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

export function PayrollReports() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, [selectedMonth, selectedYear]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await getPayrollRecords(selectedMonth, selectedYear);
      setRecords(data);
    } catch (error) {
      toast.error("Failed to load payroll records");
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = () => {
    return records.reduce(
      (acc, record) => ({
        totalGross: acc.totalGross + record.gross_pay,
        totalPAYE: acc.totalPAYE + record.paye,
        totalNSSFEmployee: acc.totalNSSFEmployee + record.nssf_employee,
        totalNSSFEmployer: acc.totalNSSFEmployer + record.nssf_employer,
        totalSHA: acc.totalSHA + record.sha_deduction,
        totalHousingLevyEmployee: acc.totalHousingLevyEmployee + record.housing_levy_employee,
        totalHousingLevyEmployer: acc.totalHousingLevyEmployer + record.housing_levy_employer,
        totalNet: acc.totalNet + record.net_pay,
      }),
      {
        totalGross: 0,
        totalPAYE: 0,
        totalNSSFEmployee: 0,
        totalNSSFEmployer: 0,
        totalSHA: 0,
        totalHousingLevyEmployee: 0,
        totalHousingLevyEmployer: 0,
        totalNet: 0,
      }
    );
  };

  const exportReport = (reportType: string) => {
    const doc = new jsPDF();
    const summary = calculateSummary();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`${reportType} Report`, pageWidth / 2, y, { align: "center" });
    y += 7;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`${getMonthName(selectedMonth)} ${selectedYear}`, pageWidth / 2, y, { align: "center" });
    y += 15;

    let tableData: string[][] = [];
    let headers: string[] = [];

    switch (reportType) {
      case "PAYE":
        headers = ["Employee", "KRA PIN", "Taxable Income", "Tax Charged", "Relief", "PAYE"];
        tableData = records.map((r) => [
          (r.employee as any)?.full_name || "N/A",
          (r.employee as any)?.kra_pin || "N/A",
          formatKES(r.taxable_income),
          formatKES(r.paye + r.personal_relief),
          formatKES(r.personal_relief + r.insurance_relief),
          formatKES(r.paye),
        ]);
        tableData.push(["TOTAL", "", formatKES(summary.totalGross), "", "", formatKES(summary.totalPAYE)]);
        break;

      case "NSSF":
        headers = ["Employee", "NSSF No", "Employee Contribution", "Employer Contribution", "Total"];
        tableData = records.map((r) => [
          (r.employee as any)?.full_name || "N/A",
          (r.employee as any)?.nssf_number || "N/A",
          formatKES(r.nssf_employee),
          formatKES(r.nssf_employer),
          formatKES(r.nssf_employee + r.nssf_employer),
        ]);
        tableData.push([
          "TOTAL",
          "",
          formatKES(summary.totalNSSFEmployee),
          formatKES(summary.totalNSSFEmployer),
          formatKES(summary.totalNSSFEmployee + summary.totalNSSFEmployer),
        ]);
        break;

      case "SHA":
        headers = ["Employee", "SHA No", "Contribution"];
        tableData = records.map((r) => [
          (r.employee as any)?.full_name || "N/A",
          (r.employee as any)?.sha_number || "N/A",
          formatKES(r.sha_deduction),
        ]);
        tableData.push(["TOTAL", "", formatKES(summary.totalSHA)]);
        break;

      case "Housing Levy":
        headers = ["Employee", "Employee Contribution", "Employer Contribution", "Total"];
        tableData = records.map((r) => [
          (r.employee as any)?.full_name || "N/A",
          formatKES(r.housing_levy_employee),
          formatKES(r.housing_levy_employer),
          formatKES(r.housing_levy_employee + r.housing_levy_employer),
        ]);
        tableData.push([
          "TOTAL",
          formatKES(summary.totalHousingLevyEmployee),
          formatKES(summary.totalHousingLevyEmployer),
          formatKES(summary.totalHousingLevyEmployee + summary.totalHousingLevyEmployer),
        ]);
        break;

      default:
        headers = ["Employee", "Gross Pay", "PAYE", "NSSF", "SHA", "Housing Levy", "Net Pay"];
        tableData = records.map((r) => [
          (r.employee as any)?.full_name || "N/A",
          formatKES(r.gross_pay),
          formatKES(r.paye),
          formatKES(r.nssf_employee),
          formatKES(r.sha_deduction),
          formatKES(r.housing_levy_employee),
          formatKES(r.net_pay),
        ]);
        tableData.push([
          "TOTAL",
          formatKES(summary.totalGross),
          formatKES(summary.totalPAYE),
          formatKES(summary.totalNSSFEmployee),
          formatKES(summary.totalSHA),
          formatKES(summary.totalHousingLevyEmployee),
          formatKES(summary.totalNet),
        ]);
    }

    autoTable(doc, {
      startY: y,
      head: [headers],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
      didParseCell: (data) => {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });

    doc.save(`${reportType}_Report_${getMonthName(selectedMonth)}_${selectedYear}.pdf`);
    toast.success(`${reportType} report downloaded`);
  };

  const summary = calculateSummary();
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }));
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (loading) {
    return <div className="flex justify-center p-8">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-4">
          <div>
            <Label>Month</Label>
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
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
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gross Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatKES(summary.totalGross)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total PAYE</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatKES(summary.totalPAYE)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total NSSF</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatKES(summary.totalNSSFEmployee + summary.totalNSSFEmployer)}</p>
            <p className="text-xs text-muted-foreground">Emp: {formatKES(summary.totalNSSFEmployee)} | Er: {formatKES(summary.totalNSSFEmployer)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Net Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatKES(summary.totalNet)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Payroll Summary</TabsTrigger>
          <TabsTrigger value="paye">PAYE Report</TabsTrigger>
          <TabsTrigger value="nssf">NSSF Report</TabsTrigger>
          <TabsTrigger value="sha">SHA Report</TabsTrigger>
          <TabsTrigger value="housing">Housing Levy</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Monthly Payroll Summary
                  </CardTitle>
                  <CardDescription>
                    {getMonthName(selectedMonth)} {selectedYear} - {records.length} employees
                  </CardDescription>
                </div>
                <Button onClick={() => exportReport("Summary")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Gross Pay</TableHead>
                    <TableHead className="text-right">PAYE</TableHead>
                    <TableHead className="text-right">NSSF</TableHead>
                    <TableHead className="text-right">SHA</TableHead>
                    <TableHead className="text-right">Housing Levy</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {(record.employee as any)?.full_name || "N/A"}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatKES(record.gross_pay)}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">{formatKES(record.paye)}</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(record.nssf_employee)}</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(record.sha_deduction)}</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(record.housing_levy_employee)}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">{formatKES(record.net_pay)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right font-mono">{formatKES(summary.totalGross)}</TableCell>
                    <TableCell className="text-right font-mono">{formatKES(summary.totalPAYE)}</TableCell>
                    <TableCell className="text-right font-mono">{formatKES(summary.totalNSSFEmployee)}</TableCell>
                    <TableCell className="text-right font-mono">{formatKES(summary.totalSHA)}</TableCell>
                    <TableCell className="text-right font-mono">{formatKES(summary.totalHousingLevyEmployee)}</TableCell>
                    <TableCell className="text-right font-mono">{formatKES(summary.totalNet)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paye">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  PAYE Report
                </CardTitle>
                <Button onClick={() => exportReport("PAYE")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>KRA PIN</TableHead>
                    <TableHead className="text-right">Taxable Income</TableHead>
                    <TableHead className="text-right">Tax Charged</TableHead>
                    <TableHead className="text-right">Personal Relief</TableHead>
                    <TableHead className="text-right">PAYE Payable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{(record.employee as any)?.full_name}</TableCell>
                      <TableCell className="font-mono">{(record.employee as any)?.kra_pin}</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(record.taxable_income)}</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(record.paye + record.personal_relief)}</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(record.personal_relief)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatKES(record.paye)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nssf">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  NSSF Report
                </CardTitle>
                <Button onClick={() => exportReport("NSSF")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>NSSF Number</TableHead>
                    <TableHead className="text-right">Employee Contribution</TableHead>
                    <TableHead className="text-right">Employer Contribution</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{(record.employee as any)?.full_name}</TableCell>
                      <TableCell className="font-mono">{(record.employee as any)?.nssf_number || "N/A"}</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(record.nssf_employee)}</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(record.nssf_employer)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatKES(record.nssf_employee + record.nssf_employer)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sha">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  SHA Report
                </CardTitle>
                <Button onClick={() => exportReport("SHA")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>SHA Number</TableHead>
                    <TableHead className="text-right">Contribution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{(record.employee as any)?.full_name}</TableCell>
                      <TableCell className="font-mono">{(record.employee as any)?.sha_number || "N/A"}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatKES(record.sha_deduction)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="housing">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Housing Levy Report
                </CardTitle>
                <Button onClick={() => exportReport("Housing Levy")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Employee Contribution</TableHead>
                    <TableHead className="text-right">Employer Contribution</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{(record.employee as any)?.full_name}</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(record.housing_levy_employee)}</TableCell>
                      <TableCell className="text-right font-mono">{formatKES(record.housing_levy_employer)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatKES(record.housing_levy_employee + record.housing_levy_employer)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
