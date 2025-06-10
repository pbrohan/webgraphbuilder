/**
 * Function to create a table element in memory
 * @param {Object} data - The object containing the table data
 * @returns {HTMLTableElement} - The generated table element
 */
export function createTable(data) {
  const table = document.createElement("table");

  // Create the table header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  Object.keys(data).forEach((key) => {
    const th = document.createElement("th");
    th.textContent = key;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Find the longest array length
  const maxRows = Math.max(...Object.values(data).map((arr) => arr.length));

  // Create the table body
  const tbody = document.createElement("tbody");
  for (let i = 0; i < maxRows; i++) {
    const row = document.createElement("tr");
    Object.keys(data).forEach((key) => {
      const cell = document.createElement("td");
      cell.textContent = data[key][i] !== undefined ? data[key][i] : ""; // Fill with empty string if no value
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  }
  table.appendChild(tbody);

  return table; // Return the table element
}

/**
 * Transposes an array of objects into a column-oriented format
 * @param {Array<Object>} arrayOfObjects - Array of objects, where each object represents a row
 * @returns {Object} - Object with keys as column headers and values as arrays of data
 */
export function transposeToColumn(arrayOfObjects) {
  if (!Array.isArray(arrayOfObjects) || arrayOfObjects.length === 0) {
    return {};
  }
  
  // Initialize result object
  const result = {};
  
  // Get all unique keys from all objects
  const allKeys = new Set();
  arrayOfObjects.forEach(obj => {
    Object.keys(obj).forEach(key => allKeys.add(key));
  });
  
  // Initialize arrays for each key
  allKeys.forEach(key => {
    result[key] = [];
  });
  
  // Populate the arrays
  arrayOfObjects.forEach(obj => {
    allKeys.forEach(key => {
      // If the key exists in this object, add its value, otherwise add undefined or null
      result[key].push(obj[key] !== undefined ? obj[key] : null);
    });
  });
  
  return result;
}