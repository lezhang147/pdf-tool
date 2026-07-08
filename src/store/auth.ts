import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const licenseKey = ref(localStorage.getItem('licenseKey') || '')
  
  // A simple static validation logic for the MVP
  // In a real app, this might involve a crypto hash or server check
  // Here, we just check if it equals '888888' or starts with 'VIP'
  const isVIP = ref(false)

  const validateKey = (key: string) => {
    return key === '888888' || key.toUpperCase().startsWith('VIP')
  }

  const setLicenseKey = (key: string) => {
    licenseKey.value = key
    localStorage.setItem('licenseKey', key)
    checkStatus()
  }

  const checkStatus = () => {
    if (licenseKey.value && validateKey(licenseKey.value)) {
      isVIP.value = true
    } else {
      isVIP.value = false
    }
  }

  // Initialize on load
  checkStatus()

  return { licenseKey, isVIP, validateKey, setLicenseKey, checkStatus }
})
