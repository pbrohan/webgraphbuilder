import colours from "../colours";

// Initialize org_list select dropdown with saved value from localStorage
export function initOrgListSelect() {
  const org_list = document.getElementById("org_list");
  if (!org_list) return;
  
  // Load previously selected department from localStorage
  const savedDepartment = localStorage.getItem('selectedDepartment');
  if (savedDepartment && org_list.querySelector(`option[value="${savedDepartment}"]`)) {
    org_list.value = savedDepartment;
    
    // Apply the header color for the selected department
    updateHeaderColor(org_list);
  }
  
  // Add change event listener to save selection
  org_list.addEventListener("change", (event) => {
    localStorage.setItem('selectedDepartment', event.target.value);
  });
}

// Update header color based on the selected department
function updateHeaderColor(el) {
  const graph_colours = colours[el.value];
  if (graph_colours && graph_colours.primary) {
    const header = document.querySelector(".graph-header");
    if (header) {
      header.style.setProperty(
        "border-bottom",
        "10px solid rgb(" + graph_colours.primary + ")"
      );
    }
  }
}

export function set_palette(el, build_graph) {
  var graph_colours = colours[el.value];
  
  // Update header color
  updateHeaderColor(el);
  
  // Update palette display when department changes
  const palette_container = document.getElementById("palette");
  if (palette_container) {
    // Clear existing palette cells
    palette_container.innerHTML = "";
    
    // Create new palette cells based on the selected department
    for (const [colour, values] of Object.entries(graph_colours.light)) {
      const cell = document.createElement("div");
      cell.classList.add("palette-cell");
      
      const preview = document.createElement("div");
      preview.classList.add("palette-preview");
      preview.style.backgroundColor = `rgb(${values[0]}, ${values[1]}, ${values[2]})`;
      
      const text = document.createElement("span");
      text.classList.add("palette-text");
      text.textContent = colour;
      
      cell.appendChild(preview);
      cell.appendChild(text);
      palette_container.appendChild(cell);
      
      // Add click event listener to each new cell
      cell.addEventListener("click", (event) => {
        select_palette_colour(event.currentTarget);
        build_graph();
      });
    }
    
    // Select the first palette color by default
    const first_cell = palette_container.querySelector(".palette-cell");
    if (first_cell) {
      first_cell.classList.add("palette-cell__selected");
    }
  } else {
    // For backwards compatibility, handle existing palette cells if container not found
    const palette = [...document.querySelectorAll(".palette-cell")];
    let set_selected = true;
    palette.forEach((cell) => {
      if (set_selected) {
        cell.classList.add("palette-cell__selected");
        set_selected = false;
      }
      cell.addEventListener("click", (event) => {
        select_palette_colour(event.currentTarget);
        build_graph();
      });
    });
  }
}

function select_palette_colour(el) {
  // Remove element from currently selected palettes
  const selected = [...document.querySelectorAll(".palette-cell__selected")];
  selected.forEach((cell) => {
    cell.classList.remove("palette-cell__selected");
  });
  el.classList.add("palette-cell__selected");
}

export function get_palette(el) {
  const graph_colours = colours[el.value];
  return graph_colours;
}
