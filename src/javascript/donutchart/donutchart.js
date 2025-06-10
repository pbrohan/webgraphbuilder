import * as d3 from 'd3';
import { add_grid, get_grid } from "../common/grid";
import { set_palette } from "../common/palette";
import data_check from '../common/data_check';
import colours from "../colours";
import graph_tools from "../common/graph_tools";
import msgBox from "../common/msgbox";
import { createTable, transposeToColumn } from "../common/errorbox";
const check_duplicate_rows = data_check.check_duplicate_rows;
const DuplicateRow = data_check.DuplicateRow;

const download_svg = graph_tools.download_svg;

// Get current settings from the page
function get_donut_chart_page_state() {
  const data = get_grid().getData();
  const org_list = document.getElementById("org_list");
  const label_percs = document.getElementById("use-percentages").checked;
  const chart_type = document.querySelector('input[name="donut-style"]:checked').value;
  return [data, org_list.value, label_percs, chart_type];
}

// Format data from grid for chart use
function validatateData(data) {
  try{
    check_duplicate_rows(data, "label");
  } catch (error) {
    if (error instanceof DuplicateRow) {
      const lst = document.createElement("ul");
      for (let r in error.rows){
        const el = document.createElement("li");
        el.textContent = error.rows[r];
        lst.appendChild(el);
      }
      const errorbox = document.createElement("div");
      const text = document.createElement("p");
      text.textContent = "You have entered duplicate labels";
      errorbox.appendChild(text);
      errorbox.appendChild(lst);
      msgBox("Duplicate Label", errorbox)
      return -1;
    }
  }

  const dtype = data_check.guess_data_type(data);
  if (dtype == "string") {
    const errorbox = document.createElement("div");
    const text = document.createElement("p");
    text.textContent = "All data values must be integers or floats";
    errorbox.appendChild(text);
    msgBox("Incorrect Data Type", text);
    return -1
  }

  const chartData = data
  .map(line => ({
    label: line.label.trim(),
    value: parseFloat(line.data)
  }))
  .filter(item => !isNaN(item.value));

  const negativeValues = chartData.filter(item => item.value < 0);

  if (negativeValues.length > 0) {
    const negativeValues_transpose = transposeToColumn(negativeValues)
    const tbl = createTable(negativeValues_transpose)
    const errorbox = document.createElement("div");
    const text = document.createElement("p");
    text.textContent = `Negative values are not allowed in donut charts. Please use positive values only. Found: `
    errorbox.appendChild(text);
    errorbox.appendChild(tbl);
    msgBox("Negative Values", errorbox);
    return -1;
  }

  return chartData
}


/**
 * Draw a donut chart or pie chart using D3
 * @param {HTMLElement} container - Element to append the chart to
 * @param {number} width - Width of the chart
 * @param {number} height - Height of the chart
 * @param {Array} data - Data array from the grid
 * @param {string} departmentKey - Key for colour palette (e.g., "MHCLG")
 * @param {boolean} label_percentages - Use percentages in labels
 * @param {string} style - Chart style: "donut" for donut chart, "pie" for pie chart
 */
function draw_donut_chart(container, width, height, data, departmentKey, label_percentages, style = "donut") {
  // Clear container and validate data
  container.innerHTML = "";
  const chartData = validateChartData(data);
  if (chartData === -1) return -1;

  // Get colors and create SVG
  const colors = getChartColors(departmentKey);
  if (!colors) return -1;

  const config = createChartConfig(width, height, style);
  const svg = createSVG(width, height);
  const tooltip = createTooltip(container);
  
  // Setup chart elements
  const { pie, arc, labelArc, colorScale } = setupChartElements(chartData, colors, config);
  const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);
  
  // Append SVG to container first so we can measure text
  container.append(svg.node());
  
  // Draw segments and add interactivity
  const segments = drawSegments(g, pie(chartData), arc, colorScale, style);
  addSegmentInteractivity(segments, tooltip, chartData);
  
  // Add labels
  addLabels(g, pie(chartData), arc, labelArc, config, chartData, label_percentages);

  
  // Check if labels overflow and resize canvas if needed
  resizeCanvasIfNeeded(svg, container, width, height);
}

// Helper functions
function validateChartData(data) {
  const chartData = validatateData(data);
  if (chartData == -1) return -1;
  
  if (chartData.length === 0) {
    const errorbox = document.createElement("div");
    const text = document.createElement("p");
    text.textContent = "No valid data found. Please enter labels in the first column and numeric values in the second column.";
    errorbox.appendChild(text);
    msgBox("No valid data", errorbox);
    return -1;
  }
  return chartData;
}

function getChartColors(departmentKey) {
  const departmentColours = colours[departmentKey];
  if (!departmentColours) {
    msgBox.error(`No palette found for department: ${departmentKey}`);
    return null;
  }
  return departmentColours;
}

