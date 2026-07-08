import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Annotation {
  id: string
  page: number
  text: string
  x: number
  y: number
  color: string
  fontSize: number
  fontFamily: string
  fontWeight: 'normal' | 'bold'
  isWhiteBg: boolean
  bgColor: string
  letterSpacing: number
  blur: number
  opacity: number
}

export const usePdfStore = defineStore('pdf', () => {
  const currentFile = ref<File | null>(null)
  const fileUrl = ref<string>('')
  const totalPages = ref(0)
  const currentPage = ref(1)
  const annotations = ref<Annotation[]>([])
  
  const setFile = (file: File) => {
    currentFile.value = file
    fileUrl.value = URL.createObjectURL(file)
  }
  
  const clearFile = () => {
    currentFile.value = null
    if (fileUrl.value) {
      URL.revokeObjectURL(fileUrl.value)
    }
    fileUrl.value = ''
    totalPages.value = 0
    currentPage.value = 1
    annotations.value = []
  }

  return { currentFile, fileUrl, totalPages, currentPage, annotations, setFile, clearFile }
})
