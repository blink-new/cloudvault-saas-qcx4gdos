import { blink } from '../blink/client'

export interface DocumentMetadata {
  documentReference: string
  revisionNumber: string
  versionLabel: string
  lastModified: string
  modifiedBy: string
  organizationName: string
  changeNotes: string
}

export interface MetadataEmbedding {
  success: boolean
  modifiedFileUrl?: string
  originalFileUrl: string
  metadata: DocumentMetadata
  embeddingMethod: string
}

export class DocumentMetadataService {
  private static instance: DocumentMetadataService
  
  static getInstance(): DocumentMetadataService {
    if (!DocumentMetadataService.instance) {
      DocumentMetadataService.instance = new DocumentMetadataService()
    }
    return DocumentMetadataService.instance
  }

  /**
   * Embed metadata into document based on file type
   */
  async embedMetadataInDocument(
    file: File,
    metadata: DocumentMetadata,
    organizationId: string
  ): Promise<MetadataEmbedding> {
    try {
      const fileType = file.type.toLowerCase()
      
      // For now, we'll create a metadata overlay/watermark approach
      // In a full implementation, you'd use specific libraries for each file type
      
      if (fileType.includes('pdf')) {
        return await this.embedInPDF(file, metadata, organizationId)
      } else if (fileType.startsWith('image/')) {
        return await this.embedInImage(file, metadata, organizationId)
      } else if (fileType.includes('document') || fileType.includes('text')) {
        return await this.embedInDocument(file, metadata, organizationId)
      } else {
        // For other file types, create a companion metadata file
        return await this.createCompanionMetadata(file, metadata, organizationId)
      }
    } catch (error) {
      console.error('Error embedding metadata:', error)
      return {
        success: false,
        originalFileUrl: URL.createObjectURL(file),
        metadata,
        embeddingMethod: 'none'
      }
    }
  }

  /**
   * Extract metadata from existing document
   */
  async extractMetadataFromDocument(fileUrl: string): Promise<DocumentMetadata | null> {
    try {
      // This would use AI to extract metadata from the document
      const { object: extractedData } = await blink.ai.generateObject({
        prompt: `Extract document metadata from this file if present. Look for:
        - Document reference numbers
        - Version/revision numbers
        - Last modified dates
        - Author information
        - Change notes or revision history
        
        File URL: ${fileUrl}`,
        schema: {
          type: 'object',
          properties: {
            documentReference: { type: 'string' },
            revisionNumber: { type: 'string' },
            versionLabel: { type: 'string' },
            lastModified: { type: 'string' },
            modifiedBy: { type: 'string' },
            changeNotes: { type: 'string' },
            hasMetadata: { type: 'boolean' }
          },
          required: ['hasMetadata']
        }
      })

      if (!extractedData.hasMetadata) {
        return null
      }

      return {
        documentReference: extractedData.documentReference || '',
        revisionNumber: extractedData.revisionNumber || '',
        versionLabel: extractedData.versionLabel || '',
        lastModified: extractedData.lastModified || new Date().toISOString(),
        modifiedBy: extractedData.modifiedBy || '',
        organizationName: '',
        changeNotes: extractedData.changeNotes || ''
      }
    } catch (error) {
      console.error('Error extracting metadata:', error)
      return null
    }
  }

  /**
   * Generate metadata footer/header text
   */
  generateMetadataText(metadata: DocumentMetadata): string {
    return `
Document Reference: ${metadata.documentReference}
Revision: ${metadata.revisionNumber} | Version: ${metadata.versionLabel}
Last Modified: ${new Date(metadata.lastModified).toLocaleDateString()}
Modified By: ${metadata.modifiedBy}
Organization: ${metadata.organizationName}
${metadata.changeNotes ? `Changes: ${metadata.changeNotes}` : ''}
    `.trim()
  }

