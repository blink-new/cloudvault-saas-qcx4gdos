import { useState, useEffect } from 'react'
import { blink } from '../blink/client'
import { 
  Search, 
  Upload, 
  Grid3X3, 
  List, 
  Settings, 
  Users, 
  Bell,
  ChevronDown,
  Plus,
  Folder,
  File,
  MoreHorizontal,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  History,
  Download,
  Share2,
  Trash2,
  Clock
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { FileUpload } from '../components/FileUpload'
import { VersionHistory } from '../components/VersionHistory'
import { AuditTrail } from '../components/AuditTrail'

interface DashboardProps {
  user: any
}

interface FileItem {
  id: string
  name: string
  original_name: string
  file_path: string
  file_size: number
  file_type: string | null
  organization_id: string
  folder_path: string
  uploaded_by: string
  created_at: string
  updated_at: string
  is_latest_version: string
  version_label: string
  version_notes: string
}

export default function Dashboard({ user }: DashboardProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showAuditTrail, setShowAuditTrail] = useState(false)

  // Mock organization data - in real app this would come from user's organizations
  const currentOrg = {
    id: 'org_sample',
    name: 'Sample Organization',
    role: 'Admin'
  }

  const loadFiles = async () => {
    setLoading(true)
    try {
      const fileList = await blink.db.files.list({
        where: {
          organization_id: currentOrg.id,
          is_latest_version: "1"
        },
        orderBy: { updated_at: 'desc' }
      })
      setFiles(fileList)
    } catch (error) {
      console.error('Error loading files:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getFileIcon = (fileType: string | null | undefined) => {
    if (!fileType) return <File className="w-5 h-5 text-gray-600" />
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5 text-gray-600" />
    if (fileType.startsWith('video/')) return <Video className="w-5 h-5 text-gray-600" />
    if (fileType.startsWith('audio/')) return <Music className="w-5 h-5 text-gray-600" />
    if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="w-5 h-5 text-gray-600" />
    if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="w-5 h-5 text-gray-600" />
    return <File className="w-5 h-5 text-gray-600" />
  }

  const formatFileSize = (bytes: number | string | null | undefined) => {
    // Handle null, undefined, or invalid values
    if (bytes === null || bytes === undefined || bytes === '' || isNaN(Number(bytes))) {
      return '0 Bytes'
    }
    
    const numBytes = Number(bytes)
    if (numBytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(numBytes) / Math.log(k))
    return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string | null | undefined) => {
    // Handle null, undefined, or invalid dates
    if (!dateString || dateString === '' || dateString === 'null') {
      return 'Unknown date'
    }
    
    const date = new Date(dateString)
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date'
    }
    
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays - 1} days ago`
    return date.toLocaleDateString()
  }

  const handleDownload = (file: FileItem) => {
    window.open(file.file_path, '_blank')
  }

  const handleDelete = async (file: FileItem) => {
    try {
      await blink.db.files.delete(file.id)
      
      // Log activity
      await blink.db.activityLog.create({
        id: `activity_${Date.now()}`,
        organization_id: currentOrg.id,
        file_id: file.id,
        user_id: user.id,
        action: 'delete',
        details: `Deleted ${file.name}`
      })
      
      loadFiles() // Refresh the file list
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  const handleVersionHistory = (file: FileItem) => {
    setSelectedFile(file)
    setShowVersionHistory(true)
  }

  const handleAuditTrail = (file: FileItem) => {
    setSelectedFile(file)
    setShowAuditTrail(true)
  }

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.version_label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-2xl font-bold text-black">Verto</h1>
              
              {/* Organization Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <span className="font-medium">{currentOrg.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {currentOrg.role}
                    </Badge>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem>
                    <div className="flex flex-col">
                      <span className="font-medium">{currentOrg.name}</span>
                      <span className="text-xs text-gray-500">{currentOrg.role}</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Organization
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Users className="w-4 h-4 mr-2" />
                    Join Organization
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search files and versions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {user.email?.[0]?.toUpperCase()}
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.email}</span>
                      <span className="text-xs text-gray-500">{currentOrg.role}</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => blink.auth.logout()}>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-gray-200 bg-white h-[calc(100vh-73px)]">
          <div className="p-6">
            <Button 
              className="w-full bg-black text-white hover:bg-gray-800"
              onClick={() => setShowUpload(!showUpload)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>

          <nav className="px-6 space-y-1">
            <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-black bg-gray-100 rounded-lg">
              <Folder className="w-4 h-4 mr-3" />
              All Files
            </a>
            <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg">
              <Users className="w-4 h-4 mr-3" />
              Shared with me
            </a>
            <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg">
              <Clock className="w-4 h-4 mr-3" />
              Recent Activity
            </a>
          </nav>

          <div className="px-6 mt-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Quick Access
            </h3>
            <div className="space-y-1">
              <a href="#" className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg">
                <Folder className="w-4 h-4 mr-3" />
                Projects
              </a>
              <a href="#" className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg">
                <Folder className="w-4 h-4 mr-3" />
                Documents
              </a>
            </div>
          </div>
        </aside>

        {/* File Explorer */}
        <main className="flex-1 p-6">
          {/* Upload Section */}
          {showUpload && (
            <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Upload Files</h3>
              <FileUpload
                organizationId={currentOrg.id}
                currentPath="/"
                onUploadComplete={() => {
                  loadFiles()
                  setShowUpload(false)
                }}
              />
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-black">All Files</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {loading ? 'Loading...' : `${filteredFiles.length} items`}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* File Grid/List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading files...</div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No files yet</h3>
              <p className="text-gray-500 mb-4">Get started by uploading your first file</p>
              <Button onClick={() => setShowUpload(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    {getFileIcon(file.file_type)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(file)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleVersionHistory(file)}>
                          <History className="w-4 h-4 mr-2" />
                          Version History
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAuditTrail(file)}>
                          <FileText className="w-4 h-4 mr-2" />
                          Audit Trail
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDelete(file)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <h3 className="font-medium text-black text-sm mb-1 truncate">
                    {file.name}
                  </h3>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>{formatFileSize(file.file_size)}</p>
                    <p>Modified {formatDate(file.updated_at)}</p>
                    <p>by {file.uploaded_by}</p>
                    <Badge variant="outline" className="text-xs">
                      {file.version_label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modified
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Version
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getFileIcon(file.file_type)}
                          <div className="ml-3">
                            <div className="text-sm font-medium text-black">
                              {file.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(file.file_size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div>{formatDate(file.updated_at)}</div>
                          <div className="text-xs">by {file.uploaded_by}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">
                          {file.version_label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownload(file)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleVersionHistory(file)}>
                              <History className="w-4 h-4 mr-2" />
                              Version History
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAuditTrail(file)}>
                              <FileText className="w-4 h-4 mr-2" />
                              Audit Trail
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share2 className="w-4 h-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDelete(file)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* Version History Modal */}
      {selectedFile && (
        <VersionHistory
          fileId={selectedFile.id}
          fileName={selectedFile.name}
          isOpen={showVersionHistory}
          onClose={() => {
            setShowVersionHistory(false)
            setSelectedFile(null)
          }}
          onRestore={() => {
            loadFiles() // Refresh files after restore
          }}
        />
      )}

      {/* Audit Trail Modal */}
      {selectedFile && (
        <AuditTrail
          fileId={selectedFile.id}
          fileName={selectedFile.name}
          isOpen={showAuditTrail}
          onClose={() => {
            setShowAuditTrail(false)
            setSelectedFile(null)
          }}
        />
      )}
    </div>
  )
}