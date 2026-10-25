import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { connection } from "next/server";
import { apiPermission } from "@/lib/auth/api";
import { handleApiError, jsonError } from "@/lib/api";
import { csvCell, reportRange } from "@/lib/accounting/query";
import { financialReport } from "@/lib/accounting/reports";

const naira = (kobo: number) => `NGN ${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

export async function GET(request: Request) {
  await connection();
  try {
    const auth = await apiPermission("reports.read"); if ("response" in auth) return auth.response;
    const url = new URL(request.url); const format = url.searchParams.get("format"); const range = reportRange(request.url); const report = await financialReport(range.from, range.to, range.locationId);
    if (format === "csv") {
      const rows: (string | number)[][] = [["CRAVE FINANCIAL REPORT"], ["From", range.from.toISOString()], ["To", range.to.toISOString()], [], ["Metric", "Amount (kobo)"]];
      for (const [key, value] of Object.entries(report.totals)) rows.push([key, value]);
      rows.push([], ["Product", "Quantity", "Revenue (kobo)"], ...report.byProduct.map((item) => [item.name, item.quantity, item.revenueKobo]));
      rows.push([], ["Location", "Paid orders", "Gross sales (kobo)", "Cash collected (kobo)"], ...report.byLocation.map((item) => [item.name, item.orders, item.grossSalesKobo, item.cashCollectedKobo]));
      const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
      return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="crave-financial-report.csv"` } });
    }
    if (format !== "pdf") return jsonError("Choose csv or pdf export.", 422);
    const pdf = await PDFDocument.create(); const page = pdf.addPage([595, 842]); const regular = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    page.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: rgb(0.89, 0.16, 0.12) });
    page.drawText("CRAVE", { x: 42, y: 794, size: 24, font: bold, color: rgb(1, 0.96, 0.88) });
    page.drawText("Financial report", { x: 42, y: 767, size: 14, font: regular, color: rgb(1, 1, 1) });
    page.drawText(`${range.from.toLocaleDateString("en-NG")} to ${range.to.toLocaleDateString("en-NG")}`, { x: 42, y: 720, size: 10, font: regular, color: rgb(0.35, 0.31, 0.29) });
    page.drawText(report.accountingBasis, { x: 42, y: 702, size: 9, font: regular, color: rgb(0.45, 0.4, 0.38) });
    const labels: [string, number][] = [["Gross sales", report.totals.grossSalesKobo], ["Discounts", report.totals.discountsKobo], ["Returns", report.totals.returnsKobo], ["Net sales", report.totals.netSalesKobo], ["Cost of goods sold", report.totals.cogsKobo], ["Gross profit", report.totals.grossProfitKobo], ["Operating expenses", report.totals.operatingExpensesKobo], ["Operating profit", report.totals.operatingProfitKobo], ["Other charges and taxes", report.totals.otherChargesKobo], ["Net profit", report.totals.netProfitKobo]];
    let y = 660; for (const [label, amount] of labels) { const emphasis = ["Net sales", "Gross profit", "Operating profit", "Net profit"].includes(label); page.drawText(label, { x: 42, y, size: emphasis ? 11 : 10, font: emphasis ? bold : regular, color: rgb(0.12, 0.09, 0.08) }); page.drawText(naira(amount), { x: 350, y, size: emphasis ? 11 : 10, font: emphasis ? bold : regular, color: amount < 0 ? rgb(0.8, 0.12, 0.1) : rgb(0.12, 0.09, 0.08) }); y -= 34; }
    page.drawText(`Orders created: ${report.orderActivity.created}   Paid: ${report.orderActivity.paid}   Unpaid: ${report.orderActivity.unpaid}`, { x: 42, y: y - 12, size: 9, font: regular, color: rgb(0.35, 0.31, 0.29) });
    page.drawText("Generated from CRAVE's posted double-entry ledger.", { x: 42, y: 34, size: 8, font: regular, color: rgb(0.45, 0.4, 0.38) });
    const bytes = await pdf.save(); return new Response(Buffer.from(bytes), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="crave-financial-report.pdf"` } });
  } catch (error) { return handleApiError(error); }
}