  /**
   * Create metadata overlay for images
   */
  private async embedInImage(
    file: File,
    metadata: DocumentMetadata,
    organizationId: string
  ): Promise<MetadataEmbedding> {
    try {
      // Create a canvas to add metadata overlay
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      return new Promise((resolve) => {
        img.onload = async () => {
          canvas.width = img.width
          canvas.height = img.height
          
          // Draw original image
          ctx!.drawImage(img, 0, 0)
          
          // Add metadata overlay in bottom right
          ctx!.fillStyle = 'rgba(0, 0, 0, 0.7)'
          ctx!.fillRect(canvas.width - 300, canvas.height - 100, 300, 100)
          
          ctx!.fillStyle = 'white'
          ctx!.font = '12px Arial'
          ctx!.fillText(`Doc: ${metadata.documentReference}`, canvas.width - 290, canvas.height - 80)
          ctx!.fillText(`Rev: ${metadata.revisionNumber}`, canvas.width - 290, canvas.height - 65)
          ctx!.fillText(`Ver: ${metadata.versionLabel}`, canvas.width - 290, canvas.height - 50)
          ctx!.fillText(`Modified: ${new Date(metadata.lastModified).toLocaleDateString()}`, canvas.width - 290, canvas.height - 35)
          ctx!.fillText(`By: ${metadata.modifiedBy}`, canvas.width - 290, canvas.height - 20)
          
          // Convert to blob and upload
          canvas.toBlob(async (blob) => {
            if (blob) {
              const { publicUrl } = await blink.storage.upload(
                blob,
                `organizations/${organizationId}/files/metadata_${file.name}`,
                { upsert: true }
              )
              
              resolve({
                success: true,
                modifiedFileUrl: publicUrl,
                originalFileUrl: URL.createObjectURL(file),
                metadata,
                embeddingMethod: 'image_overlay'
              })
            } else {
              resolve({
                success: false,
                originalFileUrl: URL.createObjectURL(file),
                metadata,
                embeddingMethod: 'none'
              })
            }
          }, file.type)
        }
        
        img.src = URL.createObjectURL(file)
      })
    } catch (error) {
      console.error('Error embedding in image:', error)
      return {
        success: false,
        originalFileUrl: URL.createObjectURL(file),
        metadata,
        embeddingMethod: 'none'
      }
    }
  }

  /**
   * Embed metadata in PDF (simplified approach)
   */
  private async embedInPDF(
    file: File,
    metadata: DocumentMetadata,
    organizationId: string
  ): Promise<MetadataEmbedding> {
    // For now, create a companion metadata file
    // In a full implementation, you'd use PDF-lib or similar
    return await this.createCompanionMetadata(file, metadata, organizationId)
  }

  /**
   * Embed metadata in text documents
   */
  private async embedInDocument(
    file: File,
    metadata: DocumentMetadata,
    organizationId: string
  ): Promise<MetadataEmbedding> {
    try {
      const content = await file.text()
      const metadataHeader = `
=== DOCUMENT METADATA ===
${this.generateMetadataText(metadata)}
=========================

`
      
      const modifiedContent = metadataHeader + content
      const blob = new Blob([modifiedContent], { type: file.type })
      
      const { publicUrl } = await blink.storage.upload(
        blob,
        `organizations/${organizationId}/files/metadata_${file.name}`,
        { upsert: true }
      )
      
      return {
        success: true,
        modifiedFileUrl: publicUrl,
        originalFileUrl: URL.createObjectURL(file),
        metadata,
        embeddingMethod: 'text_header'
      }
    } catch (error) {
      console.error('Error embedding in document:', error)
      return {
        success: false,
        originalFileUrl: URL.createObjectURL(file),
        metadata,
        embeddingMethod: 'none'
      }
    }
  }

  /**
   * Create companion metadata file
   */
  private async createCompanionMetadata(
    file: File,
    metadata: DocumentMetadata,
    organizationId: string
  ): Promise<MetadataEmbedding> {
    try {
      const metadataContent = JSON.stringify({
        originalFileName: file.name,
        originalFileSize: file.size,
        originalFileType: file.type,
        ...metadata,
        createdAt: new Date().toISOString()
      }, null, 2)
      
      const metadataBlob = new Blob([metadataContent], { type: 'application/json' })
      const metadataFileName = `${file.name}.metadata.json`
      
      const { publicUrl } = await blink.storage.upload(
        metadataBlob,
        `organizations/${organizationId}/files/${metadataFileName}`,
        { upsert: true }
      )
      
      return {
        success: true,
        modifiedFileUrl: publicUrl,
        originalFileUrl: URL.createObjectURL(file),
        metadata,
        embeddingMethod: 'companion_file'
      }
    } catch (error) {
      console.error('Error creating companion metadata:', error)
      return {
        success: false,
        originalFileUrl: URL.createObjectURL(file),
        metadata,
        embeddingMethod: 'none'
      }
    }
  }
}

export const documentMetadataService = DocumentMetadataService.getInstance()