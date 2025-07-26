import React, { useState, useEffect } from 'react'
import { Clock, Download, RotateCcw, User, FileText, Eye } from 'lucide-react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { blink } from '../blink/client'

interface VersionHistoryProps {
  fileId: string
  fileName: string
  isOpen: boolean
  onClose: () => void
  onRestore?: (versionId: string) => void
}

interface FileVersion {
  id: string
  version_label: string
  file_path: string
  file_size: number
  uploaded_by: string
  created_at: string
  version_notes: string
  is_current: string
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function VersionHistory({ fileId, fileName, isOpen, onClose, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<FileVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const loadCurrentUser = async () => {
    try {
      const user = await blink.auth.me()
      setCurrentUser(user)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const loadVersions = async () => {
    setLoading(true)
    try {
      // Get all versions for this file
      const fileVersions = await blink.db.fileVersions.list({
        where: { file_id: fileId },
        orderBy: { created_at: 'desc' }
      })

      // Also get the original file record
      const originalFile = await blink.db.files.list({
        where: { 
          OR: [
            { id: fileId },
            { parent_file_id: fileId }
          ]
        },
        orderBy: { created_at: 'desc' }
      })

      // Combine and format all versions
      const allVersions: FileVersion[] = []

      // Add file versions
      fileVersions.forEach(version => {
        allVersions.push({
          id: version.id,
          version_label: version.version_label,
          file_path: version.file_path,
          file_size: version.file_size,
          uploaded_by: version.uploaded_by,
          created_at: version.created_at,
          version_notes: version.version_notes || '',
          is_current: version.is_current
        })
      })

      // Add original file and its versions
      originalFile.forEach(file => {
        allVersions.push({
          id: file.id,
          version_label: file.version_label,
          file_path: file.file_path,
          file_size: file.file_size,
          uploaded_by: file.uploaded_by,
          created_at: file.created_at,
          version_notes: file.version_notes || '',
          is_current: file.is_latest_version
        })
      })

      // Remove duplicates and sort by date
      const uniqueVersions = allVersions.filter((version, index, self) => 
        index === self.findIndex(v => v.id === version.id)
      ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setVersions(uniqueVersions)
    } catch (error) {
      console.error('Error loading versions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && fileId) {
      loadVersions()
      loadCurrentUser()
    }
  }, [isOpen, fileId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = (version: FileVersion) => {
    // Open the file URL in a new tab to download
    window.open(version.file_path, '_blank')
  }

  const handleRestore = async (version: FileVersion) => {
    if (!onRestore) return

    try {
      // Mark all versions as not current
      await Promise.all(
        versions.map(v => 
          blink.db.fileVersions.update(v.id, { is_current: "0" })
        )
      )

      // Mark selected version as current
      await blink.db.fileVersions.update(version.id, { is_current: "1" })

      // Update the main file record
      await blink.db.files.update(fileId, {
        version_label: version.version_label,
        file_path: version.file_path,
        file_size: version.file_size,
        updated_at: new Date().toISOString()
      })

      // Log activity
      await blink.db.activityLog.create({
        id: `activity_${Date.now()}`,
        organization_id: 'org_sample', // This should come from props
        file_id: fileId,
        user_id: currentUser?.id || 'unknown',
        action: 'restore',
        details: `Restored to version ${version.version_label}`
      })

      onRestore(version.id)
      onClose()
    } catch (error) {
      console.error('Error restoring version:', error)
    }
  }

  const handlePreview = (version: FileVersion) => {
    // Open file in new tab for preview
    window.open(version.file_path, '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Version History - {fileName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading versions...</div>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">No versions found</div>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div key={version.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge 
                          variant={Number(version.is_current) > 0 ? "default" : "outline"}
                          className="font-medium"
                        >
                          {version.version_label}
                        </Badge>
                        {Number(version.is_current) > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                        {index === 0 && Number(version.is_current) === 0 && (
                          <Badge variant="outline" className="text-xs">
                            Latest
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>{version.uploaded_by}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(version.created_at)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <FileText className="w-4 h-4" />
                          <span>{formatFileSize(version.file_size)}</span>
                        </div>
                      </div>

                      {version.version_notes && (
                        <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                          <strong>Notes:</strong> {version.version_notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(version)}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Preview</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(version)}
                        className="flex items-center space-x-1"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </Button>

                      {Number(version.is_current) === 0 && onRestore && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(version)}
                          className="flex items-center space-x-1"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Restore</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {index < versions.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
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