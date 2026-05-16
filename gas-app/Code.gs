function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('個人消費紀錄 (GAS)')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Function to include other HTML files if needed (e.g., separating css/js)
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create or get Users sheet
  let usersSheet = ss.getSheetByName('users');
  if (!usersSheet) {
    usersSheet = ss.insertSheet('users');
    usersSheet.appendRow(['id', 'name', 'created_at']);
    usersSheet.appendRow(['1', 'DefaultUser', new Date().toISOString()]);
  }

  // Create or get item_categories sheet
  let itemCategoriesSheet = ss.getSheetByName('item_categories');
  if (!itemCategoriesSheet) {
    itemCategoriesSheet = ss.insertSheet('item_categories');
    itemCategoriesSheet.appendRow(['id', 'name', 'user_id']);
    itemCategoriesSheet.appendRow(['1', 'Food', '1']);
    itemCategoriesSheet.appendRow(['2', 'Transport', '1']);
  }

  // Create or get payment_categories sheet
  let paymentCategoriesSheet = ss.getSheetByName('payment_categories');
  if (!paymentCategoriesSheet) {
    paymentCategoriesSheet = ss.insertSheet('payment_categories');
    paymentCategoriesSheet.appendRow(['id', 'name', 'user_id']);
    paymentCategoriesSheet.appendRow(['1', 'Cash', '1']);
    paymentCategoriesSheet.appendRow(['2', 'Credit Card', '1']);
  }

  // Create or get transactions sheet
  let transactionsSheet = ss.getSheetByName('transactions');
  if (!transactionsSheet) {
    transactionsSheet = ss.insertSheet('transactions');
    transactionsSheet.appendRow(['transaction_id', 'transaction_date', 'item_name', 'item_category_id', 'amount', 'payment_category_id', 'notes', 'user_id']);
  }
}

// Helper to generate a new ID
function generateNewId(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 1;
  const ids = data.slice(1).map(row => Number(row[0])).filter(id => !isNaN(id));
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

// --- TRANSACTIONS ---
function getTransactions(userId = 1, year, month) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const txSheet = ss.getSheetByName('transactions');
  const icSheet = ss.getSheetByName('item_categories');
  const pcSheet = ss.getSheetByName('payment_categories');

  if (!txSheet || !icSheet || !pcSheet) return [];

  const txData = txSheet.getDataRange().getValues();
  const icData = icSheet.getDataRange().getValues();
  const pcData = pcSheet.getDataRange().getValues();

  // Create lookup dictionaries for categories
  const itemCategories = {};
  for (let i = 1; i < icData.length; i++) {
    itemCategories[icData[i][0]] = icData[i][1];
  }

  const paymentCategories = {};
  for (let i = 1; i < pcData.length; i++) {
    paymentCategories[pcData[i][0]] = pcData[i][1];
  }

  const headers = txData[0];
  const results = [];

  for (let i = 1; i < txData.length; i++) {
    const row = txData[i];
    const txObj = {};
    for (let j = 0; j < headers.length; j++) {
      txObj[headers[j]] = row[j];
    }

    // Filter by user_id
    if (String(txObj.user_id) !== String(userId)) continue;

    // Ensure date is a string in YYYY-MM-DD format
    if (txObj.transaction_date instanceof Date) {
        // Fallback to script timezone if needed, though getDisplayValues would be easier.
        // We can just format it safely
        const d = txObj.transaction_date;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        txObj.transaction_date = `${yyyy}-${mm}-${dd}`;
    }

    // Filter by year and month if provided
    if (year && month && txObj.transaction_date) {
        const dateStr = String(txObj.transaction_date);
        const dateParts = dateStr.split('-');
        if (dateParts.length >= 2) {
             if (dateParts[0] !== String(year) || dateParts[1] !== String(month).padStart(2, '0')) {
                 continue;
             }
        }
    }

    results.push({
      transaction_id: Number(txObj.transaction_id),
      transaction_date: String(txObj.transaction_date),
      item_name: txObj.item_name,
      item_category_id: Number(txObj.item_category_id),
      item_category: itemCategories[txObj.item_category_id] || null,
      amount: Number(txObj.amount),
      payment_category_id: Number(txObj.payment_category_id),
      payment_category: paymentCategories[txObj.payment_category_id] || null,
      notes: txObj.notes || "",
      user_id: Number(txObj.user_id)
    });
  }

  // Sort by date descending
  results.sort((a, b) => {
      if (a.transaction_date > b.transaction_date) return -1;
      if (a.transaction_date < b.transaction_date) return 1;
      return b.transaction_id - a.transaction_id;
  });

  return results;
}

