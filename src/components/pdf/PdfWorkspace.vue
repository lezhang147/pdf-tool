<template>
  <div class="workspace" :class="{ 'is-editing': !!pdfStore.currentFile }">
    <div v-if="!pdfStore.currentFile" class="upload-container">
      <div class="upload-box glass-panel">
        <el-icon :size="48" color="var(--primary-color)"><UploadFilled /></el-icon>
        <h3>上传 PDF 文件</h3>
        <p>点击或拖拽文件到此处</p>
        <el-button type="primary" size="large" class="mt-4" @click="triggerUpload">选择文件</el-button>
        <input type="file" ref="fileInput" accept=".pdf" style="display: none" @change="handleFileSelect" />
      </div>
    </div>
    
    <PdfViewer v-else />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { usePdfStore } from '../../store/pdf'
import PdfViewer from './PdfViewer.vue'

const pdfStore = usePdfStore()
const fileInput = ref<HTMLInputElement | null>(null)

const triggerUpload = () => {
  fileInput.value?.click()
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    if (file.type !== 'application/pdf') {
      ElMessage.error('请选择 PDF 格式的文件！')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      ElMessage.warning('文件过大，请上传 50MB 以内的文件')
      return
    }
    pdfStore.setFile(file)
  }
}
</script>

<style scoped>
.workspace {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, #0f172a 100%);
}

.workspace.is-editing {
  display: block;
  background: #525659;
}

.upload-container {
  width: 100%;
  max-width: 600px;
  padding: 20px;
}

.upload-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  border: 2px dashed rgba(79, 70, 229, 0.3);
  transition: all 0.3s ease;
}

.upload-box:hover {
  border-color: var(--primary-color);
  background: rgba(255, 255, 255, 0.8);
}

.upload-box h3 {
  margin: 16px 0 8px;
  color: var(--text-main);
}

.upload-box p {
  color: #6b7280;
  font-size: 0.9rem;
}

.mt-4 {
  margin-top: 16px;
}
</style>
