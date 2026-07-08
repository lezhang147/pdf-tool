<template>
  <div class="editor-layer" :class="{ 'picking-mode': pickingMode !== null }" @click.self="handleLayerClick">
    <div
      v-for="anno in pageAnnotations"
      :key="anno.id"
      class="annotation-box"
      :class="{ selected: selectedId === anno.id, 'white-bg': anno.isWhiteBg }"
      :style="{ left: `${anno.x}px`, top: `${anno.y}px`, fontSize: `${anno.fontSize}px`, color: anno.color }"
      @mousedown.stop="startDrag(anno.id, $event)"
      @click="selectedId = anno.id"
    >
      <div v-if="selectedId === anno.id" class="controls-popup">
        <div class="toolbar-row">
          <el-select v-model="anno.fontFamily" size="small" style="width: 90px">
            <el-option label="黑体" value="'SimHei', 'STHeiti', sans-serif" />
            <el-option label="宋体" value="'SimSun', 'STSong', serif" />
            <el-option label="楷体" value="'KaiTi', 'STKaiti', serif" />
            <el-option label="仿宋" value="'FangSong', 'STFangsong', serif" />
          </el-select>
          
          <el-input-number v-model="anno.fontSize" size="small" :min="8" :max="72" style="width: 90px" />
          
          <el-button 
            size="small" 
            :type="anno.fontWeight === 'bold' ? 'primary' : 'default'"
            @click.stop="toggleBold(anno)"
            title="加粗"
          >B</el-button>
          
          <el-color-picker v-model="anno.color" size="small" show-alpha title="手动选色" class="circular-color-picker" />
          <el-button size="small" circle @click.stop="startPicking('text')" :type="pickingMode === 'text' ? 'primary' : 'default'" title="在PDF上吸取字体颜色">
            <el-icon><Aim /></el-icon>
          </el-button>
          
          <div class="divider"></div>
          
          <el-button size="small" @click.stop="toggleBg(anno)" :type="anno.isWhiteBg ? 'primary' : 'default'" title="开启/关闭背景底色">底色</el-button>
          <el-color-picker v-if="anno.isWhiteBg" v-model="anno.bgColor" size="small" show-alpha title="手动选底色" class="circular-color-picker" />
          <el-button v-if="anno.isWhiteBg" size="small" circle @click.stop="startPicking('bg')" :type="pickingMode === 'bg' ? 'primary' : 'default'" title="在PDF上吸取纸张底色">
            <el-icon><Aim /></el-icon>
          </el-button>
          
          <el-button size="small" type="danger" @click.stop="deleteAnno(anno.id)">删</el-button>
        </div>
        
        <div class="toolbar-row weathering-row">
          <span class="label">字间距:</span>
          <el-slider v-model="anno.letterSpacing" :min="-2" :max="10" :step="0.5" style="width: 80px;" size="small" />
          
          <div class="divider"></div>
          <span class="label">模糊度(做旧):</span>
          <el-slider v-model="anno.blur" :min="0" :max="3" :step="0.1" style="width: 80px;" size="small" />
          
          <div class="divider"></div>
          <span class="label">透明度:</span>
          <el-slider v-model="anno.opacity" :min="0.3" :max="1" :step="0.05" style="width: 80px;" size="small" />
        </div>
      </div>
      
      <textarea
        v-model="anno.text"
        :id="'anno_node_' + anno.id"
        class="anno-input"
        :style="{ 
          fontSize: `${anno.fontSize}px`, 
          color: anno.color,
          fontFamily: anno.fontFamily,
          fontWeight: anno.fontWeight,
          backgroundColor: anno.isWhiteBg ? anno.bgColor : 'transparent',
          letterSpacing: `${anno.letterSpacing}px`,
          filter: `blur(${anno.blur}px)`,
          opacity: anno.opacity,
          padding: '2px 4px'
        }"
        placeholder="输入文字"
        @mousedown.stop
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePdfStore, type Annotation } from '../../store/pdf'
import { Aim } from '@element-plus/icons-vue'

const pdfStore = usePdfStore()
const selectedId = ref<string | null>(null)
const pickingMode = ref<'text' | 'bg' | null>(null)

