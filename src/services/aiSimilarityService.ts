import { blink } from '../blink/client'

export interface SimilarityResult {
  fileId: string
  fileName: string
  versionLabel: string
  uploadedBy: string
  createdAt: string
  similarityScore: number
  similarityReason: string
  contentSimilarity: number
  nameSimilarity: number
  aiAnalysis: string
}

export interface FileAnalysis {
  contentType: string
  keyTerms: string[]
  documentPurpose: string
  suggestedCategory: string
  extractedMetadata: Record<string, any>
}

export class AISimilarityService {
  private static instance: AISimilarityService
  
  static getInstance(): AISimilarityService {
    if (!AISimilarityService.instance) {
      AISimilarityService.instance = new AISimilarityService()
    }
    return AISimilarityService.instance
  }

  /**
   * Analyze file content using AI to extract metadata and understand purpose
   */
  async analyzeFileContent(file: File): Promise<FileAnalysis> {
    try {
      // Extract text content from file for AI analysis
      const textContent = await this.extractTextFromFile(file)
      
      // Use AI to analyze the content
      const { object: analysis } = await blink.ai.generateObject({
        prompt: `Analyze this document content and extract key information:
        
        File name: ${file.name}
        File type: ${file.type}
        Content preview: ${textContent.substring(0, 2000)}
        
        Please analyze and categorize this document.`,
        schema: {
          type: 'object',
          properties: {
            contentType: {
              type: 'string',
              description: 'Type of document (manual, brochure, logo, bom, cad, design, etc.)'
            },
            keyTerms: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key terms and concepts found in the document'
            },
            documentPurpose: {
              type: 'string',
              description: 'Main purpose or function of this document'
            },
            suggestedCategory: {
              type: 'string',
              description: 'Suggested category for organization'
            },
            extractedMetadata: {
              type: 'object',
              description: 'Any metadata found in the document (version numbers, dates, etc.)'
            }
          },
          required: ['contentType', 'keyTerms', 'documentPurpose', 'suggestedCategory', 'extractedMetadata']
        }
      })

      return analysis as FileAnalysis
    } catch (error) {
      console.error('Error analyzing file content:', error)
      return {
        contentType: 'unknown',
        keyTerms: [],
        documentPurpose: 'Unknown document purpose',
        suggestedCategory: 'general',
        extractedMetadata: {}
      }
    }
  }

  /**
   * Find similar files using AI-powered content analysis
   */
  async findSimilarFiles(
    file: File, 
    organizationId: string, 
    fileAnalysis: FileAnalysis
  ): Promise<SimilarityResult[]> {
    try {
      // Get existing files from the organization
      const existingFiles = await blink.db.files.list({
        where: {
          organization_id: organizationId,
          is_latest_version: "1"
        },
        limit: 20
      })

      if (existingFiles.length === 0) {
        return []
      }

      // Use AI to compare the new file with existing files
      const { object: similarityAnalysis } = await blink.ai.generateObject({
        prompt: `Analyze file similarity for smart version control:

        NEW FILE:
        - Name: ${file.name}
        - Type: ${file.type}
        - Content Type: ${fileAnalysis.contentType}
        - Purpose: ${fileAnalysis.documentPurpose}
        - Key Terms: ${fileAnalysis.keyTerms.join(', ')}

        EXISTING FILES:
        ${existingFiles.map((f, i) => `${i + 1}. ${f.name} (${f.version_label}) - ${f.file_type}`).join('\n')}

        For each existing file, determine:
        1. Content similarity (0-1): How similar is the content/purpose?
        2. Name similarity (0-1): How similar are the file names?
        3. Overall similarity (0-1): Combined similarity score
        4. Reason: Why they are similar or different
        5. Is this likely the same document type that should be versioned together?

        Only include files with overall similarity > 0.3`,
        schema: {
          type: 'object',
          properties: {
            similarities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  fileIndex: { type: 'number' },
                  contentSimilarity: { type: 'number' },
                  nameSimilarity: { type: 'number' },
                  overallSimilarity: { type: 'number' },
                  reason: { type: 'string' },
                  shouldVersion: { type: 'boolean' }
                },
                required: ['fileIndex', 'contentSimilarity', 'nameSimilarity', 'overallSimilarity', 'reason', 'shouldVersion']
              }
            }
          },
          required: ['similarities']
        }
      })

      // Convert AI analysis to SimilarityResult format
      const results: SimilarityResult[] = []
      
      for (const similarity of similarityAnalysis.similarities) {
        if (similarity.overallSimilarity > 0.3 && similarity.shouldVersion) {
          const existingFile = existingFiles[similarity.fileIndex]
          if (existingFile) {
            results.push({
              fileId: existingFile.id,
              fileName: existingFile.name,
              versionLabel: existingFile.version_label,
              uploadedBy: existingFile.uploaded_by,
              createdAt: existingFile.created_at,
              similarityScore: similarity.overallSimilarity,
              similarityReason: similarity.reason,
              contentSimilarity: similarity.contentSimilarity,
              nameSimilarity: similarity.nameSimilarity,
              aiAnalysis: `AI determined this is likely the same document type. ${similarity.reason}`
            })
          }
        }
      }

      return results.sort((a, b) => b.similarityScore - a.similarityScore)
    } catch (error) {
      console.error('Error finding similar files:', error)
      return []
    }
  }

  /**
   * Generate version label based on organization policy
   */
  async generateVersionLabel(
    organizationId: string, 
    existingFileId?: string,
    incrementType: 'major' | 'minor' | 'patch' = 'patch'
  ): Promise<string> {
    try {
      // Get organization policy
      const policies = await blink.db.organizationPolicies.list({
        where: { organization_id: organizationId }
      })
      
      const policy = policies[0] || {
        company_prefix: 'VT',
        version_format: '{prefix}-{seq:02d}-v{major}.{minor}.{patch}'
      }

      if (existingFileId) {
        // Get existing file to increment version
        const existingFile = await blink.db.files.list({
          where: { id: existingFileId }
        })
        
        if (existingFile[0]) {
          const currentVersion = existingFile[0].version_label
          const newVersion = this.incrementVersion(currentVersion, incrementType)
          return newVersion
        }
      }

      // Get next sequential number for new files
      const existingFiles = await blink.db.files.list({
        where: { organization_id: organizationId },
        orderBy: { sequential_number: 'desc' },
        limit: 1
      })

      const nextSeq = existingFiles[0]?.sequential_number ? existingFiles[0].sequential_number + 1 : 1
      
      // Format: VT-01-v1.0.0
      return policy.version_format
        .replace('{prefix}', policy.company_prefix)
        .replace('{seq:02d}', nextSeq.toString().padStart(2, '0'))
        .replace('{major}', '1')
        .replace('{minor}', '0')
        .replace('{patch}', '0')
    } catch (error) {
      console.error('Error generating version label:', error)
      return 'VT-01-v1.0.0'
    }
  }

  /**
   * Generate unique document reference
   */
  generateDocumentReference(organizationId: string, fileType: string): string {
    const timestamp = Date.now()
    const typePrefix = this.getTypePrefix(fileType)
    return `DOC-${typePrefix}-${timestamp}`
  }

  /**
   * Extract text content from file for analysis
   */
  private async extractTextFromFile(file: File): Promise<string> {
    try {
      if (file.type.startsWith('text/')) {
        return await file.text()
      }
      
      // For other file types, use file name and basic metadata
      return `${file.name} ${file.type} ${file.size} bytes`
    } catch (error) {
      console.error('Error extracting text from file:', error)
      return file.name
    }
  }

  /**
   * Increment version number based on type
   */
  private incrementVersion(currentVersion: string, incrementType: 'major' | 'minor' | 'patch'): string {
    // Extract version parts (e.g., "VT-01-v1.2.3" -> "1.2.3")
    const versionMatch = currentVersion.match(/v(\d+)\.(\d+)\.(\d+)/)
    if (!versionMatch) {
      return currentVersion + '.1'
    }

    let [, major, minor, patch] = versionMatch.map(Number)

    switch (incrementType) {
      case 'major':
        major++
        minor = 0
        patch = 0
        break
      case 'minor':
        minor++
        patch = 0
        break
      case 'patch':
      default:
        patch++
        break
    }

    // Preserve the prefix format
    const prefix = currentVersion.split('-v')[0]
    return `${prefix}-v${major}.${minor}.${patch}`
  }

  /**
   * Get type prefix for document reference
   */
  private getTypePrefix(fileType: string): string {
    if (fileType.startsWith('image/')) return 'IMG'
    if (fileType.includes('pdf')) return 'PDF'
    if (fileType.includes('document')) return 'DOC'
    if (fileType.includes('spreadsheet')) return 'XLS'
    if (fileType.includes('presentation')) return 'PPT'
    return 'FILE'
  }
}

export const aiSimilarityService = AISimilarityService.getInstance()