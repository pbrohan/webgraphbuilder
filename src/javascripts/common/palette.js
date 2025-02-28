import { colours } from "/bundle.js";

export function set_palette(el, build_graph) {
    var graph_colours = colours[el.value]
    // if palette is loaded successfuly, change the header tint to the correct
    // colour
    if (graph_colours) {
        if (graph_colours) {
            document.querySelector(".graph-header").style.setProperty("border-bottom", 
                "10px solid rgb(" + graph_colours.primary + ")" // Javascript is awful
            )
        }
    }
    // Doesn't currently change palette when new one is selected
    const palette = [...document.querySelectorAll(".palette-cell")];
    let set_selected = true;
    palette.forEach(cell => {
        if (set_selected) {
            cell.classList.add("palette-cell__selected");
            set_selected = false;
        }
        cell.addEventListener("click", (event) => {
            select_palette_colour(event.currentTarget);
            build_graph();
        })
    })
}

function select_palette_colour(el) {
    // Remove element from currently selected palettes
    const selected = [...document.querySelectorAll(".palette-cell__selected")];
    selected.forEach(cell => {
        cell.classList.remove("palette-cell__selected");
    });
    el.classList.add("palette-cell__selected");
}

export function get_palette(el){
    const graph_colours = colours[el.value];
    return graph_colours
}