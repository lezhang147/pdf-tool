<template>
  <header class="navbar glass-panel">
    <div class="brand">
      <el-icon :size="24" color="var(--primary-color)"><Document /></el-icon>
      <span class="title">PDF 在线工坊</span>
    </div>
    
    <div class="actions">
      <div v-if="authStore.isVIP" class="quota-info">
        <el-tag type="success" effect="light" round>
          👑 尊享版 (无限导出)
        </el-tag>
      </div>
      <div v-else class="quota-info">
        <el-tag type="info" effect="light" round>试用版 (仅限预览)</el-tag>
      </div>
      
      <button v-if="!authStore.isVIP" class="btn-primary" @click="showActivation = true">
        激活高级版
      </button>
    </div>

    <!-- Activation Modal -->
    <el-dialog
      v-model="showActivation"
      title="输入激活码"
      width="90%"
      style="max-width: 400px; border-radius: 12px;"
      :show-close="false"
    >
      <div class="activation-content">
        <p class="desc">请输入您在闲鱼购买的专属激活密钥，以解锁无限制的高清导出特权。</p>
        <el-input 
          v-model="licenseInput" 
          placeholder="请输入激活码 (如: 888888)" 
          size="large"
          clearable
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showActivation = false">取消</el-button>
          <el-button type="primary" @click="handleActivate" :loading="activating">
            验证并激活
          </el-button>
        </span>
      </template>
    </el-dialog>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Document } from '@element-plus/icons-vue'
import { useAuthStore } from '../../store/auth'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()
const showActivation = ref(false)
const licenseInput = ref('')
const activating = ref(false)

const handleActivate = async () => {
  if (!licenseInput.value.trim()) {
    ElMessage.warning('请输入有效的激活码')
    return
  }
  
  activating.value = true
  
  // Simulate network delay
  setTimeout(() => {
    if (authStore.validateKey(licenseInput.value)) {
      authStore.setLicenseKey(licenseInput.value)
      ElMessage.success('激活成功！已为您解锁全部特权。')
      showActivation.value = false
    } else {
      ElMessage.error('激活码无效，请联系闲鱼客服获取。')
    }
    activating.value = false
  }, 800)
}
</script>

<style scoped>
.navbar {
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  margin: 12px 12px 0 12px;
  z-index: 100;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text-main);
  letter-spacing: -0.5px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.quota-info {
  display: none;
}

@media (min-width: 640px) {
  .quota-info {
    display: block;
  }
}

.desc {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 16px;
  line-height: 1.5;
}
</style>
