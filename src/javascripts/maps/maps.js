import { add_grid, get_grid, get_table_range } from "../common/grid.js";
import { set_palette, get_palette } from "../common/palette.js";
import { mapSettings, dimensions, getMapDataAttributes, legendSettings} from "./config.js";
import { get_data_level } from "../common/utils.js";
import { d3, colours, msgBox } from "/bundle.js";
import { data_check } from "/bundle.js";
import { createTable } from "../common/errorbox.js";
import { add_spinner } from "../common/spinner.js";
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
        data.filter(line => Object.values(line).some(value => 
            typeof value === 'string' ? value.trim() !== "" : 
            false)) // Ignore blank lines
        .map(line => [
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

function downloadAndProcessMapData(file, path, dataLookup, ecodeid, nameid, scale, svg, inset, container) {
    // Make loader to wait for map download
    add_spinner(container);
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
            const lst = document.createElement("ul");
            for (let r in unmatchedEcodes){
                const el = document.createElement("li");
                el.textContent = unmatchedEcodes[r];
                lst.appendChild(el);
            }
            const errorbox = document.createElement('div');
            const text = document.createElement('p');
                text.textContent = "You have entered unrecognised Ecode(s)";
            errorbox.appendChild(text);
            errorbox.appendChild(lst);
            msgBox("Unrecognised Ecode(s)", errorbox);
            container.innerHTML = "";
        }
        // Make tooltip
        const tooltip = document.createElement("div");
        tooltip.classList.add("map-tooltip");
        container.appendChild(tooltip);

        drawFeatures(dataFeatures,
                path,
                scale,
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
            const shetlandFeatures = dataFeatures.filter(feature => {
                const ecode = feature.properties[ecodeid];
                return ecode && ecode.startsWith("S12000027");
            })
            addInset(shetlandFeatures,
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
function removeExtraBox(pathString, width, height){
    const pattern = new RegExp(
        `M0,0L${width},0L${width},${height}L0,${height}Z`,
        "i"
    );
    return pathString.replace(pattern, "")
}

function drawFeatures(features, path, scale, svg, nameid, tooltip){
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
    let scale;
    let uniques;
    // In the future this should be moved to get_map_page_state
        const ordered = false;
        const org_list = document.getElementById("org_list");
        const palette = get_palette(org_list);
        // For now everyone needs to use the light colours
        const palette_size = Object.keys(palette.light).length;
        const palette_elements = [...document.querySelectorAll(".palette-cell")];
        // This is very inefficient
        palette_elements.forEach(cell => {
                cell.classList.remove("palette-cell__disabled");
            })
    switch(data_check.guess_data_type(data)){
        case 'float':
            scale = d3.scaleSequential(get_table_range(data), 
            d3.interpolate("rgb(0,0,0)", `rgb(${colour.join(',')})`));
            break;
        case 'integer':
            scale = d3.scaleSequential(get_table_range(data),
            d3.interpolate("rgb(0,0,0)", `rgb(${colour.join(',')})`));
            break;
        case 'string':
            uniques = data_check.get_data_uniques(data);
            if (uniques.size <= palette_size){
            // This is definitely discrete. Should:
            // 1 - Check if there are < 10 levels
            // 2 - If so ask if they're ordered
            // 3 - Make a scale based on the palette
                // palette scale
                // Get ordinal setting
                const ordinalSetting = document
                    .querySelector('input[name="ordinal-state"]:checked').value;
            if (ordinalSetting == "unordered") {
                scale = d3.scaleOrdinal([...uniques],
                Object.values(palette.light).map(
                    colour => `rgb(${colour.join(',')})`
                ));
                // soft disable the palette 
                palette_elements.forEach(cell => {
                    cell.classList.add("palette-cell__disabled");
                })

            } else {
                // ordered scale
                scale = d3.scaleOrdinal([...uniques],
                    Array.from({length: uniques.size}, (_, i) => 
                        d3.interpolate("rgb(0,0,0)", `rgb(${colour.join(',')})`)((i + 1)/(uniques.size + 1))));
            }
            } else {
                // Message the user and tell them that they have too many levels
                const lst = document.createElement("ul");
                const unique_array = [...uniques];
                for (let r in unique_array){
                    const el = document.createElement("li");
                    el.textContent = unique_array[r];
                    lst.appendChild(el);
                }
                console.log(uniques);
                const errorbox = document.createElement('div');
                const text = document.createElement('p')
                    text.textContent = `Cannot graph ordinal data with more than ${palette_size} levels. You have ${uniques.size}.`
                errorbox.appendChild(text);
                errorbox.appendChild(lst);
                msgBox("Too many ordinal levels", errorbox);
                container.innerHTML = "";
                return 0;
            }
    }

    downloadAndProcessMapData(file, path, dataLookup, ecodeid, nameid, scale, svg, inset, container);

    // Append legend
    svg.append("g")
       .attr("transform", `translate(${legendSettings.offset[0]}, ${legendSettings.offset[1]})`)
       .append(() => VerticalLegend(scale, legendSettings.dimensions))
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
    } else {
        document.getElementById('map').innerHTML = "";
    };
}

export function initMapPage() {
    add_grid(document.getElementById('grid'), make_map_if_data);

    const map_settings = document.getElementById("map-settings");
    const org_list = document.getElementById("org_list");
    const ordinal_status = document.getElementById("ordinal-settings");

    set_palette(org_list, make_map_if_data);

    org_list.addEventListener("change", (event) => {
        set_palette(event.target, make_map_if_data);
        make_map_if_data();
    })

    map_settings.addEventListener("change", (event) => {
        make_map_if_data();
    });

    ordinal_status.addEventListener("change", (event) => {
        make_map_if_data();
    });

    document.getElementById("map-dl").addEventListener("click", () => {
        download_svg(document.querySelector('#map > svg'))})
};