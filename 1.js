// Global state
let bills = JSON.parse(localStorage.getItem('bills') || '[]');
let settings = JSON.parse(localStorage.getItem('settings') || '{"defaultPrice": 7.7, "emptyBagPrice": 10, "companyPhone": "+91 9876543210", "companyAddress": "Sinnar, Maharashtra", "companyEmail": "info@bhaktitus.com", "watermarkText": "BHAKTI TUS"}');
let currentUser = localStorage.getItem('currentUser');

// DOM elements
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        showApp();
    }
    initEventListeners();
    loadSettings();
});

// Event listeners
function initEventListeners() {
    // Login
    document.getElementById('login-btn').addEventListener('click', login);
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Tabs
    tabs.forEach(tab => tab.addEventListener('click', switchTab));
    
    // Calculation method toggle
    document.getElementById('bag-calc-btn').addEventListener('click', () => toggleCalcMethod('bag'));
    document.getElementById('vehicle-calc-btn').addEventListener('click', () => toggleCalcMethod('vehicle'));
    
    // Checkboxes
    document.getElementById('include-empty-bags').addEventListener('change', toggleEmptyBags);
    document.getElementById('vehicle-include-empty-bags').addEventListener('change', toggleVehicleEmptyBags);
    
    // Buttons
    document.getElementById('calculate-btn').addEventListener('click', calculateBill);
    document.getElementById('popup-save-bill-btn').addEventListener('click', saveBill);
    document.getElementById('reset-bill-btn').addEventListener('click', resetForm);
    document.getElementById('popup-generate-pdf-btn').addEventListener('click', generatePDF);
    document.getElementById('close-bill-popup').addEventListener('click', closeBillPopup);
    document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    document.getElementById('import-data-file').addEventListener('change', importData);
    
    // Search
    document.getElementById('search-bills').addEventListener('input', searchBills);
    
    // Close popup on overlay click
    document.getElementById('bill-popup-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeBillPopup();
    });
}

