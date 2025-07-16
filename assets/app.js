// Phoenix LiveView JavaScript for Vietnamese customer tracking
import "phoenix_html"
import { Socket } from "phoenix"
import { LiveSocket } from "phoenix_live_view"
import topbar from "topbar"

let csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")
let liveSocket = new LiveSocket("/live", Socket, {
  params: { _csrf_token: csrfToken },
  hooks: {
    // Vietnamese input handling
    VietnameseInput: {
      mounted() {
        // Handle Vietnamese input methods
        this.el.addEventListener("compositionstart", () => {
          this.el.classList.add("composing")
        })
        
        this.el.addEventListener("compositionend", () => {
          this.el.classList.remove("composing")
        })
      }
    },
    
    // Auto-sync functionality
    AutoSync: {
      mounted() {
        // Auto-sync every 15 seconds
        this.interval = setInterval(() => {
          this.pushEvent("sync_tracking_data")
        }, 15000)
      },
      
      destroyed() {
        if (this.interval) {
          clearInterval(this.interval)
        }
      }
    },
    
    // Toggle switches
    ToggleSwitch: {
      mounted() {
        this.el.addEventListener("click", (e) => {
          e.preventDefault()
          const key = this.el.dataset.key
          const currentValue = this.el.dataset.value === "true"
          this.pushEvent("toggle_setting", { key, value: !currentValue })
        })
      }
    },
    
    // Loading states
    LoadingButton: {
      mounted() {
        this.el.addEventListener("phx:click", () => {
          this.el.classList.add("loading")
          this.el.disabled = true
        })
      },
      
      updated() {
        this.el.classList.remove("loading")
        this.el.disabled = false
      }
    }
  }
})

// Show progress bar on live navigation and form submits
topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" })
window.addEventListener("phx:page-loading-start", _info => topbar.show(300))
window.addEventListener("phx:page-loading-stop", _info => topbar.hide())

// Vietnamese locale formatting
window.formatVietnameseNumber = (number) => {
  return new Intl.NumberFormat('vi-VN').format(number)
}

window.formatVietnameseDate = (date) => {
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(date))
}

// Connect if there are any LiveViews on the page
liveSocket.connect()

// Expose liveSocket on window for debugging
window.liveSocket = liveSocket