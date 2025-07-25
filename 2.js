// Bill history management
function loadBillHistory() {
    const historyContainer = document.getElementById("bill-list-hist");
    historyContainer.innerHTML = "";

    if (bills.length === 0) {
        historyContainer.innerHTML = '<p class="no-bills-message">No bills found</p>';
        return;
    }

    // Get only the last 20 bills (most recent transactions)
    const recentBills = bills.slice(0, 20);


    recentBills.forEach((bill, index) => {
        const billCard = document.createElement("div");
        billCard.className = `bill-card ${index < 2 ? 'recent' : ''}`;
        
        const showDeleteButton = index < 2;
        const isLatest = index === 0;
        
        billCard.innerHTML = `
            ${isLatest ? '<div class="recent-badge">LATEST</div>' : ''}
            ${index === 1 ? '<div class="recent-badge">RECENT</div>' : ''}
            <div class="bill-info">
                <h4>${bill.customerName}</h4>
                <p>${bill.date} • ${bill.time}</p>
                <div class="bill-number">Bill ${bill.billNumber}</div>
            </div>
            <div class="bill-amount">
                <h3 id="bill-amount-h3">₹${bill.total.toFixed(2)}</h3>
                <div class="bill-actions">
                    <button onclick="viewBill('${bill.id}')" class="bill-btn view">
                        <span>👁️</span> View
                    </button>
                    ${showDeleteButton ? `
                        <button onclick="deleteBill('${bill.id}')" class="bill-btn delete">
                            <span>🗑️</span> Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        historyContainer.appendChild(billCard);
    });
}

// Validate bills management
function loadValidateBills() {
  const billList = document.getElementById("bill-list");
  billList.innerHTML = "";
}

// Search bills
function searchBills() {
  const searchTerm = document
    .getElementById("search-bills")
    .value.toLowerCase();
  const filteredBills = bills.filter(
    (bill) =>
      bill.customerName.toLowerCase().includes(searchTerm) ||
      bill.billNumber.toLowerCase().includes(searchTerm) ||
      bill.customerPhone.includes(searchTerm)
  );

  const billList = document.getElementById("bill-list");
  billList.innerHTML = "";

  if (filteredBills.length === 0) {
    billList.innerHTML =
      '<p style="text-align: center; padding: 40px; color: #666;">No bills found</p>';
    return;
  }

  filteredBills.forEach((bill) => {
    const billCard = document.createElement("div");
    billCard.className = "bill-card";

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2); // YY
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // MM
    const currentYearMonth  = `BT${year}${month}`;
    const billNumber = bill.billNumber; // e.g., "BT2506000012"
    const billYearMonth = billNumber.substring(0, 6);
    const isLatest = billYearMonth === currentYearMonth;

    billCard.innerHTML = `
            ${isLatest ? '<div class="recent-badge">LATEST</div>' : ''}
            <div class="bill-info">
                <h4>${bill.customerName}</h4>
                <p>${bill.date} • ${bill.time}</p>
                <div class="bill-number">Bill ${bill.billNumber}</div>
            </div>
            <div class="bill-amount"">
                <h3>₹${bill.total.toFixed(2)}</h3>
                <div class="bill-info">
                  <div class="bill-actions">
                  <p class=" bill-number">${
                  bill.type === "bag"
                    ? bill.quantity + " bags"
                    : "Vehicle weight"
                }</p>
                <p>${bill.totalWeight} kg</p>
                </div>
                <button class="bill-btn view" style="display: flex; align-items: center; justify-content: center; font-size: 18px; margin-top: 10px; margin-left:30px; width: 150px; height: 50px; " onclick="viewBill('${
                  bill.id
                }')" style="padding: 8px 16px; font-size: 12px; margin-top: 10px;">Validate</button>
                </div>
            </div>
        `;
    billList.appendChild(billCard);
    if(searchTerm==''){
      billList.innerHTML = "";  
    }
  });
}

function saveBill() {
  if (!window.currentBillData) {
    showToast("No bill data to save!", "error");
    return;
  }
  const bill = {
    ...window.currentBillData,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
  };
  bills.unshift(bill);
  localStorage.setItem("bills", JSON.stringify(bills));
  showToast("Bill saved successfully!", "success");
  closeBillPopup();
  resetForm();
  loadBillHistory();
  loadValidateBills();
}



// View bill
function viewBill(billId) {
  const bill = bills.find((b) => b.id === billId);
  if (!bill) {
    showToast("Bill not found!", "error");
    return;
  }

  window.currentBillData = bill;
  displayBillPreview(bill);

  const saveBillBtn = document.getElementById("popup-save-bill-btn");
  if (saveBillBtn) {
    saveBillBtn.style.display = "none";
  }
  document.getElementById("bill-popup-overlay").classList.add("active");
}

