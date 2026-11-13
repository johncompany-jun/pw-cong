export type PermitFileSummary = {
  id: number
  permitId: number
  fileName: string
  mimeType: string
  sortOrder: number
}

export type PermitListItem = {
  id: number
  spotId: number
  startDate: string
  endDate: string
  uploadedBy: number
  createdAt: string
  spotName: string
  fileCount: number
  firstFile: PermitFileSummary | null
}

export type PermitFileDetail = {
  id: number
  permitId: number
  fileKey: string
  fileName: string
  mimeType: string
  fileSize: number
  sortOrder: number
  createdAt: string
}

export type PermitDetail = {
  id: number
  spotId: number
  startDate: string
  endDate: string
  uploadedBy: number
  createdAt: string
  spotName: string
  files: PermitFileDetail[]
}
