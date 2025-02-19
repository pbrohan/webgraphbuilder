import { data_check } from "/bundle.js"

export function get_data_level(dataLookup, la_level) {
    // Check and see what kind of data we're looking at
    var data_level = data_check.guess_region_type(dataLookup);

    // If the data level is null (there's no identifying data)
    // then use the user-chosen level
    if (data_level === null){
        data_level = la_level;
    // if the data level is different from the one set by the user
    // change the drop-down menu
    } else if (data_level != la_level){
        // This should probably be an event to tell the user something has change
        // but for now
        document.getElementById("geo-level").value = data_level
    }

    return data_level
}