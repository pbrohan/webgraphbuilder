import * as d3 from 'd3';
import { add_grid, get_grid } from "../common/grid";
import { set_palette } from "../common/palette";
import colours from "../colours";
import graph_tools from "../common/graph_tools";
import msgBox from "../common/msgbox";

const download_svg = graph_tools.download_svg;
const verticalLegend = graph_tools.verticalLegend;

// Get current settings from the page
function get_donut_chart_page_state() {
  const data = get_grid().getData();
  const org_list = document.getElementById("org_list");
  const colourScheme = document.querySelector('input[name="colour-scheme"]:checked').value;
  
  return [data, org_list.value, colourScheme];
}

// Format data from grid for chart use
function createDataObject(data) {
  return data
    .filter((line) =>
      Object.values(line).some((value) =>
        typeof value === "string" ? value.trim() !== "" : false
      )
    )
    .map(line => ({
      label: line.ecode.trim(),
      value: parseFloat(line.data)
    }))
    .filter(item => !isNaN(item.value));
}

/**
 * Draw a donut chart using D3
 * @param {HTMLElement} container - Element to append the chart to
 * @param {number} width - Width of the chart
 * @param {number} height - Height of the chart
 * @param {Array} data - Data array from the grid
 * @param {string} departmentKey - Key for colour palette (e.g., "MHCLG")
 * @param {string} colourScheme - "light" or "dark"
 */
function draw_donut_chart(container, width, height, data, departmentKey, colourScheme) {
  // Clear container
  container.innerHTML = "";
  
  // Process data
  const chartData = createDataObject(data);
  if (chartData.length === 0) {
    msgBox.error("No valid data found. Please enter labels in the first column and numeric values in the second column.");
    return -1;
  }
  
  // Check for negative values
  const negativeValues = chartData.filter(item => item.value < 0);
  if (negativeValues.length > 0) {
    const valuesList = negativeValues.map(item => `${item.label}: ${item.value}`).join(', ');
    msgBox.error(`Negative values are not allowed in donut charts. Please use positive values only. Found: ${valuesList}`);
    return -1;
  }
  
  // Get department colours
  const departmentColours = colours[departmentKey];
  if (!departmentColours) {
    msgBox.error(`No palette found for department: ${departmentKey}`);
    return -1;
  }
  
  // Create SVG element
  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);
  
  const margin = 40;
  const chartWidth = width - margin * 2;
  const chartHeight = height - margin * 2;
  const radius = Math.min(chartWidth, chartHeight) / 2;
  const innerRadius = radius * 0.6;
  
  // Create color palette
  const colourValues = Object.values(departmentColours[colourScheme]);
  const colorScale = d3.scaleOrdinal()
    .domain(chartData.map(d => d.label))
    .range(colourValues);
  
  // Create pie generator
  const pie = d3.pie()
    .sort(null)
    .value(d => d.value);
  
  // Create arc generators
  const arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(radius);
  
  const labelArc = d3.arc()
    .innerRadius(radius * 0.8)
    .outerRadius(radius * 0.8);
  
  // Center the chart
  const g = svg.append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);
  
  // Calculate total for center text
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  
  // Add donut segments
  const segments = g.selectAll("path")
    .data(pie(chartData))
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", (d, i) => colorScale(d.data.label))
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .attr("class", "donut-segment");
  
  // Split tooltip functions to match maps pattern
  function segmentMouseover(event, d) {
    tooltip.style.opacity = 1;
    d3.select(event.target)
      .transition()
      .duration(200)
      .attr("transform", `scale(1.05)`);
  }
  
  function segmentMousemove(event, d) {
    const percent = (d.data.value / total * 100).toFixed(1);
    tooltip.innerHTML = `${d.data.label}: ${d.data.value} (${percent}%)`;
    tooltip.style.left = (event.pageX + 15) + "px";
    tooltip.style.top = event.pageY + "px";
  }
  
  function segmentMouseleave(event, d) {
    tooltip.style.opacity = 0;
    d3.select(event.target)
      .transition()
      .duration(200)
      .attr("transform", "scale(1)");
  }
  
  // Add event listeners to segments
  segments
    .on("mouseover", segmentMouseover)
    .on("mousemove", segmentMousemove)
    .on("mouseleave", segmentMouseleave);
  
  // Add center text showing total
  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "-0.2em")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .attr("font-family", "arial")
    .attr("fill", "#0b0c0c")
    .text("Total");
    
  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "1em")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .attr("font-family", "arial")
    .attr("fill", "#0b0c0c")
    .text(total.toFixed(1));
  
  // Add legend using the verticalLegend component
  const legendSettings = {
    title: "Values",
    width: 120,
    height: 200,
    marginTop: 10,
    marginRight: 30,
    marginBottom: 10,
    marginLeft: 10
  };
  
  // Create a D3 scale for the legend
  const legendScale = d3.scaleOrdinal()
    .domain(chartData.map(d => `${d.label} (${(d.value / total * 100).toFixed(1)}%)`))
    .range(chartData.map(d => colorScale(d.label)));
  
  // Append the legend
  svg.append("g")
    .attr("transform", `translate(${width - legendSettings.width - 20}, ${margin})`)
    .append(() => verticalLegend(legendScale, legendSettings))
    .call(g => g
      .selectAll(".tick text")
      .style("font-size", "0.8rem")
      .attr("color", "#0b0c0c")
      .attr("font-family", "arial")
    );
  
  // Add tooltip (using same class as maps)
  const tooltip = d3.select(container)
    .append("div")
    .attr("class", "chart-tooltip");
  
  // Append SVG to container
  container.append(svg.node());
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
  add_grid(document.getElementById("grid"), make_donut_chart_if_data);

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