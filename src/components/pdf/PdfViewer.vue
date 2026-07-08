<template>
  <div class="pdf-viewer-container">
    <!-- Full width immersive toolbar -->
    <div class="immersive-toolbar">
      <div class="toolbar-left">
        <el-button @click="prevPage" :disabled="pdfStore.currentPage <= 1" size="small" circle>
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <span class="page-indicator">{{ pdfStore.currentPage }} / {{ pdfStore.totalPages }}</span>
        <el-button @click="nextPage" :disabled="pdfStore.currentPage >= pdfStore.totalPages" size="small" circle>
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>
      
      <div class="toolbar-center">
        <!-- We can add zoom controls here later -->
      </div>
      
      <div class="toolbar-right">
        <el-button type="primary" plain @click="addText" class="tool-btn">
          <el-icon class="el-icon--left"><Edit /></el-icon>添加文字/涂改
        </el-button>
        <el-button type="success" @click="exportPdf" class="tool-btn" :loading="isExporting">
          <el-icon class="el-icon--left"><Download /></el-icon>下载导出
        </el-button>
      </div>
    </div>
    
    <div class="pdf-scroll-area">
      <div class="pdf-page-wrapper" :style="{ width: pageWidth + 'px', height: pageHeight + 'px' }">
        <canvas ref="pdfCanvas" class="pdf-canvas"></canvas>
        <EditorLayer v-if="pdfDocument" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../../store/auth'
import { usePdfStore } from '../../store/pdf'
import { pdfjsLib } from '../../lib/pdfjs'
import { PDFDocument } from 'pdf-lib'
import html2canvas from 'html2canvas'
import EditorLayer from './EditorLayer.vue'
import { ArrowLeft, ArrowRight, Edit, Download } from '@element-plus/icons-vue'

const authStore = useAuthStore()
const pdfStore = usePdfStore()
const pdfCanvas = ref<HTMLCanvasElement | null>(null)
const loading = ref(false)
const isExporting = ref(false)
let pdfDocument: any = null

const pageWidth = ref(0)
const pageHeight = ref(0)
let renderTask: any = null

const renderPage = async (num: number) => {
  if (!pdfDocument || !pdfCanvas.value) return
  
  loading.value = true
  try {
    const page = await pdfDocument.getPage(num)
    const scale = 1.5 
    const viewport = page.getViewport({ scale })
    
    pageWidth.value = viewport.width
    pageHeight.value = viewport.height
    
    const canvas = pdfCanvas.value
    const context = canvas.getContext('2d')
    
    canvas.height = viewport.height
    canvas.width = viewport.width
    
    const renderContext = {
      canvasContext: context!,
      viewport: viewport
    }
    
    if (renderTask) {
      renderTask.cancel()
    }
    
    renderTask = page.render(renderContext)
    await renderTask.promise
  } catch (error: any) {
    if (error.name !== 'RenderingCancelledException') {
      console.error('Error rendering page:', error)
    }
  } finally {
    loading.value = false
  }
}

const loadPdf = async () => {
  if (!pdfStore.fileUrl) return
  
  loading.value = true
  try {
    const loadingTask = pdfjsLib.getDocument({ url: pdfStore.fileUrl })
    pdfDocument = await loadingTask.promise
    pdfStore.totalPages = pdfDocument.numPages
    pdfStore.currentPage = 1
    await renderPage(1)
  } catch (error) {
    console.error('Error loading PDF:', error)
  } finally {
    loading.value = false
  }
}

const prevPage = () => {
  if (pdfStore.currentPage <= 1) return
  pdfStore.currentPage--
  renderPage(pdfStore.currentPage)
}

const nextPage = () => {
  if (pdfStore.currentPage >= pdfStore.totalPages) return
  pdfStore.currentPage++
  renderPage(pdfStore.currentPage)
}

const addText = () => {
  pdfStore.annotations.push({
    id: 'anno_' + Date.now(),
    page: pdfStore.currentPage,
    text: '',
    x: 50,
    y: 50,
    color: '#000000',
    fontSize: 16,
    fontFamily: "'SimHei', 'STHeiti', sans-serif",
    fontWeight: 'normal',
    isWhiteBg: true,
    bgColor: '#FFFFFF',
    letterSpacing: 0,
    blur: 0,
    opacity: 1
  })
}