function addTransaction(txData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('transactions');
  if (!sheet) throw new Error("Transactions sheet not found");

  const newId = generateNewId(sheet);
  const rowData = [
    newId,
    txData.transaction_date,
    txData.item_name,
    txData.item_category_id,
    txData.amount,
    txData.payment_category_id,
    txData.notes || '',
    txData.user_id || 1
  ];

  sheet.appendRow(rowData);
  return { success: true, transaction_id: newId };
}

function updateTransaction(id, txData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('transactions');
  if (!sheet) throw new Error("Transactions sheet not found");

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][0]) === Number(id)) {
      // update row
      // headers: ['transaction_id', 'transaction_date', 'item_name', 'item_category_id', 'amount', 'payment_category_id', 'notes', 'user_id']
      const rowNum = i + 1;
      sheet.getRange(rowNum, 2).setValue(txData.transaction_date);
      sheet.getRange(rowNum, 3).setValue(txData.item_name);
      sheet.getRange(rowNum, 4).setValue(txData.item_category_id);
      sheet.getRange(rowNum, 5).setValue(txData.amount);
      sheet.getRange(rowNum, 6).setValue(txData.payment_category_id);
      sheet.getRange(rowNum, 7).setValue(txData.notes || '');
      return { success: true };
    }
  }
  return { success: false, error: "Transaction not found" };
}

function deleteTransaction(id, userId = 1) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('transactions');
  if (!sheet) throw new Error("Transactions sheet not found");

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][0]) === Number(id) && Number(data[i][7]) === Number(userId)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: "Transaction not found or unauthorized" };
}

// --- CATEGORIES ---
function getItemCategories(userId = 1) {
  return getCategoriesFromSheet('item_categories', userId);
}

function getPaymentCategories(userId = 1) {
  return getCategoriesFromSheet('payment_categories', userId);
}

function getCategoriesFromSheet(sheetName, userId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const results = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(userId)) {
      results.push({
        id: Number(data[i][0]),
        name: data[i][1]
      });
    }
  }
  return results;
}

function addItemCategory(name, userId = 1) {
  return addCategoryToSheet('item_categories', name, userId);
}

function addPaymentCategory(name, userId = 1) {
  return addCategoryToSheet('payment_categories', name, userId);
}

function addCategoryToSheet(sheetName, name, userId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error(`${sheetName} sheet not found`);

  const newId = generateNewId(sheet);
  sheet.appendRow([newId, name, userId]);
  return { success: true, id: newId, name: name };
}

function deleteItemCategory(id, userId = 1) {
   // Check if in use
   const isUsed = isCategoryInUse(id, 'item_category_id');
   if (isUsed) return { success: false, error: "Category is in use and cannot be deleted" };

   return deleteCategoryFromSheet('item_categories', id, userId);
}

function deletePaymentCategory(id, userId = 1) {
   // Check if in use
   const isUsed = isCategoryInUse(id, 'payment_category_id');
   if (isUsed) return { success: false, error: "Category is in use and cannot be deleted" };

   return deleteCategoryFromSheet('payment_categories', id, userId);
}

function isCategoryInUse(categoryId, columnName) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('transactions');
    if (!sheet) return false;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colIndex = headers.indexOf(columnName);

    if (colIndex === -1) return false;

    for (let i = 1; i < data.length; i++) {
        if (Number(data[i][colIndex]) === Number(categoryId)) {
            return true;
        }
    }
    return false;
}

function deleteCategoryFromSheet(sheetName, id, userId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error(`${sheetName} sheet not found`);

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][0]) === Number(id) && Number(data[i][2]) === Number(userId)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: "Category not found or unauthorized" };
}
