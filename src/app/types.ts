export type Source = {
  file_name: string
  page: number
}

export type AskResponse = {
  answer: string
  sources: Source[]
}

export type FileItem = {
  name: string
}