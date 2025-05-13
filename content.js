function calculateInsights() {
  console.log('Starting attendance calculation...');
  
  // Look for the attendance table - it should have columns for Code, Course Name, Attendance Count, and Percentage
  const tables = document.querySelectorAll('table');
  let table = null;
  
  // Find the table that has the attendance data
  tables.forEach((t, index) => {
    const headers = t.querySelectorAll('th');
    const headerTexts = Array.from(headers).map(h => h.innerText.trim());
    console.log(`Table ${index} headers:`, headerTexts);
    
    if (headerTexts.includes('Code') && 
        headerTexts.includes('Course Name') && 
        headerTexts.includes('Attendance Count') && 
        headerTexts.includes('Percentage')) {
      table = t;
      console.log('Found attendance table!');
    }
  });

  if (!table) {
    console.log('Attendance table not found');
    displayPopup([]);
    return;
  }

  // Log the entire table HTML for debugging
  console.log('Table HTML:', table.outerHTML);

  const rows = table.querySelectorAll('tbody tr');
  console.log(`Found ${rows.length} rows to process`);
  
  const threshold = 65;
  const results = [];

  rows.forEach((row, index) => {
    // Skip the last row which contains totals
    if (index === rows.length - 1) {
      console.log('Skipping total row');
      return;
    }

    // Log the entire row HTML for debugging
    console.log(`Row ${index} HTML:`, row.outerHTML);

    const cols = row.querySelectorAll("td");
    console.log(`Row ${index} has ${cols.length} columns`);
    
    if (cols.length < 4) {
      console.log(`Skipping row ${index}: insufficient columns`);
      return;
    }

    // Log each column's content
    cols.forEach((col, colIndex) => {
      console.log(`Column ${colIndex} content:`, col.innerText.trim());
    });

    const subject = cols[1].innerText.trim();
    const attendanceLink = cols[2].querySelector('a');
    
    if (!attendanceLink) {
      console.log(`Skipping row ${index}: no attendance link found`);
      return;
    }

    const attendanceText = attendanceLink.innerText.trim();
    console.log(`Attendance text for ${subject}:`, attendanceText);

    const [attended, total] = attendanceText.split('/').map(num => parseInt(num.trim()));
    const percentage = parseFloat(cols[3].innerText.trim());

    console.log('Row data:', { subject, attended, total, percentage });

    if (isNaN(attended) || isNaN(total) || total === 0) {
      console.log(`Skipping row ${index}: invalid numbers`);
      return;
    }

    let message = "";
    if (percentage < threshold) {
      const needed = Math.ceil(((threshold / 100) * total - attended) / ((1 - threshold / 100)));
      message = "⚠️ Attend at least " + needed + " more classes";
    } else {
      const maxBunks = Math.floor((attended - (threshold / 100) * total) / (1 - threshold / 100));
      message = "✅ Can safely miss " + maxBunks + " classes";
    }

    results.push({ 
      subject, 
      percentage: percentage.toFixed(2), 
      message,
      attended,
      total
    });
  });

  console.log('Final results:', results);
  displayPopup(results);
}

function displayPopup(data) {
  // Remove existing popup if any
  const existingPopup = document.getElementById('attendance-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement("div");
  popup.id = "attendance-popup";

  if (data.length === 0) {
    popup.innerHTML = 
      "<h3>📊 Attendance Insights</h3>" +
      "<p>No attendance data found. Please make sure:</p>" +
      "<ul>" +
      "<li>You're on the correct page</li>" +
      "<li>The attendance table is visible</li>" +
      "<li>You're logged in to the portal</li>" +
      "</ul>";
  } else {
    let html = 
      "<h3>📊 Attendance Insights</h3>" +
      "<div class='attendance-summary'>" +
      "<p>Overall Attendance: " + calculateOverallAttendance(data) + "%</p>" +
      "</div>" +
      "<ul>";
    
    data.forEach(d => {
      html += 
        "<li>" +
        "<strong>" + d.subject + "</strong>" +
        "<div class='attendance-details'>" +
        "<span class='percentage'>" + d.percentage + "%</span>" +
        "<span class='count'>(" + d.attended + "/" + d.total + ")</span>" +
        "<span class='message'>" + d.message + "</span>" +
        "</div>" +
        "</li>";
    });
    html += "</ul>";
    popup.innerHTML = html;
  }

  document.body.appendChild(popup);
}

function calculateOverallAttendance(data) {
  const total = data.reduce((sum, course) => sum + course.total, 0);
  const attended = data.reduce((sum, course) => sum + course.attended, 0);
  return ((attended / total) * 100).toFixed(2);
}

// Wait for the page to be fully loaded
function initializeExtension() {
  // Clear any existing timeouts
  if (window.attendanceTimeout) {
    clearTimeout(window.attendanceTimeout);
  }
  
  // Try to run the calculation after a short delay to ensure the page is loaded
  window.attendanceTimeout = setTimeout(() => {
    calculateInsights();
  }, 1000);
  
  // Set up a mutation observer to watch for table changes
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if the added nodes contain our target table
        const hasTable = Array.from(mutation.addedNodes).some(node => 
          node.nodeType === 1 && node.matches('table')
        );
        if (hasTable) {
          calculateInsights();
          break;
        }
      }
    }
  });

  // Start observing the document body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Run when the page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}