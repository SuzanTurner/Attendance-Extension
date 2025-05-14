// Remove unsafe DOMPurify usage
// ... existing code ...
if (typeof browser === 'undefined') {
  window.browser = chrome;
}
// ... existing code ...

// Ensure the script runs after the page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - Initializing extension');
  initializeExtension();
});

// Also run when the page is already loaded
if (document.readyState === 'complete') {
  console.log('Page already loaded - Initializing extension');
  initializeExtension();
}

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
  
  const threshold = 60;
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
    if ((attended / total) * 100 < threshold) {
      let extraClasses = 0;
      let tempAttended = attended;
      let tempTotal = total;
      
      while ((tempAttended / tempTotal) * 100 < threshold) {
        tempAttended += 1;
        tempTotal += 1;
        extraClasses += 1;
      }
      message = "⚠️ Attend at least " + extraClasses + " more classes to cross " + threshold + "%";
    } else {
      let bunkable = 0;
      let tempTotal = total;
      
      while ((attended / tempTotal) * 100 >= threshold) {
        tempTotal += 1;
        bunkable += 1;
      }
      bunkable -= 1; // The last increment takes it below threshold
      message = percentage === 100
        ? "😎 You can bunk " + bunkable + " classes and still stay above " + threshold + "%"
        : bunkable === 0 
          ? "😅 You're right on edge, do not skip classes 😅"
          : "✅ You can bunk " + bunkable + " classes and still stay above " + threshold + "%";
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

function calculateOverallAttendance(data) {
  const total = data.reduce((sum, course) => sum + course.total, 0);
  const attended = data.reduce((sum, course) => sum + course.attended, 0);
  const percentage = (attended / total) * 100;
  const overallThreshold = 75; // Fixed threshold for overall attendance
  
  let message = "";
  if (percentage < overallThreshold) {
    let requiredClasses = 0;
    let currentAttended = attended;
    let currentTotal = total;
    
    while ((currentAttended / currentTotal) * 100 < overallThreshold) {
      currentAttended++;
      currentTotal++;
      requiredClasses++;
    }
    
    message = "⚠️ Attend at least " + requiredClasses + " more classes to reach " + overallThreshold + "%";
  } else {
    // Calculate skippable classes: (attended)/(total + x) = 0.75
    // Solving for x: x = (attended/0.75) - total
    const skippableClasses = Math.floor((attended / 0.75) - total);
    message = percentage === 100
      ? "😎 You can skip " + skippableClasses + " classes and still be above " + overallThreshold + "%"
      : skippableClasses === 0
        ? "😅 You're right on edge, do not skip classes"
        : "✅ You can skip " + skippableClasses + " classes and still be above " + overallThreshold + "%";
  }
  
  return {
    percentage: percentage.toFixed(2),
    message: message
  };
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
    const heading = document.createElement("h3");
    heading.textContent = "📊 Attendance Insights";
    popup.appendChild(heading);

    const message = document.createElement("p");
    message.textContent = "No attendance data found. Please make sure:";
    popup.appendChild(message);

    const list = document.createElement("ul");
    const items = [
      "You're on the correct page",
      "The attendance table is visible",
      "You're logged in to the portal"
    ];
    
    items.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    popup.appendChild(list);
  } else {
    const overall = calculateOverallAttendance(data);
    
    const heading = document.createElement("h3");
    heading.textContent = "📊 Attendance Insights";
    popup.appendChild(heading);

    const summary = document.createElement("div");
    summary.className = "attendance-summary";
    
    const overallText = document.createElement("p");
    overallText.textContent = "Overall Attendance: " + overall.percentage + "%";
    summary.appendChild(overallText);

    const message = document.createElement("p");
    message.className = "overall-message";
    message.textContent = overall.message;
    summary.appendChild(message);
    
    popup.appendChild(summary);

    const list = document.createElement("ul");
    data.forEach(d => {
      const li = document.createElement("li");
      
      const subject = document.createElement("strong");
      subject.textContent = d.subject;
      li.appendChild(subject);

      const details = document.createElement("div");
      details.className = "attendance-details";

      const percentage = document.createElement("span");
      percentage.className = "percentage" + (parseFloat(d.percentage) < 60 ? " low-attendance" : "");
      percentage.textContent = d.percentage + "%";
      details.appendChild(percentage);

      const count = document.createElement("span");
      count.className = "count";
      count.textContent = "(" + d.attended + "/" + d.total + ")";
      details.appendChild(count);

      const message = document.createElement("span");
      message.className = "message";
      message.textContent = d.message;
      details.appendChild(message);

      li.appendChild(details);
      list.appendChild(li);
    });
    popup.appendChild(list);

    const funMessage = document.createElement("div");
    funMessage.className = "fun-message";
    funMessage.textContent = "Okie now bui me Cold Coffe! ☕";
    popup.appendChild(funMessage);
  }

  document.body.appendChild(popup);
}

// Wait for the page to be fully loaded
function initializeExtension() {
  console.log('Initializing extension...');
  
  // Clear any existing timeouts
  if (window.attendanceTimeout) {
    clearTimeout(window.attendanceTimeout);
  }
  
  // Try to run the calculation after a short delay to ensure the page is loaded
  window.attendanceTimeout = setTimeout(() => {
    console.log('Running initial calculation...');
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
          console.log('Table change detected, recalculating...');
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