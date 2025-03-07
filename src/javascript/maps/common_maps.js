import { get_palette } from "../common/palette";
import * as d3 from 'd3';
import data_check from "../common/data_check";
import msgBox from "../common/msgbox";
import { createTable } from "../common/errorbox";
import { get_data_level } from "../common/utils";
import { get_table_range } from "../common/grid.js";
const check_duplicate_rows = data_check.check_duplicate_rows;
const DuplicateRow = data_check.DuplicateRow;
const EcodeParseError = data_check.EcodeParseError;

export function map_choose_scale_function(colour, colour_pair, data){
      // create the scale
  let scale;
  let uniques;
  // In the future this should be moved to get_map_page_state
  const org_list = document.getElementById("org_list");
  const palette = get_palette(org_list);
  // For now everyone needs to use the light colours
  const palette_size = Object.keys(palette.light).length;
  const palette_elements = [...document.querySelectorAll(".palette-cell")];
  // This is very inefficient
  palette_elements.forEach((cell) => {
    cell.classList.remove("palette-cell__disabled");
  });
  switch (data_check.guess_data_type(data)) {
    case "float":
      scale = d3.scaleSequential(
        get_table_range(data),
        d3.interpolate(`rgb(${colour_pair.join(",")})`, `rgb(${colour.join(",")})`)
      );
      break;
    case "integer":
      scale = d3.scaleSequential(
        get_table_range(data),
        d3.interpolate(`rgb(${colour_pair.join(",")})`, `rgb(${colour.join(",")})`)
      );
      break;
    case "string":
      uniques = data_check.get_data_uniques(data);
      if (uniques.size <= palette_size) {
        // This is definitely discrete. Should:
        // 1 - Check if there are < 10 levels
        // 2 - If so ask if they're ordered
        // 3 - Make a scale based on the palette
        // palette scale
        // Get ordinal setting
        const ordinalSetting = document.querySelector(
          'input[name="ordinal-state"]:checked'
        ).value;
        if (ordinalSetting == "unordered") {
          scale = d3.scaleOrdinal(
            [...uniques],
            Object.values(palette.light).map(
              (colour) => `rgb(${colour.join(",")})`
            )
          );
          // soft disable the palette
          palette_elements.forEach((cell) => {
            cell.classList.add("palette-cell__disabled");
          });
        } else {
          // ordered scale
          scale = d3.scaleOrdinal(
            [...uniques],
            Array.from({ length: uniques.size }, (_, i) =>
              d3.interpolate(
                `rgb(${colour_pair.join(",")})`,
                `rgb(${colour.join(",")})`
              )((i + 1) / (uniques.size + 1))
            )
          );
        }
      } else {
        // Message the user and tell them that they have too many levels
        const lst = document.createElement("ul");
        const unique_array = [...uniques];
        for (let r in unique_array) {
          const el = document.createElement("li");
          el.textContent = unique_array[r];
          lst.appendChild(el);
        }
        const errorbox = document.createElement("div");
        const text = document.createElement("p");
        text.textContent = `Cannot graph ordinal data with more than ${palette_size} levels. You have ${uniques.size}.`;
        errorbox.appendChild(text);
        errorbox.appendChild(lst);
        msgBox("Too many ordinal levels", errorbox);
        return -1;
      }
  }
  return scale
}

export function match_geojson_to_datalookup(geojson, dataLookup, ecodeid) {
    const usedKeys = new Set();
    const dataFeatures = geojson.features.flatMap((feature) => {
        const matchedData = dataLookup[feature.properties[ecodeid]];
        if (matchedData) {
            usedKeys.add(feature.properties[ecodeid]);
            return { ... feature, data: { ...matchedData } };
        } else {
            return feature
        }
    });

    const unmatchedEcodes = Object.keys(dataLookup).filter(
        (key) => !usedKeys.has(key)
    );
    if (unmatchedEcodes.length > 0) {
        const lst = document.createElement("ul");
        for (let r in unmatchedEcodes) {
            const el = document.createElement("li");
            el.textContent = unmatchedEcodes[r];
            lst.appendChild(el);
        }
        const errorbox = document.createElement("div");
        const text = document.createElement("p");
        text.textContent = "You have entered unrecognised Ecode(s)";
        errorbox.appendChild(text);
        errorbox.appendChild(lst);
        msgBox("Unrecognised Ecode(s", errorbox);
        return -1
    }
    return dataFeatures;
}

export function validate_rows(data) {
    try {
        check_duplicate_rows(data, "ecode");
    } catch (error) {
        if (error instanceof DuplicateRow) {
            const lst = document.createElement("ul");
            for (let r in error.rows) {
                const el = document.createElement("li");
                el.textContent = error.rows[r];
                lst.appendChild(el);
            }
            const errorbox = document.createElement("div");
            const text = document.createElement("p");
            text.textContent = "You have entered duplicate Ecodes";
            errorbox.appendChild(text);
            errorbox.appendChild(lst);
            msgBox("Duplicate Ecode", errorbox);
            return -1;
        }
    }
    return 1
}

export function validate_data_level(dataLookup, la_level){
    var data_level
    try {
        data_level = get_data_level(dataLookup, la_level);
    } catch(error) {
        if (error instanceof EcodeParseError) {
            const tbl = createTable(error.ecodes);
            const errorbox = document.createElement("div");
            const text = document.createElement("p");
            text.textContent = 
                "You have entered Ecodes from both counties and districts";
            errorbox.appendChild(text);
            errorbox.appendChild(tbl);
            msgBox("Ecode Error", errorbox);
            return -1;
        }
    }
    return data_level
}