const exportPdf = async () => {
  if (!pdfStore.currentFile) return
  
  if (!authStore.isVIP) {
    ElMessageBox.prompt('请输入您在闲鱼获取的激活密钥', '解锁导出特权', {
      confirmButtonText: '验证并激活',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '激活码不能为空'
    }).then(({ value }) => {
      if (authStore.validateKey(value)) {
        authStore.setLicenseKey(value)
        ElMessage.success('激活成功！正在为您导出...')
        performExport()
      } else {
        ElMessage.error('激活码无效，请检查后重试或联系客服。')
      }
    }).catch(() => {
      // User cancelled
    })
    return
  }
  
  performExport()
}

const performExport = async () => {
  if (!pdfStore.currentFile) return
  isExporting.value = true
  
  try {
    const file = pdfStore.currentFile
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    const pages = pdfDoc.getPages()
    
    const overlay = document.querySelector('.editor-layer') as HTMLElement
    if (overlay) overlay.click()
    
    for (const anno of pdfStore.annotations) {
      const pageIndex = anno.page - 1
      if (pageIndex < 0 || pageIndex >= pages.length) continue
      
      const page = pages[pageIndex]
      const { height: pdfHeight } = page.getSize()
      const node = document.getElementById('anno_node_' + anno.id) as HTMLTextAreaElement
      if (!node) continue
      
      const domWidth = node.offsetWidth
      const domHeight = node.offsetHeight
      
      const tempDiv = document.createElement('div')
      tempDiv.style.width = domWidth + 'px'
      tempDiv.style.height = domHeight + 'px'
      tempDiv.style.fontSize = anno.fontSize + 'px'
      tempDiv.style.fontFamily = anno.fontFamily
      tempDiv.style.fontWeight = anno.fontWeight
      tempDiv.style.color = anno.color
      tempDiv.style.backgroundColor = anno.isWhiteBg ? anno.bgColor : 'transparent'
      tempDiv.style.letterSpacing = anno.letterSpacing + 'px'
      tempDiv.style.padding = '2px 4px'
      tempDiv.style.boxSizing = 'border-box'
      tempDiv.style.whiteSpace = 'pre-wrap'
      tempDiv.style.wordBreak = 'break-word'
      tempDiv.style.lineHeight = '1.5'
      tempDiv.innerText = anno.text
      tempDiv.style.position = 'fixed'
      tempDiv.style.top = '-9999px'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)
      
      const rawCanvas = await html2canvas(tempDiv, { backgroundColor: null, scale: 2 })
      document.body.removeChild(tempDiv)
      
      const finalCanvas = document.createElement('canvas')
      finalCanvas.width = rawCanvas.width
      finalCanvas.height = rawCanvas.height
      const ctx = finalCanvas.getContext('2d')
      
      if (ctx) {
        ctx.filter = `blur(${anno.blur * 2}px)`
        ctx.globalAlpha = anno.opacity
        ctx.drawImage(rawCanvas, 0, 0)
      }
      
      const pngDataUrl = finalCanvas.toDataURL('image/png')
      const pngBytes = await fetch(pngDataUrl).then(res => res.arrayBuffer())
      const pdfImage = await pdfDoc.embedPng(pngBytes)
      
      const scaleFactor = 1.5 
      page.drawImage(pdfImage, {
        x: anno.x / scaleFactor,
        y: pdfHeight - (anno.y / scaleFactor) - (domHeight / scaleFactor),
        width: domWidth / scaleFactor,
        height: domHeight / scaleFactor
      })
    }
    
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `edited_${file.name}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功！')
  } catch (error) {
    console.error('Export error:', error)
    ElMessage.error('导出失败，请重试')
  } finally {
    isExporting.value = false
  }
}

onMounted(() => {
  loadPdf()
})

onUnmounted(() => {
  if (renderTask) {
    renderTask.cancel()
  }
})
</script>

<style scoped>
.pdf-viewer-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.immersive-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #f3f4f6;
  border-bottom: 1px solid #d1d5db;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  z-index: 20;
}

.toolbar-left, .toolbar-right, .toolbar-center {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-indicator {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  min-width: 50px;
  text-align: center;
}

.tool-btn {
  font-weight: 500;
}

.pdf-scroll-area {
  flex: 1;
  overflow: auto;
  background-color: #525659;
  display: flex;
  justify-content: center;
  padding: 24px;
}

.pdf-page-wrapper {
  position: relative;
  background-color: white;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  margin: auto; 
}

.pdf-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