function createChartConfig(width, height, style) {
  const margin = 40;
  const chartWidth = width - margin * 2;
  const chartHeight = height - margin * 2;
  const radius = Math.min(chartWidth, chartHeight) / 2;
  const innerRadius = style === "donut" ? radius * 0.6 : 0;
  
  return { margin, radius, innerRadius };
}

function createSVG(width, height) {
  return d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);
}

function createTooltip(container) {
  const tooltip = document.createElement("div");
  tooltip.classList.add("chart-tooltip");
  container.appendChild(tooltip);
  return tooltip;
}

function setupChartElements(chartData, colors, config) {
  const colourValues = Object.values(colors["dark"]);
  const colorScale = d3.scaleOrdinal(
    chartData.map(d => d.label),
    colourValues.map(d => `rgb(${d.join(",")})`)
  );
  
  const pie = d3.pie().sort(null).value(d => d.value);
  const arc = d3.arc().innerRadius(config.innerRadius).outerRadius(config.radius);
  const labelArc = d3.arc().innerRadius(config.radius * 1.1).outerRadius(config.radius * 1.1);
  
  return { pie, arc, labelArc, colorScale };
}

function drawSegments(g, pieData, arc, colorScale, style) {
  return g.selectAll("path")
    .data(pieData)
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", d => colorScale(d.data.label))
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .attr("class", style === "donut" ? "donut-segment" : "pie-segment");
}

function addSegmentInteractivity(segments, tooltip, chartData) {
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  
  segments
    .on("mouseover", (event) => {
      tooltip.style.opacity = 1;
      d3.select(event.target).transition().duration(200).attr("transform", "scale(1.05)");
    })
    .on("mousemove", (event) => {
      const { value, label } = event.target.__data__.data;
      const percent = (value / total * 100).toFixed(1);
      tooltip.innerHTML = `${label}: ${value} (${percent}%)`;
      tooltip.style.left = (event.pageX + 15) + "px";
      tooltip.style.top = event.pageY + "px";
    })
    .on("mouseleave", (event) => {
      tooltip.style.opacity = 0;
      d3.select(event.target).transition().duration(200).attr("transform", "scale(1)");
    });
}

function addLabels(g, pieData, arc, labelArc, config, chartData, label_percentages) {
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const needConnectingLines = chartData.some(d => (d.value / total) < 0.1);
  const key = d => d.data.label;
  
  // Add labels - first render them to measure, then position
  const labels = g.selectAll(".label")
    .data(pieData, key)
    .enter()
    .append("text")
    .attr("class", "segment-label")
    .style("font-weight", "400")
    .style("font-family", "arial")
    .style("fill", "#0b0c0c")
    .text(d => {
      if (label_percentages) {
        const percent = (d.data.value / total * 100).toFixed(1);
        return `${d.data.label} (${percent}%)`;
      }
      return d.data.label;
    })
    .attr("transform", "translate(0,0)"); // Temporary position for measurement

  // Now position labels after they're rendered and measurable
  labels.attr("transform", function(d) {
    const angle = midAngle(d);
    const bbox = this.getBBox();
    const textWidth = bbox.width;
    const textHeight = bbox.height;
    
    // Calculate the unit vector from center to sector midpoint
    const dx = Math.cos(angle - Math.PI / 2);
    const dy = Math.sin(angle - Math.PI / 2);
    
    // Point on the sector edge at the midpoint
    const sectorEdgePoint = [
      dx * config.radius,
      dy * config.radius
    ];
    
    let labelX, labelY;
    
    if (needConnectingLines) {
      // With connecting lines, use left/right alignment as before
      const targetDistance = config.radius + 20;
      const targetPoint = [dx * targetDistance, dy * targetDistance];
      
      if (angle > Math.PI) {
        // Left side - text-anchor: end
        labelX = targetPoint[0];
        labelY = targetPoint[1];
      } else {
        // Right side - text-anchor: start
        labelX = targetPoint[0];
        labelY = targetPoint[1];
      }
    } else {
      // Without connecting lines, position so closest corner is 20px from sector edge
      
      // Determine which corner of the bounding box is closest to the center
      // The bounding box is centered at the text position, so corners are at:
      // top-left: (-textWidth/2, -textHeight/2)
      // top-right: (textWidth/2, -textHeight/2)
      // bottom-left: (-textWidth/2, textHeight/2)
      // bottom-right: (textWidth/2, textHeight/2)
      
      const corners = [
        [-textWidth/2, -textHeight/2], // top-left
        [textWidth/2, -textHeight/2],  // top-right
        [-textWidth/2, textHeight/2],  // bottom-left
        [textWidth/2, textHeight/2]    // bottom-right
      ];
      
      // Find which corner would be closest to center if text were positioned at sector edge
      let closestCornerOffset = corners[0];
      let minDistanceSquared = Infinity;
      
      for (const corner of corners) {
        // If text center were at sector edge, this corner would be at:
        const cornerPos = [
          sectorEdgePoint[0] + corner[0],
          sectorEdgePoint[1] + corner[1]
        ];
        // Distance squared from center (0,0)
        const distSq = cornerPos[0] * cornerPos[0] + cornerPos[1] * cornerPos[1];
        if (distSq < minDistanceSquared) {
          minDistanceSquared = distSq;
          closestCornerOffset = corner;
        }
      }
      
      // Now we want this closest corner to be 20px further out from the sector edge
      // The closest corner should be at: sectorEdgePoint + 20 * (dx, dy)
      const desiredCornerPos = [
        sectorEdgePoint[0] + 20 * dx,
        sectorEdgePoint[1] + 20 * dy
      ];
      
      // To achieve this, the text center should be at:
      // desiredCornerPos - closestCornerOffset
      labelX = desiredCornerPos[0] - closestCornerOffset[0];
      labelY = desiredCornerPos[1] - closestCornerOffset[1];
    }
    
    return `translate(${labelX},${labelY})`;
  })
  .style("text-anchor", d => {
    const angle = midAngle(d);
    if (needConnectingLines) {
      return angle < Math.PI ? "start" : "end";
    }
    return "middle";
  });

  // Add connecting lines if needed
  if (needConnectingLines) {
    g.selectAll(".polyline")
      .data(pieData, key)
      .enter()
      .append("polyline")
      .attr("class", "label-line")
      .style("fill", "none")
      .style("stroke", "#0b0c0c")
      .style("stroke-width", 1)
      .attr("points", function(d) {
        const angle = midAngle(d);
        
        // Get the actual label position from the rendered text
        const labelElement = labels.nodes().find(node => 
          node.__data__.data.label === d.data.label
        );
        const labelTransform = labelElement.getAttribute('transform');
        const labelPos = labelTransform.match(/translate\(([^,]+),([^)]+)\)/)
          .slice(1, 3).map(Number);
        
        return [arc.centroid(d), labelArc.centroid(d), labelPos];
      });
  }
}

