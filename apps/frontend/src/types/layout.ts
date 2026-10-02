export type LayoutFileSummary = {
  id: number
  layoutId: number
  fileName: string
  mimeType: string
  sortOrder: number
}

export type LayoutListItem = {
  id: number
  spotId: number
  title: string
  comment: string | null
  startDate: string
  endDate: string
  uploadedBy: number
  createdAt: string
  spotName: string
  fileCount: number
  firstFile: LayoutFileSummary | null
}

export type LayoutFileDetail = {
  id: number
  layoutId: number
  fileKey: string
  fileName: string
  mimeType: string
  fileSize: number
  sortOrder: number
  createdAt: string
}

export type LayoutDetail = {
  id: number
  spotId: number
  title: string
  comment: string | null
  startDate: string
  endDate: string
  uploadedBy: number
  createdAt: string
  spotName: string
  files: LayoutFileDetail[]
}

export type SpotSummary = {
  id: number
  name: string
  visibility?: 'public' | 'private'
}
