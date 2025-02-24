import { add_grid, get_grid, get_table_range } from "../common/grid.js";
import { set_palette } from "../common/palette.js";
import { mapSettings, dimensions, getMapDataAttributes, legendSettings} from "./config.js";
import { get_data_level } from "../common/utils.js";
import { d3, colours, msgBox } from "/bundle.js";
import { data_check } from "/bundle.js";
import { createTable } from "../common/errorbox.js";
const check_duplicate_rows = data_check.check_duplicate_rows;
const DuplicateRow = data_check.DuplicateRow;
const EcodeParseError = data_check.EcodeParseError;
import { graph_tools } from "/bundle.js";
const VerticalLegend = graph_tools.VerticalLegend;
const download_svg = graph_tools.download_svg

export function get_map_page_state() {
    const data = get_grid().getData();
    const la_level = document.getElementById('geo-level').value;
    const data_year = document.getElementById('map-year').value;
    const inset = {"london": document.getElementById('london-inset').checked,
                   "shetland": document.getElementById('shetland-inset').checked,
     };
    // find out which palette is selected and use the text from that as the key
    const org_list = document.getElementById("org_list");
    const colour_selected = document.querySelector(
        ".palette-cell__selected > .palette-text")
    // Check that the colour name is valid, else pick the primary colour
    let colour;
    if ( colour_selected ) {
        if (Object.keys(colours[org_list.value].light).includes(colour_selected.textContent)) {
            colour = colours[org_list.value].light[colour_selected.textContent];
        } else {
            colour = colours[org_list.value].primary;
        }
    } else {
            colour = colours[org_list.value].primary;
        }

    return [data, la_level, data_year, inset, colour]
    }

function createProjection(centre, scale, clipWidth, clipHeight) {
    return d3.geoPath(
        d3.geoMercator()
          .center(centre)
          .scale(scale)
          .clipExtent([[0, 0], [clipWidth, clipHeight]])
        );
}

function createSvgElement(width, height) {
    return d3.create("svg")
             .attr("width", width)
             .attr("height", height);
}

// Helper: create lookup table from grid data
function createDataLookup(data){
    return Object.fromEntries(
        data.map(line => [
            line.ecode.trim(),
            Object.fromEntries(
                Object.entries(line)
                      .map(([key, value]) => 
                        typeof value === 'string' ? [key, value.trim()] :
                            [key, value])
            )
        ])
    );
}

function downloadAndProcessMapData(file, path, dataLookup, ecodeid, nameid, linearscale, svg, inset, container) {
    d3.json(file).then(map => { 
        // Keep track of rows matched
        const usedKeys = new Set();
        const dataFeatures = map.features
            .flatMap(feature => {
                const matchedData = dataLookup[feature.properties[ecodeid]];
                if (matchedData) {
                    usedKeys.add(feature.properties[ecodeid])
                    return { ...feature, data: {...matchedData}};
                } else {
                    return feature;
                }
            });

        const unmatchedEcodes = Object.keys(dataLookup)
            .filter(key => !usedKeys.has(key))
        if (unmatchedEcodes.length > 0) {
            console.log(unmatchedEcodes)
            const lst = document.createElement("ul");
            for (let r in unmatchedEcodes){
                const el = document.createElement("li");
                el.textContent = unmatchedEcodes[r];
                lst.appendChild(el);
            }
            const errorbox = document.createElement('div');
            const text = document.createElement('p');
                text.textContent = "You have entered unrecogniased Ecode(s)";
            errorbox.appendChild(text);
            errorbox.appendChild(lst);
            msgBox("Unrecognised Ecode(s)", errorbox);
            container.innerHTML = "";
            container.innerHTML = "";
        }

        // Make tooltip
        const tooltip = document.createElement("div");
        tooltip.classList.add("map-tooltip");
        container.appendChild(tooltip);

        drawFeatures(dataFeatures,
                path,
                linearscale,
                svg,
                nameid,
                tooltip
        )

        if (inset.london) {
            const londonFeatures = dataFeatures.filter(feature => {
                const ecode = feature.properties[ecodeid];
                return ecode && ecode.startsWith("E090");
            })
            addInset(londonFeatures,
                linearscale,
                mapSettings.london.centre,
                mapSettings.london.scale,
                mapSettings.london.padding,
                svg,
                nameid,
                tooltip
            );
        }

        if (inset.shetland) {
            const shetlandFeatures = dataFeatures.filter(feature => {
                const ecode = feature.properties[ecodeid];
                return ecode && ecode.startsWith("S12000027");
            })
            addInset(shetlandFeatures,
                linearscale,
                mapSettings.shetland.centre,
                mapSettings.shetland.scale,
                mapSettings.shetland.padding,
                svg,
                nameid,
                tooltip
            );
        }
    });
}

// remove extra bounding boxes that the transformation seems to add
function removeExtraBox(pathString, width, height){
    const pattern = new RegExp(
        `M0,0L${width},0L${width},${height}L0,${height}Z`,
        "i"
    );
    return pathString.replace(pattern, "")
}