// Delete bill
function deleteBill(billId) {   
  if (confirm("Are you sure you want to delete this bill?")) {
    bills = bills.filter((b) => b.id !== billId);
    localStorage.setItem("bills", JSON.stringify(bills));
    loadBillHistory();
    loadValidateBills();
    showToast("Bill deleted successfully!", "success");
  }
}

// PDF generation
function generatePDF() {
  return new Promise((resolve, reject) => {
    try {
      // Check if bill data exists
      if (!window.currentBillData) {
        reject(new Error("No bill data to generate PDF!"));
        return;
      }

      // Show loading indicator
      const pdfButton = document.getElementById("popup-generate-pdf-btn");
      const originalText = pdfButton.innerHTML;
      pdfButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Generating...';

      // Add watermark for PDF
      const watermarkText = settings.watermarkText || "BHAKTI TUS";
      document.querySelector(".watermark").textContent = watermarkText;

      setTimeout(() => {
        try {
          // Get the bill element to capture
          const billElement = document.getElementById("bill-preview");

          if (!billElement) {
            // Reset button text
            pdfButton.innerHTML = originalText;
            // Clear watermark
            document.querySelector(".watermark").textContent = "";
            reject(new Error("Bill preview not found!"));
            return;
          }

          // Generate PDF using html2canvas and jsPDF with high quality
          window
            .html2canvas(billElement, {
              scale: 3, // Higher scale for better quality
              useCORS: true,
              allowTaint: true,
              backgroundColor: "#ffffff",
              width: billElement.scrollWidth,
              height: billElement.scrollHeight,
              scrollX: 0,
              scrollY: 0,
            })
            .then((canvas) => {
              try {
                const imgData = canvas.toDataURL("image/png", 1.0); // Maximum quality

                // Get image dimensions in pixels
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;

                // Convert pixels to mm (assuming 96 DPI)
                const pdfWidth = (imgWidth * 22.4) / 96;
                const pdfHeight = (imgHeight * 22.4) / 96;

                // Create PDF with custom size matching the image
                const pdf = new window.jspdf.jsPDF({
                  orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
                  unit: "mm",
                  format: [pdfWidth, pdfHeight],
                  compress: true,
                });

                // Add the image to fill the entire PDF page
                pdf.addImage(imgData, "PNG", 30, 18, pdfWidth, pdfHeight, "", "FAST");

                // Save PDF with bill number from currentBillData
                const bill = window.currentBillData;
                pdf.save(`Bhakti_Tus_Bill_${bill.billNumber}.pdf`);

                // Reset button text
                pdfButton.innerHTML = originalText;

                // Clear watermark after PDF generation
                document.querySelector(".watermark").textContent = "";

                
                
                // Resolve the promise
                resolve();
              } catch (error) {
                // Reset button text on error
                pdfButton.innerHTML = originalText;
                // Clear watermark on error
                document.querySelector(".watermark").textContent = "";
                reject(error);
              }
            })
            .catch((error) => {
              console.error("Error generating PDF:", error);
              showToast("Error generating PDF!", "error");

              // Reset button text on error
              pdfButton.innerHTML = originalText;

              // Clear watermark on error
              document.querySelector(".watermark").textContent = "";
              
              reject(error);
            });
        } catch (error) {
          // Reset button text on error
          pdfButton.innerHTML = originalText;
          // Clear watermark on error
          document.querySelector(".watermark").textContent = "";
          reject(error);
        }
      }, 300);
    } catch (error) {
      reject(error);
    }
  });
}

// Download bill PDF
async function downloadBillPDF(billId) {
  const bill = bills.find((b) => b.id === billId);
  if (!bill) {
    showToast("Bill not found!", "error");
    return;
  }

  const pdfButton = document.getElementById(`pdf-btn-${billId}`);
  const btnIcon = pdfButton.querySelector('.btn-icon');
  const btnText = pdfButton.querySelector('.btn-text');
  const btnLoader = pdfButton.querySelector('.btn-loader');

  setButtonLoadingState(pdfButton, btnIcon, btnText, btnLoader, true);

  try {
        window.currentBillData = bill;
        
        // Add a small delay to ensure UI updates
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await generatePDF();
        
        showToast("PDF downloaded successfully!", "success");
    } catch (error) {
        console.error("Error generating PDF:", error);
        showToast("Error generating PDF. Please try again.", "error");
    } finally {
        // Hide loading state
        setButtonLoadingState(pdfButton, btnIcon, btnText, btnLoader, false);
    }
}

