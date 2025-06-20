import { add_grid, get_grid} from "../common/grid";
import { set_palette} from "../common/palette";
import {
  mapSettings,
  dimensions,
  getMapDataAttributes,
  legendSettings,
} from "../maps/config";
import * as d3 from 'd3';
import colours from "../colours";
import { add_spinner } from "../common/spinner";
import graph_tools from "../common/graph_tools";
import { map_choose_scale_function,
         match_geojson_to_datalookup,
         validate_rows,
         validate_data_level
     } from "../maps/common_maps";
const VerticalLegend = graph_tools.VerticalLegend;
const download_svg = graph_tools.download_svg;

export function get_map_page_state() {
  const data = get_grid().getData();
  const la_level = document.getElementById("geo-level").value;
  const data_year = document.getElementById("map-year").value;
  const inset = {
    london: document.getElementById("london-inset").checked,
    shetland: document.getElementById("shetland-inset").checked,
  };
  // find out which palette is selected and use the text from that as the key
  const org_list = document.getElementById("org_list");
  const colour_selected = document.querySelector(
    ".palette-cell__selected > .palette-text"
  );
  // Check that the colour name is valid, else pick the primary colour
  let colour;
  let colour_pair = [0, 0, 0];
  if (colour_selected) {
    if (
      Object.keys(colours[org_list.value].light).includes(
        colour_selected.textContent
      )
    ) {
      colour = colours[org_list.value].light[colour_selected.textContent];
      colour_pair = colours[org_list.value].pairs_light[colour_selected.textContent]
    } else {
      colour = colours[org_list.value].primary;
    }
  } else {
    colour = colours[org_list.value].primary;
  }

  return [data, la_level, data_year, inset, colour, colour_pair];
}

function createProjection(centre, scale, clipWidth, clipHeight) {
  return d3.geoPath(
    d3
      .geoMercator()
      .center(centre)
      .scale(scale)
      .clipExtent([
        [0, 0],
        [clipWidth, clipHeight],
      ])
  );
}

function createSvgElement(width, height) {
  return d3.create("svg").attr("width", width).attr("height", height);
}

// Helper: create lookup table from grid data
export function createDataLookup(data) {
  return Object.fromEntries(
    data
      .filter((line) =>
        Object.values(line).some((value) =>
          typeof value === "string" ? value.trim() !== "" : false
        )
      ) // Ignore blank lines
      .map((line) => [
        line.ecode.trim(),
        Object.fromEntries(
          Object.entries(line).map(([key, value]) =>
            typeof value === "string" ? [key, value.trim()] : [key, value]
          )
        ),
      ])
  );
}

function downloadAndProcessMapData(
  data_attr,
  path,
  dataLookup,
  scale,
  svg,
  inset,
  container
) {
  // Make loader to wait for map download
  const file = data_attr.file;
  const nameid = data_attr.nameid;
  const ecodeid = data_attr.ecodeid;
  add_spinner(container);
  d3.json(file).then((map) => {
    const dataFeatures = match_geojson_to_datalookup(map, dataLookup, ecodeid)
    if (dataFeatures == -1) {
        container.innerHTML = "";
        return -1
    }
    // Make tooltip
    const tooltip = document.createElement("div");
    tooltip.classList.add("map-tooltip");
    container.appendChild(tooltip);

    drawFeatures(dataFeatures, path, scale, svg, nameid, tooltip);

    if (inset.london) {
      // If there's a list of specific london locations, use those, otherwise assume 
      // London areas start E090
      const londonFeatures = ('london' in data_attr)
      ? dataFeatures.filter((feature) => {
          const ecode = feature.properties[ecodeid];
          return ecode && data_attr.london.includes(ecode);
        })
      : dataFeatures.filter((feature) => {
          const ecode = feature.properties[ecodeid];
          return ecode && ecode.startsWith("E090");
        });
      addInset(
        londonFeatures,
        scale,
        mapSettings.london.centre,
        mapSettings.london.scale,
        mapSettings.london.padding,
        svg,
        nameid,
        tooltip
      );
    }

    if (inset.shetland) {
      const shetlandFeatures = ('shetland' in data_attr) ? 
      dataFeatures.filter((feature) => {
        const ecode = feature.properties[ecodeid];
        return ecode && ecode.startsWith(data_attr.shetland);
      })
      : dataFeatures.filter((feature) => {
        const ecode = feature.properties[ecodeid];
        return ecode && ecode.startsWith("S12000027");
      });
      addInset(
        shetlandFeatures,
        scale,
        mapSettings.shetland.centre,
        mapSettings.shetland.scale,
        mapSettings.shetland.padding,
        svg,
        nameid,
        tooltip
      );
    }
    // Remove loading spinner
    document.getElementById("spinner").remove();
  });
}

// remove extra bounding boxes that the transformation seems to add
function removeExtraBox(pathString, width, height) {
  const pattern = new RegExp(
    `M0,0L${width},0L${width},${height}L0,${height}Z`,
    "i"
  );
  return pathString.replace(pattern, "");
}

function drawFeatures(features, path, scale, svg, nameid, tooltip) {
  svg
    .append("g")
    .selectAll("path")
    .data(features)
    .enter()
    .append("path")
    .attr("d", (d) => {
      let p = path(d);
      if (p)
        p = removeExtraBox(
          p,
          dimensions.w + dimensions.marginLeft,
          dimensions.h + dimensions.marginLeft
        );
      return p;
    })
    .style("stroke-width", dimensions.lineWidth)
    .style("stroke", "#000")
    .style("fill", (d) => {
      if ("data" in d) {
        return scale(d.data.data);
      } else {
        return "white";
      }
    })
    .on("mouseover", (event) => la_mouseover(event, tooltip))
    .on("mouseleave", (event) => la_mouseleave(event, tooltip))
    .on("mousemove", (event) => la_mousemove(event, tooltip, nameid));
}

