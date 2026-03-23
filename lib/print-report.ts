import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { format } from "date-fns"
import { FaultForm } from "./types"

interface ReportData {
  stats: {
    totalForms: number
    totalMaterials: number
    statusCounts: Record<string, number>
    materialUsage: { name: string; value: number }[]
    vehicleUsage: { name: string; value: number }[]
  }
  filteredForms: FaultForm[]
}

export async function printReport(data: ReportData, title: string) {
  console.log("Starting professional report generation...")
  
  // Create a overlay to show printing status
  const overlay = document.createElement("div")
  overlay.style.position = "fixed"
  overlay.style.top = "0"
  overlay.style.left = "0"
  overlay.style.width = "100%"
  overlay.style.height = "100%"
  overlay.style.backgroundColor = "rgba(255, 255, 255, 0.95)"
  overlay.style.display = "flex"
  overlay.style.flexDirection = "column"
  overlay.style.alignItems = "center"
  overlay.style.justifyContent = "center"
  overlay.style.zIndex = "10000"
  overlay.innerHTML = `
    <div style="font-family: sans-serif; text-align: center; direction: rtl;">
      <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
      <p style="font-size: 20px; font-weight: bold; color: #1e293b;">جاري إنشاء التقرير المنسق...</p>
    </div>
    <style>
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
  `
  document.body.appendChild(overlay)

  // Create a hidden container for the printable version
  const container = document.createElement("div")
  container.id = "printable-report-container"
  container.style.position = "absolute"
  container.style.left = "-9999px"
  container.style.top = "0"
  container.style.width = "1000px"
  container.style.padding = "40px"
  container.style.backgroundColor = "#ffffff"
  container.style.color = "#0f172a"
  container.style.direction = "rtl"
  container.style.fontFamily = "'Arial', sans-serif"
  container.setAttribute("dir", "rtl")

  const headerHtml = `
    <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px;">
      <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 10px;">نظام إدارة بلاغات الأعطال</h1>
      <h2 style="font-size: 22px; color: #3b82f6; margin-bottom: 5px;">تقرير الإحصائيات التفصيلي</h2>
      <div style="font-size: 14px; color: #64748b;">تاريخ التقرير: ${format(new Date(), "yyyy-MM-dd HH:mm")}</div>
    </div>
  `

  const statsCardsHtml = `
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
      <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; text-align: center; background: #f8fafc;">
        <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">إجمالي البلاغات</div>
        <div style="font-size: 20px; font-weight: bold;">${data.stats.totalForms}</div>
      </div>
      <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; text-align: center; background: #f8fafc;">
        <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">إجمالي المواد</div>
        <div style="font-size: 20px; font-weight: bold;">${data.stats.totalMaterials}</div>
      </div>
      <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; text-align: center; background: #f8fafc;">
        <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">بلاغات مغلقة</div>
        <div style="font-size: 20px; font-weight: bold; color: #16a34a;">${data.stats.statusCounts.closed || 0}</div>
      </div>
      <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; text-align: center; background: #f8fafc;">
        <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">بلاغات قيد العمل</div>
        <div style="font-size: 20px; font-weight: bold; color: #ca8a04;">${(data.stats.statusCounts.draft || 0) + (data.stats.statusCounts.printed || 0) + (data.stats.statusCounts.signed || 0)}</div>
      </div>
    </div>
  `

  const materialsTableHtml = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
      <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
        <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">ملخص استهلاك المواد</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 10px; text-align: right;">المادة</th>
              <th style="padding: 10px; text-align: right;">الكمية</th>
            </tr>
          </thead>
          <tbody>
            ${data.stats.materialUsage.map((m: any) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px;">${m.name}</td>
                <td style="padding: 10px; font-weight: bold; color: #3b82f6;">${m.value}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
        <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">ملخص استخدام الآليات</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 10px; text-align: right;">الآلية</th>
              <th style="padding: 10px; text-align: right;">التكرار</th>
            </tr>
          </thead>
          <tbody>
            ${data.stats.vehicleUsage.map((v: any) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px;">${v.name}</td>
                <td style="padding: 10px; font-weight: bold; color: #ea580c;">${v.value}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `

  const formsTableHtml = `
    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
      <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">تفاصيل البلاغات</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 8px; text-align: right;">رقم البلاغ</th>
            <th style="padding: 8px; text-align: right;">القطاع</th>
            <th style="padding: 8px; text-align: right;">التاريخ</th>
            <th style="padding: 8px; text-align: right;">الحالة</th>
            <th style="padding: 8px; text-align: right;">المحطة</th>
            <th style="padding: 8px; text-align: right;">المغذي</th>
          </tr>
        </thead>
        <tbody>
          ${data.filteredForms.map((f: any) => {
            const sectorName = Array.isArray(f.sectors) ? (f.sectors[0]?.name || "") : (f.sectors?.name || "")
            return `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px; font-weight: bold;">${f.form_number}</td>
                <td style="padding: 8px;">${sectorName}</td>
                <td style="padding: 8px;">${f.date}</td>
                <td style="padding: 8px;">${f.status === 'closed' ? 'مغلق' : 'قيد العمل'}</td>
                <td style="padding: 8px;">${f.station}</td>
                <td style="padding: 8px;">${f.feeder}</td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
    </div>
  `

  container.innerHTML = headerHtml + statsCardsHtml + materialsTableHtml + formsTableHtml
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      onclone: (clonedDoc) => {
        // Fix for oklch colors in html2canvas
        const styleSheets = Array.from(clonedDoc.styleSheets);
        for (const sheet of styleSheets) {
          try {
            const rules = Array.from(sheet.cssRules);
            for (let i = rules.length - 1; i >= 0; i--) {
              if (rules[i].cssText.includes('oklch')) {
                sheet.deleteRule(i);
              }
            }
          } catch (e) {
            // Ignore cross-origin stylesheet errors
          }
        }
      }
    })

    const imgData = canvas.toDataURL("image/jpeg", 0.9)
    const pdf = new jsPDF("p", "mm", "a4")
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    
    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight)
    pdf.save(`${title}_${format(new Date(), "yyyy-MM-dd")}.pdf`)
  } catch (error) {
    console.error("Report print error:", error)
  } finally {
    document.body.removeChild(container)
    document.body.removeChild(overlay)
  }
}
