import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { FaultForm, MaterialUsed, MaterialReturned } from "./types"

export async function printForm(form: FaultForm, materialsUsed: MaterialUsed[], materialsReturned: MaterialReturned[]) {
  console.log("Starting PDF generation for form:", form.form_number)
  
  // Create a container for the printable version
  const container = document.createElement("div")
  container.id = "printable-form-container"
  
  // Use absolute positioning but make it visible to ensure rendering
  container.style.position = "absolute"
  container.style.left = "0"
  container.style.top = "0"
  container.style.width = "900px"
  container.style.padding = "20px"
  container.style.backgroundColor = "#ffffff"
  container.style.color = "#0f172a"
  container.style.direction = "rtl"
  container.style.fontFamily = "'Arial', sans-serif"
  container.style.zIndex = "-1000"
  container.style.opacity = "1"
  container.setAttribute("dir", "rtl")

  const headerHtml = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 10px;">
      <h1 style="font-size: 24px; font-weight: bold; color: #0f172a;">بلاغ رقم: ${form.form_number || ""}</h1>
      <div style="font-size: 16px; color: #64748b;">استمارة بلاغ عطل</div>
    </div>
  `

  const topCardsHtml = `
    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 15px;">
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 3px;">القطاع</div>
        <div style="font-size: 14px; font-weight: bold;">${form.resolved_sector_name || (Array.isArray(form.sectors) ? form.sectors[0]?.name : form.sectors?.name) || "غير محدد"}</div>
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 3px;">التاريخ والوقت</div>
        <div style="font-size: 14px; font-weight: bold;">${form.date || ""} ${form.time || ""}</div>
        <div style="font-size: 11px; color: #64748b;">${form.day || ""}</div>
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 3px;">رقم أمر العمل</div>
        <div style="font-size: 14px; font-weight: bold;">${form.work_order_number || ""}</div>
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 3px;">رقم الشكوى</div>
        <div style="font-size: 14px; font-weight: bold;">${form.complaint_number || "-"}</div>
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 3px;">الحالة</div>
        <div style="font-size: 14px; font-weight: bold; color: #3b82f6;">
          ${form.status === 'draft' ? 'مسودة' : 
            form.status === 'printed' ? 'مطبوع' : 
            form.status === 'signed' ? 'موقع' : 'مغلق'}
        </div>
      </div>
    </div>
  `

  const middleCardsHtml = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #f1f5f9; padding-bottom: 5px;">موقع العطل</h3>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 6px 0; font-size: 13px;">
          <span style="font-weight: 600; color: #64748b;">المغذي:</span>
          <span style="font-weight: bold;">${form.feeder || ""}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 6px 0; font-size: 13px;">
          <span style="font-weight: 600; color: #64748b;">رقم المحول:</span>
          <span style="font-weight: bold;">${form.transformer_number || ""}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 6px 0; font-size: 13px;">
          <span style="font-weight: 600; color: #64748b;">المحطة:</span>
          <span style="font-weight: bold;">${form.station || ""}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px;">
          <span style="font-weight: 600; color: #64748b;">العنوان:</span>
          <span style="font-weight: bold;">${form.address || ""}</span>
        </div>
        ${(form.latitude !== null && form.longitude !== null && form.latitude !== undefined && form.longitude !== undefined) ? `
        <div style="margin-top: 10px; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0;">
          <img src="https://static-maps.yandex.ru/1.x/?lang=ar_AE&ll=${form.longitude},${form.latitude}&z=15&l=map&size=400,120&pt=${form.longitude},${form.latitude},pm2rdm" width="100%" height="120" style="object-fit: cover; display: block;" crossorigin="anonymous" />
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 3px; text-align: left;" dir="ltr">
          ${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}
        </div>
        ` : ''}
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #f1f5f9; padding-bottom: 5px;">تفاصيل العطل</h3>
        <p style="white-space: pre-wrap; color: #334155; line-height: 1.5; font-size: 13px; margin: 0;">${form.fault_details || ""}</p>
      </div>
    </div>
  `

  const materialsCardsHtml = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #f1f5f9; padding-bottom: 5px;">المواد المصروفة</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b;">
              <th style="padding: 6px; text-align: right;">م</th>
              <th style="padding: 6px; text-align: right;">التفاصيل</th>
              <th style="padding: 6px; text-align: right;">الكمية</th>
            </tr>
          </thead>
          <tbody>
            ${(materialsUsed || []).map((m, i) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px;">${m.index_number || i + 1}</td>
                <td style="padding: 6px; font-weight: 500;">${m.details || ""}</td>
                <td style="padding: 6px; font-weight: bold;">${m.quantity || ""}</td>
              </tr>
            `).join('') || '<tr><td colspan="3" style="padding: 15px; text-align: center; color: #94a3b8;">لا توجد مواد مصروفة</td></tr>'}
          </tbody>
        </table>
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #f1f5f9; padding-bottom: 5px;">المواد المرتجعة</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b;">
              <th style="padding: 6px; text-align: right;">م</th>
              <th style="padding: 6px; text-align: right;">التفاصيل</th>
              <th style="padding: 6px; text-align: right;">الكمية</th>
            </tr>
          </thead>
          <tbody>
            ${(materialsReturned || []).map((m, i) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px;">${m.index_number || i + 1}</td>
                <td style="padding: 6px; font-weight: 500;">${m.details || ""}</td>
                <td style="padding: 6px; font-weight: bold;">${m.quantity || ""}</td>
              </tr>
            `).join('') || '<tr><td colspan="3" style="padding: 15px; text-align: center; color: #94a3b8;">لا توجد مواد مرتجعة</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `

  const bottomCardHtml = `
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-bottom: 20px;">
      <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #f1f5f9; padding-bottom: 5px;">معلومات إضافية</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div>
          <div style="font-weight: bold; margin-bottom: 4px; color: #64748b; font-size: 12px;">السيارات المستخدمة:</div>
          <div style="color: #1e293b; font-size: 13px;">
            ${form.vehicles_used_log && form.vehicles_used_log.length > 0 ? 
              `<ul style="margin: 0; padding-right: 15px;">${form.vehicles_used_log.map(v => `<li>${v.vehicle_name} (${v.hours} ساعة)</li>`).join('')}</ul>` : 
              (form.vehicles_used || "لا يوجد")}
          </div>
        </div>
        <div>
          <div style="font-weight: bold; margin-bottom: 4px; color: #64748b; font-size: 12px;">الطاقم الفني:</div>
          <div style="color: #1e293b; font-size: 13px; white-space: pre-wrap;">
            ${form.crew_used_log && form.crew_used_log.length > 0 ? 
              `<ul style="margin: 0; padding-right: 15px;">${form.crew_used_log.map(c => `<li>${c.crew_name} (${c.hours} ساعة)</li>`).join('')}</ul>` : 
              (form.technical_staff || "غير محدد")}
          </div>
        </div>
      </div>
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #f1f5f9;">
        <div style="font-weight: bold; margin-bottom: 4px; color: #64748b; font-size: 12px;">المعوقات والمشاكل:</div>
        <div style="color: #1e293b; font-size: 13px;">${form.obstacles_problems || "لا يوجد"}</div>
      </div>
    </div>
    <div style="display: flex; justify-content: space-around; margin-top: 30px; padding-bottom: 20px;">
      <div style="text-align: center; width: 200px;">
        <div style="border-top: 2px solid #0f172a; padding-top: 10px; font-weight: bold; font-size: 16px;">توقيع معد البلاغ</div>
      </div>
      <div style="text-align: center; width: 200px;">
        <div style="border-top: 2px solid #0f172a; padding-top: 10px; font-weight: bold; font-size: 16px;">توقيع مسؤول القطاع</div>
      </div>
    </div>
  `

  container.innerHTML = headerHtml + topCardsHtml + middleCardsHtml + materialsCardsHtml + bottomCardHtml
  document.body.appendChild(container)

  try {
    // Wait for fonts and rendering
    await new Promise(resolve => setTimeout(resolve, 1000))

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: true,
      backgroundColor: "#f8fafc",
      windowWidth: 1000,
      onclone: (clonedDoc) => {
        // STRIP OKLCH: This is the critical fix for html2canvas crashing on modern CSS
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
            // Some stylesheets might be cross-origin and inaccessible
          }
        }

        const clonedContainer = clonedDoc.getElementById("printable-form-container")
        if (clonedContainer) {
          clonedContainer.style.position = "relative"
          clonedContainer.style.zIndex = "1"
          clonedContainer.style.opacity = "1"
          clonedContainer.style.left = "0"
        }
      }
    })
    
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error("فشل في التقاط محتوى الاستمارة (Canvas empty)")
    }

    const imgData = canvas.toDataURL("image/jpeg", 0.7)
    
    const pdf = new jsPDF("p", "mm", "a4")
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    
    // Calculate height to maintain aspect ratio
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    
    // If the content is slightly larger than a page, try to scale it down to fit one page
    // Only scale down if it's within 1.5 pages of height to avoid making it unreadable
    if (pdfHeight > pageHeight && pdfHeight <= pageHeight * 1.5) {
      // Scale down to fit exactly one page
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pageHeight)
    } else {
      // Use multi-page logic for very long content
      let heightLeft = pdfHeight
      let position = 0

      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight)
        heightLeft -= pageHeight
      }
    }
    
    pdf.save(`بلاغ_عطل_${form.form_number}.pdf`)
    console.log("PDF generated successfully")
  } catch (error: any) {
    console.error("Error generating PDF:", error)
    throw new Error(`فشل إنشاء ملف PDF: ${error.message || "خطأ غير معروف"}`)
  } finally {
    if (document.getElementById("printable-form-container")) {
      document.body.removeChild(container)
    }
  }
}