// Authentication
function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (username === 'admin' && password === 'password') {
        currentUser = username;
        localStorage.setItem('currentUser', currentUser);
        showApp();
        showToast('Login successful!', 'success');
    } else {
        showToast('Invalid credentials!', 'error');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    loginSection.classList.remove('hidden');
    appSection.classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function showApp() {
    loginSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    loadBillHistory();
    loadValidateBills();
}

// Tab management
function switchTab(e) {
    const targetTab = e.target.dataset.tab;
    if (!targetTab) return;
    
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    e.target.classList.add('active');
    document.getElementById(targetTab).classList.add('active');
    
    if (targetTab === 'bill-history') loadBillHistory();
    if (targetTab === 'validate-bill') loadValidateBills();
}

// Calculation method toggle
function toggleCalcMethod(method) {
    const bagBtn = document.getElementById('bag-calc-btn');
    const vehicleBtn = document.getElementById('vehicle-calc-btn');
    const bagSection = document.getElementById('bag-calculation-section');
    const vehicleSection = document.getElementById('vehicle-calculation-section');
    
    if (method === 'bag') {
        bagBtn.classList.add('active');
        vehicleBtn.classList.remove('active');
        bagSection.classList.remove('hidden');
        vehicleSection.classList.add('hidden');
    } else {
        vehicleBtn.classList.add('active');
        bagBtn.classList.remove('active');
        vehicleSection.classList.remove('hidden');
        bagSection.classList.add('hidden');
    }
}

// Empty bags toggle
function toggleEmptyBags() {
    const checkbox = document.getElementById('include-empty-bags');
    const emptyBagsRow = document.getElementById('empty-bags-row');
    const emptyBagInput = document.getElementById('empty-bag-quantity');
    
    if (checkbox.checked) {
        emptyBagsRow.classList.remove('hidden');
        emptyBagInput.disabled = false;
    } else {
        emptyBagsRow.classList.add('hidden');
        emptyBagInput.disabled = true;
        emptyBagInput.value = '0';
    }
}

function toggleVehicleEmptyBags() {
    const checkbox = document.getElementById('vehicle-include-empty-bags');
    const emptyBagsRow = document.getElementById('vehicle-empty-bags-row');
    const emptyBagInput = document.getElementById('vehicle-empty-bag-quantity');
    
    if (checkbox.checked) {
        emptyBagsRow.classList.remove('hidden');
        emptyBagInput.disabled = false;
    } else {
        emptyBagsRow.classList.add('hidden');
        emptyBagInput.disabled = true;
        emptyBagInput.value = '0';
    }
}

// Bill calculation
function calculateBill() {
    const customerName = document.getElementById('customer-name').value.trim();
    const customerAddress = document.getElementById('customer-address').value.trim();
    const customerPhone = document.getElementById('customer-phone').value.trim();
    
    if (!customerName || !customerAddress || !customerPhone) {
        showToast('Please fill all customer details!', 'error');
        return;
    }
    
    const isBagCalc = document.getElementById('bag-calc-btn').classList.contains('active');
    let billData;
    
    if (isBagCalc) {
        billData = calculateBagBill();
    } else {
        billData = calculateVehicleBill();
    }
    
    if (!billData) return;
    
    // Generate bill preview
    displayBillPreview({
        ...billData,
        customerName,
        customerAddress,
        customerPhone,
        billNumber: generateBillNumber(),
        date: new Date().toLocaleDateString('en-IN'),
        time: new Date().toLocaleTimeString('en-IN')
    });
    // Show the Save Bill button when creating new bills
    const saveBillBtn = document.getElementById("popup-save-bill-btn");
    if (saveBillBtn) {
        saveBillBtn.style.display = "flex";
    }
    
    document.getElementById('bill-popup-overlay').classList.add('active');
}

function calculateBagBill() {
    const quantity = parseFloat(document.getElementById('bag-quantity').value) || 0;
    const avgWeight = parseFloat(document.getElementById('avg-weight').value) || 0;
    const pricePerKg = parseFloat(document.getElementById('price-per-kg').value) || settings.defaultPrice;
    const includeEmptyBags = document.getElementById('include-empty-bags').checked;
    const emptyBagQuantity = includeEmptyBags ? (parseFloat(document.getElementById('empty-bag-quantity').value) || 0) : 0;
    
    if (quantity <= 0 || avgWeight <= 0) {
        showToast('Please enter valid quantity and weight!', 'error');
        return null;
    }
    
    const totalWeight = quantity * avgWeight;
    const amount = totalWeight * pricePerKg;
    const emptyBagAmount = emptyBagQuantity * settings.emptyBagPrice;
    const total = amount + emptyBagAmount;
    
    return {
        type: 'bag',
        quantity,
        avgWeight,
        totalWeight,
        pricePerKg,
        amount,
        emptyBagQuantity,
        emptyBagAmount,
        total
    };
}

function calculateVehicleBill() {
    const loadedWeight = parseFloat(document.getElementById('vehicle-loaded-weight').value) || 0;
    const emptyWeight = parseFloat(document.getElementById('vehicle-empty-weight').value) || 0;
    const pricePerKg = parseFloat(document.getElementById('vehicle-price-per-kg').value) || settings.defaultPrice;
    const includeEmptyBags = document.getElementById('vehicle-include-empty-bags').checked;
    const emptyBagQuantity = includeEmptyBags ? (parseFloat(document.getElementById('vehicle-empty-bag-quantity').value) || 0) : 0;
    
    if (loadedWeight <= 0 || emptyWeight <= 0 || loadedWeight <= emptyWeight) {
        showToast('Please enter valid vehicle weights!', 'error');
        return null;
    }
    
    const totalWeight = loadedWeight - emptyWeight;
    const amount = totalWeight * pricePerKg;
    const emptyBagAmount = emptyBagQuantity * settings.emptyBagPrice;
    const total = amount + emptyBagAmount;
    
    return {
        type: 'vehicle',
        loadedWeight,
        emptyWeight,
        totalWeight,
        pricePerKg,
        amount,
        emptyBagQuantity,
        emptyBagAmount,
        total
    };
}

// Bill preview
function displayBillPreview(billData) {
    document.getElementById('bill-customer-name').textContent = billData.customerName;
    document.getElementById('bill-customer-address').textContent = billData.customerAddress;
    document.getElementById('bill-customer-phone').textContent = billData.customerPhone;
    document.getElementById('bill-number').textContent = billData.billNumber;
    document.getElementById('bill-date').textContent = billData.date;
    document.getElementById('bill-time').textContent = billData.time;
    
    if (billData.type === 'bag') {
        document.getElementById('bill-desc-header').textContent = 'Tus (Bags)';
        document.getElementById('quantity-header').textContent = 'QUANTITY';
        document.getElementById('bill-quantity').textContent = billData.quantity;
        document.getElementById('bill-avg-weight').textContent = billData.avgWeight + ' kg';
        document.getElementById('avg-weight-header').textContent = 'AVG. WEIGHT';
    } else {
        document.getElementById('bill-desc-header').textContent = 'Tus (Weight)';
        document.getElementById('quantity-header').textContent = 'Loaded Weight';
        document.getElementById('bill-quantity').textContent = billData.loadedWeight + ' kg';
        document.getElementById('bill-avg-weight').textContent = billData.emptyWeight + ' kg';
        document.getElementById('avg-weight-header').textContent = 'Empty WEIGHT';
    }
    
    document.getElementById('bill-total-weight').textContent = billData.totalWeight + ' kg';
    document.getElementById('bill-rate').textContent = billData.pricePerKg;
    document.getElementById('bill-amount').textContent = billData.amount.toFixed(2);
    
    // Empty bags row
    const emptyBagRow = document.getElementById('bill-empty-bag-row');
    if (billData.emptyBagQuantity > 0) {
        emptyBagRow.classList.remove('hidden');
        document.getElementById('bill-empty-bag-quantity').textContent = billData.emptyBagQuantity;
        document.getElementById('bill-empty-bag-rate').textContent = settings.emptyBagPrice;
        document.getElementById('bill-empty-bag-amount').textContent = billData.emptyBagAmount.toFixed(2);
    } else {
        emptyBagRow.classList.add('hidden');
    }
    
    document.getElementById('bill-subtotal').textContent = billData.total.toFixed(2);
    document.getElementById('bill-total-amount').textContent = billData.total.toFixed(2);
    document.getElementById('amount-in-words').textContent = numberToWords(billData.total);
    
    // Update watermark
    document.querySelector('.watermark').textContent = settings.watermarkText;
    
    // Store current bill data
    window.currentBillData = billData;
}



// Reset form
function resetForm() {
    document.getElementById('customer-name').value = '';
    document.getElementById('customer-address').value = '';
    document.getElementById('customer-phone').value = '';
    document.getElementById('bag-quantity').value = '';
    document.getElementById('avg-weight').value = '';
    document.getElementById('price-per-kg').value = settings.defaultPrice;
    document.getElementById('vehicle-loaded-weight').value = '';
    document.getElementById('vehicle-empty-weight').value = '';
    document.getElementById('vehicle-price-per-kg').value = settings.defaultPrice;
    document.getElementById('include-empty-bags').checked = false;
    document.getElementById('vehicle-include-empty-bags').checked = false;
    document.getElementById('empty-bag-quantity').value = '0';
    document.getElementById('vehicle-empty-bag-quantity').value = '0';
    toggleEmptyBags();
    toggleVehicleEmptyBags();
}

// Popup management
function closeBillPopup() {
    document.getElementById('bill-popup-overlay').classList.remove('active');
    const saveBillBtn = document.getElementById("popup-save-bill-btn");
    if (saveBillBtn) {
        saveBillBtn.style.display = "flex";
    }
}

// Generate bill number
function generateBillNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2); // YY
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // MM
    const currentYearMonth  = `${year}${month}`; // YYMM

    if (bills.length > 0) {
        const lastBill = bills[0]; // Latest bill is first
        
        if (lastBill.billNumber && lastBill.billNumber.startsWith('BT')) {
            const lastBillYearMonth = lastBill.billNumber.substring(2, 6); // Extract YYMM
            
            if (lastBillYearMonth === currentYearMonth) {
                // Same month - increment counter
                const lastCounter = parseInt(lastBill.billNumber.substring(6), 10);
                const newCounter = (lastCounter + 1).toString().padStart(6, '0');
                return `BT${currentYearMonth}${newCounter}`;
            } else {
                // Different month - start from 1
                return `BT${currentYearMonth}000001`;
            }
        } else {
            // Invalid last bill number format
            return `BT${currentYearMonth}000001`;            
        }
    } else {
        // No bills saved yet
        return `BT${currentYearMonth}000001`;
    }
}

// Number to words conversion
function numberToWords(num) {
    if (num === 0) return 'Zero Rupees Only';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    function convertHundreds(n) {
        let result = '';
        if (n >= 100) {
            result += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 20) {
            result += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        } else if (n >= 10) {
            result += teens[n - 10] + ' ';
            return result;
        }
        if (n > 0) {
            result += ones[n] + ' ';
        }
        return result;
    }
    
    const crores = Math.floor(num / 10000000);
    const lakhs = Math.floor((num % 10000000) / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const hundreds = num % 1000;
    
    let result = '';
    if (crores > 0) result += convertHundreds(crores) + 'Crore ';
    if (lakhs > 0) result += convertHundreds(lakhs) + 'Lakh ';
    if (thousands > 0) result += convertHundreds(thousands) + 'Thousand ';
    if (hundreds > 0) result += convertHundreds(hundreds);
    
    return result.trim() + ' Rupees Only';
}

// Toast notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}