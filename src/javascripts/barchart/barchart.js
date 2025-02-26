import { add_grid, get_grid, get_table_range } from "../common/grid.js";

function get_barchart_page_state(){
    const data = get_grid().getData();
    return [data]
}

function make_barchart_if_data(){
    const state = get_barchart_page_state();
    if (state[0].length > 0) {
        document.getElementById('bar').innerHTML = state[0];
        console.log(state[0]);
    } else {
        document.getElementById('bar').innerHTML = '';
    }
    console.log("beep");
}


export function initBarChartPage(){
    add_grid(document.getElementById('grid'),
    [
        {
            header : 'Titles',
            name : 'titles',
            editor : 'text',
        },
        {
            header : 'Dataset 1',
            name : 'data1',
            editor : 'text'
        },
        {
            header : 'Dataset 2',
            name : 'data2',
            editor : 'text'
        },
        {
            header : 'Dataset 3',
            name : 'data3',
            editor : 'text'
        },
        {
            header : 'Dataset 4',
            name : 'data4',
            editor : 'text'
        },
        {
            header : 'Dataset 5',
            name : 'data5',
            editor : 'text'
        },
    ], make_barchart_if_data);

    const bar_settings = document.getElementById('bar-settings');
    bar_settings.addEventListener("change", (event) => {
        make_barchart_if_data();
    })
}