function resizeCanvasIfNeeded(svg, container, originalWidth, originalHeight) {
  // Get the bounding box of all content
  const bbox = svg.node().getBBox();
  
  // Calculate required dimensions with some padding
  const padding = 20;
  const requiredWidth = bbox.width + padding * 2;
  const requiredHeight = bbox.height + padding * 2;
  
  // Check if we need to resize
  if (requiredWidth > originalWidth || requiredHeight > originalHeight) {
    const newWidth = Math.max(originalWidth, requiredWidth);
    const newHeight = Math.max(originalHeight, requiredHeight);
    
    // Calculate how much we need to shift the content to center it
    const shiftX = (newWidth - originalWidth) / 2;
    const shiftY = (newHeight - originalHeight) / 2;
    
    // Update SVG dimensions
    svg.attr("width", newWidth)
       .attr("height", newHeight)
       .attr("viewBox", [0, 0, newWidth, newHeight]);
    
    // Shift all content to account for new center
    const chartGroup = svg.select("g");
    const currentTransform = chartGroup.attr("transform");
    const match = currentTransform.match(/translate\(([^,]+),([^)]+)\)/);
    
    if (match) {
      const currentX = parseFloat(match[1]);
      const currentY = parseFloat(match[2]);
      chartGroup.attr("transform", `translate(${currentX + shiftX},${currentY + shiftY})`);
    }
  }
}

function midAngle(d) {
  return d.startAngle + (d.endAngle - d.startAngle) / 2;
}

// Update chart when data changes
export function make_donut_chart_if_data(
  width = 700,
  height = 500
) {
  const state = get_donut_chart_page_state();
  // If user has entered data in the table, draw the chart
  if (state[0].length > 0) {
    draw_donut_chart(document.getElementById("donut-chart"), width, height, ...state);
  } else {
    document.getElementById("donut-chart").innerHTML = "";
  }
}

// Initialize the page
export function initDonutChartPage() {
  add_grid(document.getElementById("grid"), make_donut_chart_if_data,
[
  {
    header: "Label",
    name: "label",
    editor: "text"
  },
  {header: "Data",
    name: "data",
    editor: "text"
  }
]);

  const org_list = document.getElementById("org_list");
  const donut_settings = document.getElementById("donut-settings");
  
  set_palette(org_list, make_donut_chart_if_data);
  
  org_list.addEventListener("change", (event) => {
    set_palette(event.target, make_donut_chart_if_data);
    make_donut_chart_if_data();
  });
  
  donut_settings.addEventListener("change", (event) => {
    make_donut_chart_if_data();
  });
  
  document.getElementById("donut-dl").addEventListener("click", () => {
    download_svg(document.querySelector("#donut-chart > svg"));
  });
}