function drawFeatures(features, path, linearscale, svg, nameid, tooltip){
    svg.append("g")
       .selectAll("path")
       .data(features)
       .enter()
       .append("path")
       .attr("d", d => {
            let p = path(d)
            if (p) p = removeExtraBox(p,
                                      dimensions.w + dimensions.marginLeft,
                                      dimensions.h + dimensions.marginLeft);
            return p;
       })
       .style("stroke-width", dimensions.lineWidth)
       .style("stroke", "#000")
       .style("fill", d => {
          if ('data' in d) {
            return linearscale(d.data.data);
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
    if ('data' in event.target.__data__) {
        event_value = event.target.__data__.data.data;
    }
    tooltip.innerHTML = event.target.__data__.properties[nameid] + ": " + event_value;
    tooltip.style.left = event.pageX + 15 + "px";
    tooltip.style.top = event.pageY +  "px";
}

function la_mouseleave(event, tooltip) {
    tooltip.style.opacity = 0;
    event.target.style.strokeWidth = dimensions.lineWidth;
}

function addInset(features, linearscale, mapcentre, mapscale, padding, svg, nameid, tooltip){
    const path = d3.geoPath(d3.geoMercator()
            .center(mapcentre)
            .scale(mapscale)
            );
   
    // get bounds of inset
    var bounds = [[Infinity,Infinity],[0,0]];
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
            bounds[1][1] = featurebounds[1][1]
        }
    }
    // Add padding
    let center = [(bounds[0][0] + bounds[1][0]) * 0.5,
                   (bounds[0][1] + bounds[1][1]) * 0.5]

    // Again, surely a better way
    bounds[0][0] = bounds[0][0] + (bounds[0][0] - center[0]) * padding;
    bounds[0][1] = bounds[0][1] + (bounds[0][1] - center[1]) * padding;
    bounds[1][0] = bounds[1][0] + (bounds[1][0] - center[0]) * padding;
    bounds[1][1] = bounds[1][1] + (bounds[1][1] - center[1]) * padding;


    drawFeatures(features, path, linearscale, svg, nameid, tooltip)

    // draw a square around inset
    svg.append("rect")
        .attr("x", bounds[0][0])
        .attr("y", bounds[0][1])
        .attr('width', bounds[1][0] - bounds[0][0])
        .attr('height', bounds[1][1] - bounds[0][1])
        .style("stroke", "#000")
        .style("fill", "none")
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
export function draw_map(container, width, height, data, la_level, data_year, inset, colour){
    const path = createProjection(mapSettings.default.centre,
                                        mapSettings.default.scale,
                                        width,
                                        height)
    const svg = createSvgElement(width, height);
    const dataLookup = createDataLookup(data);
    container.innerHTML = "";
    // Validate data
    try {
        check_duplicate_rows(data, "ecode");
    } catch (error) {
        if (error instanceof DuplicateRow) {
            const lst = document.createElement("ul");
            for (let r in error.rows){
                const el = document.createElement("li");
                el.textContent = error.rows[r];
                lst.appendChild(el);
            }
            const errorbox = document.createElement('div');
            const text = document.createElement('p');
                text.textContent = "You have entered duplicate Ecodes";
            errorbox.appendChild(text);
            errorbox.appendChild(lst);
            msgBox("Duplicate Ecode", errorbox);
            container.innerHTML = "";
            return -1;
        }
    }

    let data_level;
    try {
        data_level = get_data_level(dataLookup, la_level);
    } catch (error) {
        if (error instanceof EcodeParseError) {
            const tbl = createTable(error.ecodes);
            const errorbox = document.createElement('div')
            const text = document.createElement('p')
                text.textContent = "You have entered Ecodes from both counties and districts";
            errorbox.appendChild(text);
            errorbox.appendChild(tbl);
            msgBox("Ecode Error", errorbox);
            container.innerHTML = "";
        }
        return 0;
    }
    const { file, nameid, ecodeid } = getMapDataAttributes(data_level, data_year)

    // create the scale
    const linearscale = d3.scaleSequential(get_table_range(data), 
        d3.interpolate("rgb(0,0,0)", "rgb(" + colour[0] + "," +
            colour[1] + "," + colour[2] + ")"))
    
    downloadAndProcessMapData(file, path, dataLookup, ecodeid, nameid, linearscale, svg, inset, container);

    // Append legend
    svg.append("g")
       .attr("transform", `translate(${legendSettings.offset[0]}, ${legendSettings.offset[1]})`)
       .append(() => VerticalLegend(linearscale, legendSettings.dimensions))
       .call(g => g.selectAll(".tick text")
                   .style('font-size', "1rem")
                   .attr("color", "#0b0c0c")
                   .attr("font-family", "arial"));
    
    // Append the SVG element.
    container.append(svg.node());
};

export function make_map_if_data(width = dimensions.w + dimensions.marginLeft,
                                 height = dimensions.h + dimensions.marginLeft) {
    const state = get_map_page_state();
    // If user has entered data in the table, draw the map
    if (state[0].length > 0) {
        draw_map(
            document.getElementById('map'), width, height, ...state
        );
    };
}

export function initMapPage() {
    add_grid(document.getElementById('grid'), make_map_if_data);

    const map_settings = document.getElementById("map-settings");
    const org_list = document.getElementById("org_list");

    set_palette(org_list, make_map_if_data);

    org_list.addEventListener("change", (event) => {
        set_palette(event.target, make_map_if_data);
        make_map_if_data();
    })

    map_settings.addEventListener("change", (event) => {
        make_map_if_data();
    });

    document.getElementById("map-dl").addEventListener("click", () => {
        download_svg(document.querySelector('#map > svg'))})
};