const pageAnnotations = computed(() => {
  return pdfStore.annotations.filter(a => a.page === pdfStore.currentPage)
})

let isDragging = false
let dragTargetId: string | null = null
let startX = 0
let startY = 0
let initialX = 0
let initialY = 0

const clearSelection = () => {
  selectedId.value = null
  pickingMode.value = null
}

const startPicking = (mode: 'text' | 'bg') => {
  if (pickingMode.value === mode) {
    pickingMode.value = null
  } else {
    pickingMode.value = mode
  }
}

const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase()
}

const handleLayerClick = (e: MouseEvent) => {
  if (pickingMode.value && selectedId.value) {
    const anno = pdfStore.annotations.find(a => a.id === selectedId.value)
    if (!anno) return
    
    const canvas = document.querySelector('.pdf-canvas') as HTMLCanvasElement
    if (!canvas) {
      pickingMode.value = null
      return
    }
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const pixelX = Math.floor(x * scaleX)
    const pixelY = Math.floor(y * scaleY)
    
    const pixel = ctx.getImageData(pixelX, pixelY, 1, 1).data
    // Handle transparent pixels safely
    if (pixel[3] === 0) {
       pickingMode.value = null
       return
    }
    
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2])
    
    if (pickingMode.value === 'text') {
      anno.color = hex
    } else {
      anno.bgColor = hex
    }
    
    pickingMode.value = null
  } else {
    clearSelection()
  }
}

const startDrag = (id: string, e: MouseEvent) => {
  const anno = pdfStore.annotations.find(a => a.id === id)
  if (!anno) return
  
  selectedId.value = id
  isDragging = true
  dragTargetId = id
  startX = e.clientX
  startY = e.clientY
  initialX = anno.x
  initialY = anno.y
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging || !dragTargetId) return
  
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  
  const anno = pdfStore.annotations.find(a => a.id === dragTargetId)
  if (anno) {
    anno.x = initialX + dx
    anno.y = initialY + dy
  }
}

const stopDrag = () => {
  isDragging = false
  dragTargetId = null
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const toggleBold = (anno: Annotation) => {
  anno.fontWeight = anno.fontWeight === 'bold' ? 'normal' : 'bold'
}

const toggleBg = (anno: Annotation) => {
  anno.isWhiteBg = !anno.isWhiteBg
}

const deleteAnno = (id: string) => {
  pdfStore.annotations = pdfStore.annotations.filter(a => a.id !== id)
  if (selectedId.value === id) selectedId.value = null
}
</script>

<style scoped>
.editor-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  overflow: hidden;
}

.editor-layer.picking-mode {
  cursor: crosshair !important;
}

.annotation-box {
  position: absolute;
  min-width: 100px;
  min-height: 30px;
  padding: 4px;
  cursor: move;
  border: 1px dashed transparent;
}

.annotation-box.selected {
  border-color: var(--primary-color);
}

.annotation-box.white-bg {
  background-color: white;
}

.controls-popup {
  position: absolute;
  top: -95px;
  left: 0;
  white-space: nowrap;
  background: white;
  border-radius: 6px;
  box-shadow: var(--shadow-lg);
  z-index: 20;
  padding: 6px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.weathering-row {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--glass-border);
}

.label {
  font-size: 12px;
  color: #666;
}

.divider {
  width: 1px;
  height: 20px;
  background-color: var(--glass-border);
  margin: 0 2px;
}

.anno-input {
  width: 100%;
  height: 100%;
  min-height: 30px;
  background: transparent;
  border: none;
  resize: both;
  outline: none;
  overflow: hidden;
  line-height: 1.5;
}

/* Make color pickers circular dots */
:deep(.circular-color-picker .el-color-picker__trigger) {
  border-radius: 50%;
  padding: 2px;
  width: 24px;
  height: 24px;
}
:deep(.circular-color-picker .el-color-picker__color) {
  border-radius: 50%;
  border: none;
}
:deep(.circular-color-picker .el-color-picker__color-inner) {
  border-radius: 50%;
}
:deep(.circular-color-picker .el-icon.el-color-picker__icon) {
  display: none; /* Hide the down arrow */
}
</style>
