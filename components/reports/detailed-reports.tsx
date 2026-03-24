"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Download, Filter, Search, X, FileText, Settings as SettingsIcon, Printer } from "lucide-react"
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Pie,
  PieChart,
  CartesianGrid,
  Legend,
} from "recharts"

import * as XLSX from "xlsx"
import { printReport } from "@/lib/print-report"

interface DetailedReportsProps {
  forms: any[]
  materialsUsed: any[]
  vehiclesUsedLog?: any[]
  crewUsedLog?: any[]
  sectors: any[]
  materialsCatalog: any[]
  isAdmin: boolean
  userSectorId?: string
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

export default function DetailedReports({
  forms,
  materialsUsed,
  vehiclesUsedLog = [],
  crewUsedLog = [],
  sectors,
  materialsCatalog,
  isAdmin,
  userSectorId,
}: DetailedReportsProps) {
  const [sectorFilter, setSectorFilter] = useState<string>("all")
  const [materialFilter, setMaterialFilter] = useState<string>("all")
  const [crewFilter, setCrewFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Filtered data
  const filteredForms = useMemo(() => {
    return forms.filter((form) => {
      // Sector filter
      if (isAdmin && sectorFilter !== "all" && form.sector_id !== sectorFilter) {
        return false
      }

      // Date filter
      if (startDate || endDate) {
        const formDate = parseISO(form.date)
        const start = startDate ? startOfDay(parseISO(startDate)) : new Date(0)
        const end = endDate ? endOfDay(parseISO(endDate)) : new Date()
        
        if (!isWithinInterval(formDate, { start, end })) {
          return false
        }
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          form.form_number?.toLowerCase().includes(query) ||
          form.work_order_number?.toLowerCase().includes(query) ||
          form.fault_details?.toLowerCase().includes(query) ||
          form.address?.toLowerCase().includes(query)
        
        if (!matchesSearch) return false
      }

      // Material filter
      if (materialFilter !== "all") {
        const usesMaterial = materialsUsed.some(
          (m) => m.form_id === form.id && m.details === materialFilter
        )
        if (!usesMaterial) return false
      }

      // Crew filter
      if (crewFilter !== "all") {
        const usesCrew = crewUsedLog.some(
          (c) => c.form_id === form.id && c.crew_name === crewFilter
        )
        if (!usesCrew) return false
      }

      return true
    })
  }, [forms, sectorFilter, materialFilter, crewFilter, startDate, endDate, searchQuery, isAdmin, materialsUsed, crewUsedLog])

  const filteredMaterialsUsed = useMemo(() => {
    const formIds = new Set(filteredForms.map((f) => f.id))
    return materialsUsed.filter((m) => {
      if (!formIds.has(m.form_id)) return false
      if (materialFilter !== "all" && m.details !== materialFilter) return false
      return true
    })
  }, [materialsUsed, filteredForms, materialFilter])

  const filteredVehiclesLog = useMemo(() => {
    const formIds = new Set(filteredForms.map((f) => f.id))
    return vehiclesUsedLog.filter((v) => formIds.has(v.form_id))
  }, [vehiclesUsedLog, filteredForms])

  const filteredCrewLog = useMemo(() => {
    const formIds = new Set(filteredForms.map((f) => f.id))
    return crewUsedLog.filter((c) => {
      if (!formIds.has(c.form_id)) return false
      if (crewFilter !== "all" && c.crew_name !== crewFilter) return false
      return true
    })
  }, [crewUsedLog, filteredForms, crewFilter])

  // Statistics
  const stats = useMemo(() => {
    const totalForms = filteredForms.length
    const totalMaterials = filteredMaterialsUsed.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0)
    
    const statusCounts = filteredForms.reduce((acc, f) => {
      acc[f.status] = (acc[f.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const materialUsage = filteredMaterialsUsed.reduce((acc, m) => {
      acc[m.details] = (acc[m.details] || 0) + (Number(m.quantity) || 0)
      return acc
    }, {} as Record<string, number>)

    // Vehicle statistics (hours)
    const vehicleUsage: Record<string, number> = {}
    filteredVehiclesLog.forEach(v => {
      vehicleUsage[v.vehicle_name] = (vehicleUsage[v.vehicle_name] || 0) + (Number(v.hours) || 0)
    })

    // Crew statistics (hours)
    const crewUsage: Record<string, number> = {}
    filteredCrewLog.forEach(c => {
      crewUsage[c.crew_name] = (crewUsage[c.crew_name] || 0) + (Number(c.hours) || 0)
    })

    return {
      totalForms,
      totalMaterials,
      statusCounts,
      materialUsage: Object.entries(materialUsage)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10), // Top 10 materials
      vehicleUsage: Object.entries(vehicleUsage)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value),
      crewUsage: Object.entries(crewUsage)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)
    }
  }, [filteredForms, filteredMaterialsUsed, filteredVehiclesLog, filteredCrewLog])

  const statusData = [
    { name: "مسودة", value: stats.statusCounts.draft || 0 },
    { name: "مطبوع", value: stats.statusCounts.printed || 0 },
    { name: "موقع", value: stats.statusCounts.signed || 0 },
    { name: "مغلق", value: stats.statusCounts.closed || 0 },
  ].filter(d => d.value > 0)

  const resetFilters = () => {
    setSectorFilter("all")
    setMaterialFilter("all")
    setStartDate("")
    setEndDate("")
    setSearchQuery("")
  }

  const exportToExcel = () => {
    const data = filteredForms.map(form => {
      const formMaterials = materialsUsed
        .filter(m => m.form_id === form.id)
        .map(m => `${m.details} (${m.quantity})`)
        .join(", ")

      const vehicles = vehiclesUsedLog.filter(v => v.form_id === form.id)
      const formVehiclesNames = vehicles.map(v => v.vehicle_name).join(", ")
      const formVehiclesHours = vehicles.map(v => v.hours).join(", ")

      const crew = crewUsedLog.filter(c => c.form_id === form.id)
      const formCrewNames = crew.map(c => c.crew_name).join(", ")
      const formCrewHours = crew.map(c => c.hours).join(", ")

      const sectorName = Array.isArray(form.sectors)
        ? form.sectors[0]?.name
        : form.sectors?.name || 
          sectors.find(s => s.id === form.sector_id)?.name || 
          ""

      return {
        "رقم البلاغ": form.form_number,
        "القطاع": sectorName,
        "التاريخ": form.date,
        "الوقت": form.time,
        "اليوم": form.day,
        "رقم أمر العمل": form.work_order_number,
        "المحطة": form.station,
        "المغذي": form.feeder,
        "رقم المحول": form.transformer_number,
        "العنوان": form.address,
        "تفاصيل العطل": form.fault_details,
        "الحالة": form.status === 'draft' ? 'مسودة' : 
                 form.status === 'printed' ? 'مطبوع' : 
                 form.status === 'signed' ? 'موقع' : 'مغلق',
        "المواد المستخدمة": formMaterials,
        "السيارات المستخدمة": formVehiclesNames,
        "ساعات عمل الآليات": formVehiclesHours,
        "المعوقات": form.obstacles_problems,
        "الطاقم الفني": formCrewNames,
        "ساعات عمل الطاقم": formCrewHours
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reports")
    
    // Set column widths
    const wscols = [
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
      { wch: 30 }, { wch: 10 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }
    ]
    worksheet["!cols"] = wscols

    XLSX.writeFile(workbook, `report_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`)
  }

  const handlePrintReport = async () => {
    await printReport({ stats, filteredForms }, "تقرير_إحصائيات_البلاغات")
  }

  return (
    <div className="space-y-6" id="report-dashboard">
      {/* Filters Card */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            تصفية التقارير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isAdmin && (
              <div className="space-y-2">
                <Label>القطاع</Label>
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القطاع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع القطاعات</SelectItem>
                    {sectors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>المادة</Label>
              <Select value={materialFilter} onValueChange={setMaterialFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المادة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المواد</SelectItem>
                  {materialsCatalog.map((m) => (
                    <SelectItem key={m.id} value={m.name}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>الطاقم الفني</Label>
              <Select value={crewFilter} onValueChange={setCrewFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر عضو الطاقم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأعضاء</SelectItem>
                  {Array.from(new Set(crewUsedLog.map(c => c.crew_name))).map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label>بحث نصي</Label>
              <div className="relative">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم البلاغ، العنوان، التفاصيل..."
                  className="pr-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-end gap-2 lg:col-span-2">
              <Button variant="outline" onClick={resetFilters} className="w-full">
                <X className="ml-2 h-4 w-4" />
                إعادة تعيين
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي البلاغات</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalForms}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المواد المستخدمة</CardTitle>
            <SettingsIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMaterials}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">بلاغات مغلقة</CardTitle>
            <Badge variant="success" className="h-4 w-4 rounded-full p-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.statusCounts.closed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">بلاغات قيد العمل</CardTitle>
            <Badge variant="warning" className="h-4 w-4 rounded-full p-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.statusCounts.draft || 0) + (stats.statusCounts.printed || 0) + (stats.statusCounts.signed || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>حالة البلاغات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>أكثر 10 مواد استخداماً</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.materialUsage} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontWeight: 500 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                    {stats.materialUsage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* Materials Summary Table */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">ملخص استهلاك المواد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-right text-xs">المادة</TableHead>
                    <TableHead className="text-right text-xs">الكمية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.materialUsage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-muted-foreground text-xs">
                        لا توجد بيانات
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.materialUsage.map((m, i) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-xs">{m.name}</TableCell>
                        <TableCell className="text-xs font-bold text-primary">{m.value}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Vehicles Summary Table */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">ملخص استخدام الآليات (ساعات)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-right text-xs">الآلية</TableHead>
                    <TableHead className="text-right text-xs">الساعات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.vehicleUsage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-muted-foreground text-xs">
                        لا توجد بيانات
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.vehicleUsage.map((v, i) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-xs">{v.name}</TableCell>
                        <TableCell className="text-xs font-bold text-orange-600">{v.value}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Crew Summary Table */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">ملخص الطاقم الفني (ساعات)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-right text-xs">العضو</TableHead>
                    <TableHead className="text-right text-xs">الساعات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.crewUsage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-muted-foreground text-xs">
                        لا توجد بيانات
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.crewUsage.map((c, i) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-xs">{c.name}</TableCell>
                        <TableCell className="text-xs font-bold text-green-600">{c.value}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Forms Table */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">تفاصيل البلاغات</CardTitle>
            <div className="flex gap-2 no-print">
              <Button variant="outline" size="sm" onClick={handlePrintReport}>
                <Printer className="ml-2 h-4 w-4" />
                طباعة التقرير
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <Download className="ml-2 h-4 w-4" />
                تصدير Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم البلاغ</TableHead>
                    <TableHead className="text-right">القطاع</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">المواد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredForms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        لا توجد بيانات تطابق الفلاتر المختارة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredForms.map((form) => {
                      const formMaterials = materialsUsed.filter(m => m.form_id === form.id)
                      const sectorName = Array.isArray(form.sectors)
                        ? form.sectors[0]?.name
                        : form.sectors?.name || 
                          sectors.find(s => s.id === form.sector_id)?.name || 
                          ""
                      return (
                        <TableRow key={form.id}>
                          <TableCell className="font-medium">{form.form_number}</TableCell>
                          <TableCell>{sectorName}</TableCell>
                          <TableCell>{form.date}</TableCell>
                          <TableCell>
                            <Badge variant={
                              form.status === 'closed' ? 'default' : 
                              form.status === 'draft' ? 'secondary' : 'outline'
                            }>
                              {form.status === 'draft' ? 'مسودة' : 
                               form.status === 'printed' ? 'مطبوع' : 
                               form.status === 'signed' ? 'موقع' : 'مغلق'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {formMaterials.slice(0, 1).map((m, i) => (
                                <span key={i} className="text-[10px] bg-muted px-1 rounded">
                                  {m.details} ({m.quantity})
                                </span>
                              ))}
                              {formMaterials.length > 1 && (
                                <span className="text-[10px] bg-muted px-1 rounded">
                                  +{formMaterials.length - 1}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
