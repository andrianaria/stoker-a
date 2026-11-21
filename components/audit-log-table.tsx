"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Filter, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface AuditLogTableProps {
  logs: any[]
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  const [filteredLogs, setFilteredLogs] = useState(logs)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [tableFilter, setTableFilter] = useState("all")

  const handleFilter = () => {
    let filtered = logs

    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.table_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.action?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (actionFilter !== "all") {
      filtered = filtered.filter((log) => log.action === actionFilter)
    }

    if (tableFilter !== "all") {
      filtered = filtered.filter((log) => log.table_name === tableFilter)
    }

    setFilteredLogs(filtered)
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "INSERT":
        return <Badge className="bg-green-100 text-green-800">CREATE</Badge>
      case "UPDATE":
        return <Badge className="bg-blue-100 text-blue-800">UPDATE</Badge>
      case "DELETE":
        return <Badge variant="destructive">DELETE</Badge>
      case "SELECT":
        return <Badge variant="secondary">VIEW</Badge>
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  const uniqueActions = [...new Set(logs.map((log) => log.action))].filter(Boolean)
  const uniqueTables = [...new Set(logs.map((log) => log.table_name))].filter(Boolean)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Input
            placeholder="Search by user, table, or action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map((action) => (
              <SelectItem key={action} value={action}>
                {action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Table" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            {uniqueTables.map((table) => (
              <SelectItem key={table} value={table}>
                {table}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleFilter}>
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-sm">{new Date(log.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{log.user?.full_name || "System"}</div>
                    <div className="text-sm text-muted-foreground">{log.user?.email}</div>
                  </div>
                </TableCell>
                <TableCell>{getActionBadge(log.action)}</TableCell>
                <TableCell className="font-mono">{log.table_name}</TableCell>
                <TableCell className="font-mono text-sm">{log.ip_address || "N/A"}</TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Audit Log Details</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <strong>Timestamp:</strong>
                            <div className="font-mono text-sm">{new Date(log.created_at).toLocaleString()}</div>
                          </div>
                          <div>
                            <strong>User:</strong>
                            <div>{log.user?.full_name || "System"}</div>
                          </div>
                          <div>
                            <strong>Action:</strong>
                            <div>{log.action}</div>
                          </div>
                          <div>
                            <strong>Table:</strong>
                            <div className="font-mono">{log.table_name}</div>
                          </div>
                        </div>
                        {log.old_values && (
                          <div>
                            <strong>Old Values:</strong>
                            <pre className="bg-muted p-2 rounded text-sm overflow-auto">
                              {JSON.stringify(log.old_values, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.new_values && (
                          <div>
                            <strong>New Values:</strong>
                            <pre className="bg-muted p-2 rounded text-sm overflow-auto">
                              {JSON.stringify(log.new_values, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.user_agent && (
                          <div>
                            <strong>User Agent:</strong>
                            <div className="text-sm text-muted-foreground">{log.user_agent}</div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">No audit logs found matching the current filters.</div>
      )}
    </div>
  )
}
