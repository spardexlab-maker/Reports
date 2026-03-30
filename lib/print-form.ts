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
  container.style.width = "1000px"
  container.style.padding = "40px"
  container.style.backgroundColor = "#f8fafc"
  container.style.color = "#0f172a"
  container.style.direction = "rtl"
  container.style.fontFamily = "'Arial', sans-serif"
  container.style.zIndex = "-1000"
  container.style.opacity = "1"
  container.setAttribute("dir", "rtl")

  const headerHtml = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding: 0 10px;">
      <h1 style="font-size: 32px; font-weight: bold; color: #0f172a;">بلاغ رقم: ${form.form_number || ""}</h1>
      <div style="font-size: 18px; color: #64748b;">استمارة بلاغ عطل</div>
    </div>
  `

  const topCardsHtml = `
    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 30px;">
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">القطاع</div>
        <div style="font-size: 18px; font-weight: bold;">${form.resolved_sector_name || (Array.isArray(form.sectors) ? form.sectors[0]?.name : form.sectors?.name) || "غير محدد"}</div>
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">التاريخ والوقت</div>
        <div style="font-size: 16px; font-weight: bold;">${form.date || ""} ${form.time || ""}</div>
        <div style="font-size: 12px; color: #64748b;">${form.day || ""}</div>
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">رقم أمر العمل</div>
        <div style="font-size: 18px; font-weight: bold;">${form.work_order_number || ""}</div>
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">رقم الشكوى</div>
        <div style="font-size: 18px; font-weight: bold;">${form.complaint_number || ""}</div>
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">الحالة</div>
        <div style="font-size: 18px; font-weight: bold; color: #3b82f6;">
          ${form.status === 'draft' ? 'مسودة' : 
            form.status === 'printed' ? 'مطبوع' : 
            form.status === 'signed' ? 'موقع' : 'مغلق'}
        </div>
      </div>
    </div>
  `

  const middleCardsHtml = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">موقع العطل</h3>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 12px 0;">
          <span style="font-weight: 600; color: #64748b;">المغذي:</span>
          <span style="font-weight: bold;">${form.feeder || ""}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 12px 0;">
          <span style="font-weight: 600; color: #64748b;">رقم المحول:</span>
          <span style="font-weight: bold;">${form.transformer_number || ""}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 12px 0;">
          <span style="font-weight: 600; color: #64748b;">المحطة:</span>
          <span style="font-weight: bold;">${form.station || ""}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px 0;">
          <span style="font-weight: 600; color: #64748b;">العنوان:</span>
          <span style="font-weight: bold;">${form.address || ""}</span>
        </div>
        ${(form.latitude !== null && form.longitude !== null && form.latitude !== undefined && form.longitude !== undefined) ? `
        <div style="margin-top: 15px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
          <img src="https://static-maps.yandex.ru/1.x/?lang=ar_AE&ll=${form.longitude},${form.latitude}&z=15&l=map&size=400,200&pt=${form.longitude},${form.latitude},pm2rdm" width="100%" height="200" style="object-fit: cover; display: block;" crossorigin="anonymous" />
        </div>
        <div style="font-size: 12px; color: #64748b; margin-top: 5px; text-align: left;" dir="ltr">
          ${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}
        </div>
        ` : ''}
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">تفاصيل العطل</h3>
        <p style="white-space: pre-wrap; color: #334155; line-height: 1.8; font-size: 16px;">${form.fault_details || ""}</p>
      </div>
    </div>
  `

  const materialsCardsHtml = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">المواد المصروفة</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b;">
              <th style="padding: 12px; text-align: right;">م</th>
              <th style="padding: 12px; text-align: right;">التفاصيل</th>
              <th style="padding: 12px; text-align: right;">الكمية</th>
            </tr>
          </thead>
          <tbody>
            ${(materialsUsed || []).map((m, i) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px;">${m.index_number || i + 1}</td>
                <td style="padding: 12px; font-weight: 500;">${m.details || ""}</td>
                <td style="padding: 12px; font-weight: bold;">${m.quantity || ""}</td>
              </tr>
            `).join('') || '<tr><td colspan="3" style="padding: 30px; text-align: center; color: #94a3b8;">لا توجد مواد مصروفة</td></tr>'}
          </tbody>
        </table>
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">المواد المرتجعة</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b;">
              <th style="padding: 12px; text-align: right;">م</th>
              <th style="padding: 12px; text-align: right;">التفاصيل</th>
              <th style="padding: 12px; text-align: right;">الكمية</th>
            </tr>
          </thead>
          <tbody>
            ${(materialsReturned || []).map((m, i) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px;">${m.index_number || i + 1}</td>
                <td style="padding: 12px; font-weight: 500;">${m.details || ""}</td>
                <td style="padding: 12px; font-weight: bold;">${m.quantity || ""}</td>
              </tr>
            `).join('') || '<tr><td colspan="3" style="padding: 30px; text-align: center; color: #94a3b8;">لا توجد مواد مرتجعة</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `

  const bottomCardHtml = `
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 40px;">
      <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">معلومات إضافية</h3>
      <div style="margin-bottom: 20px;">
        <div style="font-weight: bold; margin-bottom: 8px; color: #64748b;">السيارات المستخدمة:</div>
        <div style="color: #1e293b; font-size: 16px;">
          ${form.vehicles_used_log && form.vehicles_used_log.length > 0 ? 
            `<ul style="margin: 0; padding-right: 20px;">${form.vehicles_used_log.map(v => `<li>${v.vehicle_name} (${v.hours} ساعة)</li>`).join('')}</ul>` : 
            (form.vehicles_used || "لا يوجد")}
        </div>
      </div>
      <div style="margin-bottom: 20px;">
        <div style="font-weight: bold; margin-bottom: 8px; color: #64748b;">الطاقم الفني:</div>
        <div style="color: #1e293b; font-size: 16px; white-space: pre-wrap;">
          ${form.crew_used_log && form.crew_used_log.length > 0 ? 
            `<ul style="margin: 0; padding-right: 20px;">${form.crew_used_log.map(c => `<li>${c.crew_name} (${c.hours} ساعة)</li>`).join('')}</ul>` : 
            (form.technical_staff || "غير محدد")}
        </div>
      </div>
      <div>
        <div style="font-weight: bold; margin-bottom: 8px; color: #64748b;">المعوقات والمشاكل:</div>
        <div style="color: #1e293b; font-size: 16px;">${form.obstacles_problems || "لا يوجد"}</div>
      </div>
    </div>
    <div style="display: flex; justify-content: space-around; margin-top: 60px; padding-bottom: 60px;">
      <div style="text-align: center; width: 250px;">
        <div style="border-top: 2px solid #0f172a; padding-top: 15px; font-weight: bold; font-size: 18px;">توقيع المسؤول</div>
      </div>
      <div style="text-align: center; width: 250px;">
        <div style="border-top: 2px solid #0f172a; padding-top: 15px; font-weight: bold; font-size: 18px;">توقيع الفني</div>
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
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    
    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight)
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
