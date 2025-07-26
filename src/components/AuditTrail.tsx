import React, { useState, useEffect } from 'react'
import { Clock, User, FileText, Upload, RotateCcw, Trash2, Share2, Brain, Zap } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Button } from './ui/button'
import { blink } from '../blink/client'

interface AuditTrailProps {
  fileId: string
  fileName: string
  isOpen: boolean
  onClose: () => void
}

interface AuditEntry {
  id: string
  action: string
  change_summary: string
  detailed_changes: string
  ai_similarity_score?: number
  user_id: string
  created_at: string
  version_id?: string
  replaced_file_id?: string
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'upload':
      return <Upload className="w-4 h-4 text-green-600" />
    case 'version_update':
      return <FileText className="w-4 h-4 text-blue-600" />
    case 'restore':
      return <RotateCcw className="w-4 h-4 text-orange-600" />
    case 'delete':
      return <Trash2 className="w-4 h-4 text-red-600" />
    case 'share':
      return <Share2 className="w-4 h-4 text-purple-600" />
    default:
      return <Clock className="w-4 h-4 text-gray-600" />
  }
}

const getActionColor = (action: string) => {
  switch (action) {
    case 'upload':
      return 'bg-green-50 border-green-200'
    case 'version_update':
      return 'bg-blue-50 border-blue-200'
    case 'restore':
      return 'bg-orange-50 border-orange-200'
    case 'delete':
      return 'bg-red-50 border-red-200'
    case 'share':
      return 'bg-purple-50 border-purple-200'
    default:
      return 'bg-gray-50 border-gray-200'
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function AuditTrail({ fileId, fileName, isOpen, onClose }: AuditTrailProps) {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  const loadAuditTrail = async () => {
    setLoading(true)
    try {
      const entries = await blink.db.fileAuditTrail.list({
        where: { file_id: fileId },
        orderBy: { created_at: 'desc' }
      })
      setAuditEntries(entries)
    } catch (error) {
      console.error('Error loading audit trail:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && fileId) {
      loadAuditTrail()
    }
  }, [isOpen, fileId]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpanded = (entryId: string) => {
    setExpandedEntry(expandedEntry === entryId ? null : entryId)
  }

  const parseDetailedChanges = (detailedChanges: string) => {
    try {
      return JSON.parse(detailedChanges)
    } catch {
      return {}
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Audit Trail - {fileName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading audit trail...</div>
            </div>
          ) : auditEntries.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">No audit entries found</div>
            </div>
          ) : (
            <div className="space-y-4">
              {auditEntries.map((entry, index) => {
                const detailedChanges = parseDetailedChanges(entry.detailed_changes)
                const isExpanded = expandedEntry === entry.id
                
                return (
                  <div key={entry.id} className={`border rounded-lg p-4 ${getActionColor(entry.action)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getActionIcon(entry.action)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="outline" className="text-xs font-medium">
                              {entry.action.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {entry.ai_similarity_score && entry.ai_similarity_score > 0 && (
                              <div className="flex items-center space-x-1 text-blue-600">
                                <Brain className="w-3 h-3" />
                                <span className="text-xs">
                                  {Math.round(entry.ai_similarity_score * 100)}% AI Match
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <p className="font-medium text-sm mb-1">{entry.change_summary}</p>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-600 mb-2">
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>{entry.user_id}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(entry.created_at)}</span>
                            </div>
                          </div>

                          {/* Quick summary of key changes */}
                          {detailedChanges && (
                            <div className="text-xs text-gray-700 space-y-1">
                              {detailedChanges.fileName && (
                                <p><strong>File:</strong> {detailedChanges.fileName}</p>
                              )}
                              {detailedChanges.newVersion && (
                                <p><strong>Version:</strong> {detailedChanges.previousVersion} → {detailedChanges.newVersion}</p>
                              )}
                              {detailedChanges.versionLabel && !detailedChanges.newVersion && (
                                <p><strong>Version:</strong> {detailedChanges.versionLabel}</p>
                              )}
                              {detailedChanges.documentReference && (
                                <p><strong>Doc Ref:</strong> {detailedChanges.documentReference}</p>
                              )}
                              {detailedChanges.metadataEmbedded && (
                                <div className="flex items-center space-x-1 text-green-600">
                                  <Zap className="w-3 h-3" />
                                  <span>Metadata embedded ({detailedChanges.embeddingMethod})</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(entry.id)}
                        className="text-xs"
                      >
                        {isExpanded ? 'Less' : 'More'}
                      </Button>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && detailedChanges && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <h5 className="text-xs font-semibold mb-2">Detailed Changes:</h5>
                        <div className="bg-white p-3 rounded border text-xs space-y-2">
                          {Object.entries(detailedChanges).map(([key, value]) => (
                            <div key={key} className="flex">
                              <span className="font-medium w-32 text-gray-600 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                              </span>
                              <span className="flex-1">
                                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {index < auditEntries.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}