function setButtonLoadingState(button, icon, text, loader, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
        icon.style.display = 'none';
        text.textContent = 'Generating...';
        loader.style.display = 'inline-block';
    } else {
        button.disabled = false;
        button.classList.remove('loading');
        icon.style.display = 'inline-block';
        text.textContent = 'PDF';
        loader.style.display = 'none';
    }
}

// Settings management
function loadSettings() {
  document.getElementById("default-price").value = settings.defaultPrice;
  document.getElementById("empty-bag-price").value = settings.emptyBagPrice;
  document.getElementById("company-phone").value = settings.companyPhone;
  document.getElementById("company-address").value = settings.companyAddress;
  document.getElementById("company-email").value = settings.companyEmail;
  document.getElementById("watermark-text").value = settings.watermarkText;

  // Update price inputs
  document.getElementById("price-per-kg").value = settings.defaultPrice;
  document.getElementById("vehicle-price-per-kg").value = settings.defaultPrice;
}

function saveSettings() {
  settings = {
    defaultPrice:
      parseFloat(document.getElementById("default-price").value) || 7.7,
    emptyBagPrice:
      parseFloat(document.getElementById("empty-bag-price").value) || 10,
    companyPhone: document.getElementById("company-phone").value.trim(),
    companyAddress: document.getElementById("company-address").value.trim(),
    companyEmail: document.getElementById("company-email").value.trim(),
    watermarkText: document.getElementById("watermark-text").value.trim(),
  };

  localStorage.setItem("settings", JSON.stringify(settings));

  // Update form inputs
  document.getElementById("price-per-kg").value = settings.defaultPrice;
  document.getElementById("vehicle-price-per-kg").value = settings.defaultPrice;

  showToast("Settings saved successfully!", "success");
}

// Data management
function exportData() {
  const data = {
    bills,
    settings,
    exportDate: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bhakti_tus_backup_${
    new Date().toISOString().split("T")[0]
  }.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("Data exported successfully!", "success");
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      if (data.bills && data.settings) {
        if (confirm("This will replace all existing data. Are you sure?")) {
          bills = data.bills;
          settings = data.settings;

          localStorage.setItem("bills", JSON.stringify(bills));
          localStorage.setItem("settings", JSON.stringify(settings));

          loadSettings();
          loadBillHistory();
          loadValidateBills();

          showToast("Data imported successfully!", "success");
        }
      } else {
        showToast("Invalid data format!", "error");
      }
    } catch (error) {
      console.error("Import error:", error);
      showToast("Error importing data. Please check the file format.", "error");
    }
  };

  reader.onerror = function () {
    showToast("Error reading file!", "error");
  };

  reader.readAsText(file);

  // Reset file input
  event.target.value = "";
}

// QR Code generation (placeholder - you can integrate a QR code library)
function generateQRCode(billId) {
  const qrContainer = document.getElementById("bill-qr-code");
  // This is a placeholder. You can integrate QRCode.js or similar library
  qrContainer.innerHTML = `<div style="width: 60px; height: 60px; background: #000; color: white; display: flex; align-items: center; justify-content: center; font-size: 8px; text-align: center;">QR<br>${billId.slice(
    -4
  )}</div>`;
}

// Utility functions
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(timeString) {
  return new Date(timeString).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Print functionality
function printBill() {
  if (!window.currentBillData) {
    showToast("No bill data to print!", "error");
    return;
  }

  const printWindow = window.open("", "_blank");
  const billHTML = document.getElementById("bill-preview").outerHTML;

  printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bill - ${window.currentBillData.billNumber}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                .professional-bill { max-width: 800px; margin: 0 auto; }
                .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; color: rgba(0,0,0,0.1); z-index: -1; }
                .qr-code { position: absolute; top: 20px; right: 20px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                .bill-total-section { text-align: right; margin-top: 20px; }
                .bill-footer { margin-top: 40px; display: flex; justify-content: space-between; }
                .signature-line { border-bottom: 1px solid #000; width: 150px; margin-bottom: 5px; }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            ${billHTML}
        </body>
        </html>
    `);

  printWindow.document.close();
  printWindow.print();
}

// Auto-save functionality
let autoSaveTimeout;
function scheduleAutoSave() {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    localStorage.setItem("bills", JSON.stringify(bills));
    localStorage.setItem("settings", JSON.stringify(settings));
  }, 1000);
}

// Add event listeners for auto-save
document.addEventListener("input", scheduleAutoSave);
document.addEventListener("change", scheduleAutoSave);
