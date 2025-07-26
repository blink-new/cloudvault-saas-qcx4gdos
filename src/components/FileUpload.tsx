import React, { useState, useCallback } from 'react'
import { Upload, X, AlertTriangle, FileText, Image, Video, Music, Archive, File, Brain, Zap } from 'lucide-react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { blink } from '../blink/client'
import { aiSimilarityService, type SimilarityResult, type FileAnalysis } from '../services/aiSimilarityService'
import { documentMetadataService, type DocumentMetadata } from '../services/documentMetadataService'

interface FileUploadProps {
  organizationId: string
  currentPath: string
  onUploadComplete: () => void
}

interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'analyzing' | 'uploading' | 'complete' | 'error'
  similarFiles?: SimilarityResult[]
  versionLabel?: string
  versionNotes?: string
  fileAnalysis?: FileAnalysis
  documentMetadata?: DocumentMetadata
  aiProcessing?: boolean
}

const getFileIcon = (fileType: string | null | undefined) => {
  if (!fileType) return <File className="w-4 h-4" />
  if (fileType.startsWith('image/')) return <Image className="w-4 h-4" />
  if (fileType.startsWith('video/')) return <Video className="w-4 h-4" />
  if (fileType.startsWith('audio/')) return <Music className="w-4 h-4" />
  if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="w-4 h-4" />
  if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="w-4 h-4" />
  return <File className="w-4 h-4" />
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function FileUpload({ organizationId, currentPath, onUploadComplete }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [showSimilarDialog, setShowSimilarDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<UploadFile | null>(null)

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = []
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    return matrix[str2.length][str1.length]
  }

  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    const editDistance = levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  const generateFileHash = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer
        const bytes = new Uint8Array(arrayBuffer)
        
        // Create a simple hash from file metadata and content bytes
        let hash = 0
        const str = file.name + file.size + file.lastModified
        
        // Hash the filename and metadata
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i)
          hash = ((hash << 5) - hash) + char
          hash = hash & hash // Convert to 32-bit integer
        }
        
        // Add some bytes from file content to the hash
        for (let i = 0; i < Math.min(bytes.length, 100); i++) {
          hash = ((hash << 5) - hash) + bytes[i]
          hash = hash & hash
        }
        
        // Convert to positive hex string
        const hashStr = Math.abs(hash).toString(16)
        resolve(hashStr)
      }
      reader.readAsArrayBuffer(file.slice(0, 1000)) // Read first 1KB as binary
    })
  }

  const analyzeAndFindSimilarFiles = async (file: File): Promise<{ analysis: FileAnalysis, similarFiles: SimilarityResult[] }> => {
    try {
      // Simplified analysis - just basic file info for now
      const analysis: FileAnalysis = {
        contentType: file.type.includes('pdf') ? 'PDF Document' : 
                    file.type.startsWith('image/') ? 'Image File' :
                    file.type.includes('document') ? 'Text Document' : 'File',
        keyTerms: [file.name.split('.')[0]],
        documentPurpose: `${file.type.includes('pdf') ? 'PDF Document' : 
                         file.type.startsWith('image/') ? 'Image File' :
                         file.type.includes('document') ? 'Text Document' : 'File'} for organization`,
        suggestedCategory: 'general',
        extractedMetadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        }
      }
      
      // Simple similarity check based on file names
      const existingFiles = await blink.db.files.list({
        where: {
          organization_id: organizationId,
          is_latest_version: "1"
        },
        limit: 10
      })

      const similarFiles: SimilarityResult[] = []
      const fileName = file.name.toLowerCase()
      const fileBaseName = fileName.split('.')[0]

      for (const existingFile of existingFiles) {
        const existingName = existingFile.name.toLowerCase()
        const existingBaseName = existingName.split('.')[0]
        
        // Simple name similarity
        const nameSimilarity = calculateSimilarity(fileBaseName, existingBaseName)
        
        if (nameSimilarity > 0.5) {
          similarFiles.push({
            fileId: existingFile.id,
            fileName: existingFile.name,
            versionLabel: existingFile.version_label,
            uploadedBy: existingFile.uploaded_by,
            createdAt: existingFile.created_at,
            similarityScore: nameSimilarity,
            similarityReason: `Similar file name (${Math.round(nameSimilarity * 100)}% match)`,
            contentSimilarity: nameSimilarity,
            nameSimilarity: nameSimilarity,
            aiAnalysis: `File names are similar - this might be an updated version of "${existingFile.name}"`
          })
        }
      }
      
      return { analysis, similarFiles: similarFiles.sort((a, b) => b.similarityScore - a.similarityScore) }
    } catch (error) {
      console.error('Error analyzing file and finding similar files:', error)
      return { 
        analysis: {
          contentType: 'File',
          keyTerms: [file.name],
          documentPurpose: 'Document file',
          suggestedCategory: 'general',
          extractedMetadata: {}
        }, 
        similarFiles: [] 
      }
    }
  }

  const generateVersionLabel = async (organizationId: string, existingFileId?: string): Promise<string> => {
    try {
      if (existingFileId) {
        // Get existing file to increment version
        const existingFile = await blink.db.files.list({
          where: { id: existingFileId }
        })
        
        if (existingFile[0]) {
          const currentVersion = existingFile[0].version_label
          // Simple version increment
          const versionMatch = currentVersion.match(/v(\d+)\.(\d+)\.(\d+)/)
          if (versionMatch) {
            const [, major, minor, patch] = versionMatch.map(Number)
            const prefix = currentVersion.split('-v')[0]
            return `${prefix}-v${major}.${minor}.${patch + 1}`
          }
        }
      }

      // Get next sequential number for new files
      const existingFiles = await blink.db.files.list({
        where: { organization_id: organizationId },
        orderBy: { sequential_number: 'desc' },
        limit: 1
      })

      const nextSeq = existingFiles[0]?.sequential_number ? existingFiles[0].sequential_number + 1 : 1
      return `VT-${nextSeq.toString().padStart(2, '0')}-v1.0.0`
    } catch (error) {
      console.error('Error generating version label:', error)
      return `VT-01-v1.0.0`
    }
  }

  const uploadFile = async (uploadFile: UploadFile, replaceFileId?: string) => {
    try {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading' } : f
      ))

      const user = await blink.auth.me()
      const fileHash = await generateFileHash(uploadFile.file)
      
      // Generate version label
      const versionLabel = uploadFile.versionLabel || await generateVersionLabel(organizationId, replaceFileId)
      
      // Create document metadata
      const documentMetadata: DocumentMetadata = {
        documentReference: `DOC-${Date.now()}`,
        revisionNumber: versionLabel,
        versionLabel: versionLabel,
        lastModified: new Date().toISOString(),
        modifiedBy: user.email || user.id,
        organizationName: 'Sample Organization',
        changeNotes: uploadFile.versionNotes || (replaceFileId ? 'Updated version' : 'Initial version')
      }

      // Upload the original file directly (simplified approach)
      const { publicUrl } = await blink.storage.upload(
        uploadFile.file,
        `organizations/${organizationId}/files/${Date.now()}_${uploadFile.file.name}`,
        { upsert: true }
      )
      const finalFileUrl = publicUrl

      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 100))
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, progress } : f
        ))
      }

      const fileId = `file_${Date.now()}`
      const now = new Date().toISOString()

      if (replaceFileId) {
        // Create new version of existing file
        await blink.db.files.update(replaceFileId, { is_latest_version: "0" })
        
        // Get sequential number from parent file
        const parentFile = await blink.db.files.list({ where: { id: replaceFileId } })
        const sequentialNumber = parentFile[0]?.sequential_number || 1
        
        const newVersion = await blink.db.files.create({
          id: fileId,
          name: uploadFile.file.name,
          original_name: uploadFile.file.name,
          file_path: finalFileUrl,
          file_size: uploadFile.file.size.toString(),
          file_type: uploadFile.file.type || 'application/octet-stream',
          organization_id: organizationId,
          folder_path: currentPath || '/',
          uploaded_by: user.id,
          parent_file_id: replaceFileId,
          version_label: versionLabel,
          version_notes: uploadFile.versionNotes || 'Updated version',
          similarity_hash: fileHash,
          content_hash: fileHash,
          is_latest_version: "1",
          document_reference: documentMetadata.documentReference,
          revision_number: versionLabel,
          company_prefix: 'VT',
          sequential_number: sequentialNumber,
          revision_sequence: (parentFile[0]?.revision_sequence || 0) + 1,
          created_at: now,
          updated_at: now
        })

        // Add to version history
        await blink.db.fileVersions.create({
          id: `version_${Date.now()}`,
          file_id: replaceFileId,
          version_label: versionLabel,
          file_path: finalFileUrl,
          file_size: uploadFile.file.size,
          uploaded_by: user.id,
          version_notes: uploadFile.versionNotes || 'Updated version',
          is_current: "1",
          created_at: now
        })

        // Create detailed audit trail
        await blink.db.fileAuditTrail.create({
          id: `audit_${Date.now()}`,
          file_id: replaceFileId,
          version_id: fileId,
          organization_id: organizationId,
          user_id: user.id,
          action: 'version_update',
          change_summary: uploadFile.versionNotes || 'File updated with new version',
          detailed_changes: JSON.stringify({
            previousVersion: parentFile[0]?.version_label,
            newVersion: versionLabel,
            fileSize: uploadFile.file.size,
            fileName: uploadFile.file.name,
            fileType: uploadFile.file.type
          }),
          ai_similarity_score: uploadFile.similarFiles?.[0]?.similarityScore || 1.0,
          replaced_file_id: replaceFileId,
          created_at: now
        })
      } else {
        // Create new file
        const newFile = await blink.db.files.create({
          id: fileId,
          name: uploadFile.file.name,
          original_name: uploadFile.file.name,
          file_path: finalFileUrl,
          file_size: uploadFile.file.size.toString(),
          file_type: uploadFile.file.type || 'application/octet-stream',
          organization_id: organizationId,
          folder_path: currentPath || '/',
          uploaded_by: user.id,
          version_label: versionLabel,
          version_notes: uploadFile.versionNotes || 'Initial version',
          similarity_hash: fileHash,
          content_hash: fileHash,
          is_latest_version: "1",
          document_reference: documentMetadata.documentReference,
          revision_number: versionLabel,
          company_prefix: 'VT',
          sequential_number: 1,
          revision_sequence: 1,
          created_at: now,
          updated_at: now
        })

        // Create audit trail for new file
        await blink.db.fileAuditTrail.create({
          id: `audit_${Date.now()}`,
          file_id: fileId,
          organization_id: organizationId,
          user_id: user.id,
          action: 'upload',
          change_summary: 'New file uploaded',
          detailed_changes: JSON.stringify({
            fileName: uploadFile.file.name,
            fileSize: uploadFile.file.size,
            fileType: uploadFile.file.type,
            versionLabel: versionLabel,
            documentReference: documentMetadata.documentReference,
            aiAnalysis: uploadFile.fileAnalysis
          }),
          created_at: now
        })
      }

      // Log activity (legacy table)
      await blink.db.activityLog.create({
        id: `activity_${Date.now()}`,
        organization_id: organizationId,
        user_id: user.id,
        action: replaceFileId ? 'version_upload' : 'upload',
        details: `Uploaded ${uploadFile.file.name} (${versionLabel})`,
        created_at: now
      })

      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'complete', progress: 100 } : f
      ))

      onUploadComplete()
    } catch (error) {
      console.error('Upload error:', error)
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'error' } : f
      ))
    }
  }

  const handleFiles = async (files: FileList) => {
    const newFiles: UploadFile[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileId = `upload_${Date.now()}_${i}`
      
      // Create initial file entry
      const uploadFile: UploadFile = {
        file,
        id: fileId,
        progress: 0,
        status: 'analyzing',
        aiProcessing: true,
        versionNotes: ''
      }
      
      newFiles.push(uploadFile)
    }
    
    setUploadFiles(prev => [...prev, ...newFiles])
    
    // Process each file with AI analysis
    for (const uploadFile of newFiles) {
      try {
        // Analyze file and find similar files using AI
        const { analysis, similarFiles } = await analyzeAndFindSimilarFiles(uploadFile.file)
        const versionLabel = await generateVersionLabel(organizationId)
        
        // Update file with analysis results
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? {
            ...f,
            status: 'pending',
            aiProcessing: false,
            similarFiles,
            fileAnalysis: analysis,
            versionLabel
          } : f
        ))
        
        // If similar files found, show dialog for the first one
        if (similarFiles.length > 0) {
          const updatedFile = { ...uploadFile, similarFiles, fileAnalysis: analysis, versionLabel }
          setSelectedFile(updatedFile)
          setShowSimilarDialog(true)
          return // Process one at a time when similar files are found
        } else {
          // Start uploading immediately if no similar files
          const updatedFile = { ...uploadFile, similarFiles, fileAnalysis: analysis, versionLabel }
          uploadFile(updatedFile)
        }
      } catch (error) {
        console.error('Error processing file:', error)
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? {
            ...f,
            status: 'error',
            aiProcessing: false
          } : f
        ))
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleReplaceFile = (similarFileId: string) => {
    if (selectedFile) {
      uploadFile(selectedFile, similarFileId)
      setShowSimilarDialog(false)
      setSelectedFile(null)
    }
  }

  const handleUploadAsNew = () => {
    if (selectedFile) {
      uploadFile(selectedFile)
      setShowSimilarDialog(false)
      setSelectedFile(null)
    }
  }

  return (
    <>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver 
            ? 'border-black bg-gray-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium mb-2">Drop files here to upload</h3>
        <p className="text-gray-500 mb-4">or click to browse</p>
        <input
          type="file"
          multiple
          className="hidden"
          id="file-upload"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <Button asChild variant="outline">
          <label htmlFor="file-upload" className="cursor-pointer">
            Choose Files
          </label>
        </Button>
      </div>

      {uploadFiles.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="font-medium">Upload Queue</h4>
          {uploadFiles.map((uploadFile) => (
            <div key={uploadFile.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {getFileIcon(uploadFile.file.type)}
                  <div>
                    <p className="font-medium">{uploadFile.file.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(uploadFile.file.size)} • {uploadFile.versionLabel || 'Generating...'}
                    </p>
                    {uploadFile.fileAnalysis && (
                      <p className="text-xs text-blue-600">
                        {uploadFile.fileAnalysis.contentType} • {uploadFile.fileAnalysis.documentPurpose}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {uploadFile.aiProcessing && (
                    <div className="flex items-center space-x-1 text-blue-600">
                      <Brain className="w-4 h-4 animate-pulse" />
                      <span className="text-xs">AI Analyzing...</span>
                    </div>
                  )}
                  <Badge variant={
                    uploadFile.status === 'complete' ? 'default' :
                    uploadFile.status === 'error' ? 'destructive' :
                    uploadFile.status === 'uploading' ? 'secondary' :
                    uploadFile.status === 'analyzing' ? 'outline' : 'outline'
                  }>
                    {uploadFile.status === 'analyzing' ? 'AI Analysis' : uploadFile.status}
                  </Badge>
                  {(uploadFile.status === 'pending' || uploadFile.status === 'analyzing') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              {uploadFile.status === 'uploading' && (
                <Progress value={uploadFile.progress} className="w-full" />
              )}
              {uploadFile.similarFiles && uploadFile.similarFiles.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                  <div className="flex items-center space-x-2 text-yellow-800">
                    <Zap className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      AI found {uploadFile.similarFiles.length} similar file(s) - {Math.round(uploadFile.similarFiles[0].similarityScore * 100)}% match
                    </span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    {uploadFile.similarFiles[0].aiAnalysis}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showSimilarDialog} onOpenChange={setShowSimilarDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Similar Files Found</DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Uploading:</h4>
                <div className="flex items-center space-x-3">
                  {getFileIcon(selectedFile.file.type)}
                  <div>
                    <p className="font-medium">{selectedFile.file.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(selectedFile.file.size)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Similar files in your organization:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedFile.similarFiles?.map((similar) => (
                    <div key={similar.fileId} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{similar.fileName}</p>
                          <p className="text-sm text-gray-500">
                            {similar.versionLabel} • {Math.round(similar.similarityScore * 100)}% match
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReplaceFile(similar.fileId)}
                        >
                          Replace with new version
                        </Button>
                      </div>
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <p><strong>AI Analysis:</strong> {similar.aiAnalysis}</p>
                        <p className="mt-1">
                          <strong>Content:</strong> {Math.round(similar.contentSimilarity * 100)}% • 
                          <strong> Name:</strong> {Math.round(similar.nameSimilarity * 100)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Version Label</label>
                  <Input
                    value={selectedFile.versionLabel}
                    onChange={(e) => setSelectedFile(prev => prev ? {...prev, versionLabel: e.target.value} : null)}
                    placeholder="e.g., v1.0.1, POL-003 Rev B"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Version Notes</label>
                  <Textarea
                    value={selectedFile.versionNotes}
                    onChange={(e) => setSelectedFile(prev => prev ? {...prev, versionNotes: e.target.value} : null)}
                    placeholder="What changed in this version?"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={handleUploadAsNew}>
                  Upload as New File
                </Button>
                <Button onClick={() => setShowSimilarDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}