// Tooltip functions
function la_mouseover(event, tooltip) {
  tooltip.style.opacity = 1;
  event.target.style.strokeWidth = dimensions.lineWidth * 3;
}

function la_mousemove(event, tooltip, nameid) {
  let event_value = "-";
  if ("data" in event.target.__data__) {
    event_value = event.target.__data__.data.data;
  }
  tooltip.innerHTML =
    event.target.__data__.properties[nameid] + ": " + event_value;
  tooltip.style.left = event.pageX + 15 + "px";
  tooltip.style.top = event.pageY + "px";
}

function la_mouseleave(event, tooltip) {
  tooltip.style.opacity = 0;
  event.target.style.strokeWidth = dimensions.lineWidth;
}

function addInset(
  features,
  linearscale,
  mapcentre,
  mapscale,
  padding,
  svg,
  nameid,
  tooltip
) {
  const path = d3.geoPath(d3.geoMercator().center(mapcentre).scale(mapscale));

  // get bounds of inset
  var bounds = [
    [Infinity, Infinity],
    [0, 0],
  ];
  for (let feature of features) {
    const featurebounds = path.bounds(feature);
    // Surely there's some better way to write this
    if (bounds[0][0] > featurebounds[0][0]) {
      bounds[0][0] = featurebounds[0][0];
    }
    if (bounds[0][1] > featurebounds[0][1]) {
      bounds[0][1] = featurebounds[0][1];
    }
    if (bounds[1][0] < featurebounds[1][0]) {
      bounds[1][0] = featurebounds[1][0];
    }
    if (bounds[1][1] < featurebounds[1][1]) {
      bounds[1][1] = featurebounds[1][1];
    }
  }
  // Add padding
  let center = [
    (bounds[0][0] + bounds[1][0]) * 0.5,
    (bounds[0][1] + bounds[1][1]) * 0.5,
  ];

  // Again, surely a better way
  bounds[0][0] = bounds[0][0] + (bounds[0][0] - center[0]) * padding;
  bounds[0][1] = bounds[0][1] + (bounds[0][1] - center[1]) * padding;
  bounds[1][0] = bounds[1][0] + (bounds[1][0] - center[0]) * padding;
  bounds[1][1] = bounds[1][1] + (bounds[1][1] - center[1]) * padding;

  drawFeatures(features, path, linearscale, svg, nameid, tooltip);

  // draw a square around inset
  svg
    .append("rect")
    .attr("x", bounds[0][0])
    .attr("y", bounds[0][1])
    .attr("width", bounds[1][0] - bounds[0][0])
    .attr("height", bounds[1][1] - bounds[0][1])
    .style("stroke", "#000")
    .style("fill", "none");
}

/**
 * Draws a map using data from the accompanying table
 * @param {HTMLElement} container
 * @param {object} data
 * @param {string} la_level
 * @param {number} data_year
 * @param {boolean} inset
 * @returns {null}
 */
export function draw_map(
  container,
  width,
  height,
  data,
  la_level,
  data_year,
  inset,
  colour,
  colour_pair
) {
  const path = createProjection(
    mapSettings.default.centre,
    mapSettings.default.scale,
    width,
    height
  );
  const svg = createSvgElement(width, height);
  const dataLookup = createDataLookup(data);
  container.innerHTML = "";
  // Validate data
  if (validate_rows(data) == -1) {
    return -1
  }
  const data_level = validate_data_level(dataLookup, la_level);
  if (data_level == -1) {
    return -1
  }
  const data_attr = getMapDataAttributes(data_level, data_year);

  let scale = map_choose_scale_function(colour, colour_pair, data);
  if (scale == -1) {
    container.innerHTML = "";
    return -1
  }

  downloadAndProcessMapData(
    data_attr,
    path,
    dataLookup,
    scale,
    svg,
    inset,
    container
  );

  // Append legend
  svg
    .append("g")
    .attr(
      "transform",
      `translate(${legendSettings.offset[0]}, ${legendSettings.offset[1]})`
    )
    .append(() => VerticalLegend(scale, legendSettings.dimensions))
    .call((g) =>
      g
        .selectAll(".tick text")
        .style("font-size", "1rem")
        .attr("color", "#0b0c0c")
        .attr("font-family", "arial")
    );

  // Append the SVG element.
  container.append(svg.node());
}

export function make_map_if_data(
  width = dimensions.w + dimensions.marginLeft,
  height = dimensions.h + dimensions.marginLeft
) {
  const state = get_map_page_state();
  // If user has entered data in the table, draw the map
  if (state[0].length > 0) {
    draw_map(document.getElementById("map"), width, height, ...state);
  } else {
    document.getElementById("map").innerHTML = "";
  }
}

export function initMapPage() {
  add_grid(document.getElementById("grid"), make_map_if_data, [
    {
      header: "Ecode",
      name: "ecode",
      editor: "text",
    },
    {
      header: "Data",
      name: "data",
      editor: "text",
    },
  ]);

  const map_settings = document.getElementById("map-settings");
  const org_list = document.getElementById("org_list");
  const ordinal_status = document.getElementById("ordinal-settings");

  set_palette(org_list, make_map_if_data);

  org_list.addEventListener("change", (event) => {
    set_palette(event.target, make_map_if_data);
    make_map_if_data();
  });

  map_settings.addEventListener("change", (event) => {
    make_map_if_data();
  });

  ordinal_status.addEventListener("change", (event) => {
    make_map_if_data();
  });

  document.getElementById("map-dl").addEventListener("click", () => {
    download_svg(document.querySelector("#map > svg"));
  });
}
