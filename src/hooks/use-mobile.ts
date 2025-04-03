// Hook to detect if the current viewport is mobile-sized
import { useState, useEffect } from 'react'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Function to check if current viewport is mobile-sized
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768) // Common breakpoint for mobile
    }

    // Initial check
    checkIsMobile()

    // Add event listener for window resize
    window.addEventListener('resize', checkIsMobile)

    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return isMobile
} 